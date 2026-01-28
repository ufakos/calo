import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { HostValidatorService } from '../security/host-validator.service';
import { SsrfGuardService } from '../security/ssrf-guard.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { ToolName, ToolRunStatus } from '@prisma/client';

export interface ToolRunRequest {
  assessmentId: string;
  toolName: ToolName;
  target: string;
  assetId?: string;
  parameters?: Record<string, any>;
  dryRun?: boolean;
}

@Injectable()
export class ToolRunsService {
  private readonly logger = new Logger(ToolRunsService.name);

  constructor(
    private prisma: PrismaService,
    private hostValidator: HostValidatorService,
    private ssrfGuard: SsrfGuardService,
    private rateLimiter: RateLimiterService,
    @InjectQueue('tool-execution') private toolQueue: Queue,
  ) {}

  /**
   * Enqueue a tool for execution
   * CRITICAL: This validates all inputs and enforces safety constraints
   */
  async enqueue(request: ToolRunRequest, userId: string) {
    const { assessmentId, toolName, target, assetId, parameters, dryRun } = request;

    // 1. Validate assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { organization: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // 2. Get approved domains
    const approvedDomains = await this.prisma.approvedDomain.findMany({
      where: { assessmentId },
    });
    if (approvedDomains.length === 0) {
      throw new BadRequestException(
        'No approved domains configured. Please approve at least one domain before running tools.',
      );
    }

    // 3. Validate target is within scope (CRITICAL SECURITY CHECK)
    const domainList = approvedDomains.map((d) => d.domain);
    await this.ssrfGuard.validateToolTarget(target, domainList);

    // 4. Check concurrent execution limits
    if (!this.rateLimiter.canStartExecution()) {
      const stats = this.rateLimiter.getExecutionStats();
      throw new BadRequestException(
        `Maximum concurrent tool executions (${stats.maxConcurrent}) reached. Please wait.`,
      );
    }

    // 5. Validate tool name is allowed
    const allowedTools: ToolName[] = [
      'TLS_CHECK',
      'HEADER_CHECK',
      'SECURITY_HEADERS',
      'CORS_CHECK',
      'DNS_LOOKUP',
      'CERT_TRANSPARENCY',
      'TECH_FINGERPRINT',
    ];
    if (!allowedTools.includes(toolName)) {
      throw new BadRequestException(`Tool "${toolName}" is not available`);
    }

    // 6. If dry run, return preview without executing
    if (dryRun) {
      return {
        dryRun: true,
        wouldExecute: {
          toolName,
          target,
          parameters,
          rateLimits: this.rateLimiter.getConfig(),
          approvedDomains: domainList,
        },
        warnings: [],
      };
    }

    // 7. Create the tool run record
    const toolRun = await this.prisma.toolRun.create({
      data: {
        assessmentId,
        assetId,
        toolName,
        target,
        status: ToolRunStatus.QUEUED,
        parametersJson: parameters,
      },
    });

    // 8. Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'TOOL_RUN',
        entityType: 'tool_run',
        entityId: toolRun.id,
        details: { toolName, target },
      },
    });

    // 9. Add to queue
    await this.toolQueue.add(
      'execute',
      {
        toolRunId: toolRun.id,
        assessmentId,
        toolName,
        target,
        parameters,
      },
      {
        attempts: 1, // No retries for security tools
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Queued tool run ${toolRun.id}: ${toolName} on ${target}`);

    return {
      id: toolRun.id,
      status: toolRun.status,
      toolName,
      target,
      queuedAt: toolRun.createdAt,
    };
  }

  async findByAssessment(assessmentId: string, options?: {
    toolName?: ToolName;
    status?: ToolRunStatus;
    limit?: number;
  }) {
    const { toolName, status, limit = 100 } = options || {};
    const where: any = { assessmentId };
    if (toolName) where.toolName = toolName;
    if (status) where.status = status;

    return this.prisma.toolRun.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: { id: true, type: true, value: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const toolRun = await this.prisma.toolRun.findUnique({
      where: { id },
      include: {
        asset: true,
        assessment: {
          select: { id: true, name: true, organizationId: true },
        },
      },
    });
    if (!toolRun) throw new NotFoundException('Tool run not found');
    return toolRun;
  }

  async cancel(id: string) {
    const toolRun = await this.findOne(id);
    
    if (toolRun.status === ToolRunStatus.COMPLETED || toolRun.status === ToolRunStatus.FAILED) {
      throw new BadRequestException('Cannot cancel a completed tool run');
    }

    return this.prisma.toolRun.update({
      where: { id },
      data: {
        status: ToolRunStatus.CANCELLED,
        finishedAt: new Date(),
      },
    });
  }

  async updateStatus(id: string, data: {
    status: ToolRunStatus;
    startedAt?: Date;
    finishedAt?: Date;
    durationMs?: number;
    stdoutRef?: string;
    stderrRef?: string;
    resultSummary?: string;
    exitCode?: number;
    errorMessage?: string;
    requestCount?: number;
  }) {
    return this.prisma.toolRun.update({ where: { id }, data });
  }

  async getStats(assessmentId: string) {
    const [byTool, byStatus, recentRuns] = await Promise.all([
      this.prisma.toolRun.groupBy({
        by: ['toolName'],
        where: { assessmentId },
        _count: true,
      }),
      this.prisma.toolRun.groupBy({
        by: ['status'],
        where: { assessmentId },
        _count: true,
      }),
      this.prisma.toolRun.findMany({
        where: { assessmentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          toolName: true,
          target: true,
          status: true,
          createdAt: true,
          finishedAt: true,
        },
      }),
    ]);

    return {
      byTool,
      byStatus,
      recentRuns,
      rateLimits: this.rateLimiter.getConfig(),
      executionStats: this.rateLimiter.getExecutionStats(),
    };
  }
}
