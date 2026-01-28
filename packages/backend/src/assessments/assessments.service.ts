import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentStatus } from '@prisma/client';
import { CreateAssessmentDto, UpdateAssessmentDto } from './dto/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAssessmentDto, userId: string) {
    // Verify organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        organizationId: dto.organizationId,
        createdById: userId,
        name:
          dto.name ||
          dto.title ||
          `Assessment - ${new Date().toISOString().split('T')[0]}`,
        status: AssessmentStatus.DRAFT,
        scopeJson: dto.scopeJson,
        assumptionsText: dto.assumptionsText,
        constraintsText: dto.constraintsText,
      },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Auto-add the primary domain as an approved asset
    await this.prisma.asset.create({
      data: {
        assessmentId: assessment.id,
        type: 'DOMAIN',
        value: org.domain,
        displayName: org.domain,
        confidence: 'CONFIRMED',
        approved: true,
        discoveredBy: 'manual',
      },
    });

    // Add to approved domains
    await this.prisma.approvedDomain.create({
      data: {
        assessmentId: assessment.id,
        domain: org.domain,
        addedBy: userId,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'assessment',
        entityId: assessment.id,
      },
    });

    return assessment;
  }

  async findAll(options?: {
    organizationId?: string;
    status?: AssessmentStatus;
    limit?: number;
    offset?: number;
  }) {
    const { organizationId, status, limit = 50, offset = 0 } = options || {};

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: { id: true, name: true, domain: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              assets: true,
              observations: true,
              risks: true,
              toolRuns: true,
            },
          },
        },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return { assessments, total };
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assets: {
          orderBy: [{ approved: 'desc' }, { createdAt: 'desc' }],
        },
        observations: {
          orderBy: { createdAt: 'desc' },
        },
        risks: {
          orderBy: { rank: 'asc' },
        },
        actionItems: {
          orderBy: { phase: 'asc' },
        },
        auditControls: true,
        _count: {
          select: {
            assets: true,
            observations: true,
            evidences: true,
            risks: true,
            actionItems: true,
            auditControls: true,
            toolRuns: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  async update(id: string, dto: UpdateAssessmentDto, userId: string) {
    await this.findOne(id);

    const { title, name, ...rest } = dto as UpdateAssessmentDto & {
      title?: string;
      name?: string;
    };

    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        ...rest,
        ...(name || title ? { name: name || title } : {}),
        ...(dto.status === AssessmentStatus.IN_PROGRESS && !dto.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(dto.status === AssessmentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
      include: {
        organization: true,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'assessment',
        entityId: id,
        details: dto as object,
      },
    });

    return assessment;
  }

  async delete(id: string, userId: string) {
    await this.findOne(id);

    // Log before deleting
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'assessment',
        entityId: id,
      },
    });

    return this.prisma.assessment.delete({ where: { id } });
  }

  async getApprovedDomains(assessmentId: string): Promise<string[]> {
    const domains = await this.prisma.approvedDomain.findMany({
      where: {
        assessmentId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return domains.map((d) => d.domain);
  }

  async addApprovedDomain(assessmentId: string, domain: string, userId: string) {
    await this.findOne(assessmentId);

    return this.prisma.approvedDomain.upsert({
      where: {
        assessmentId_domain: {
          assessmentId,
          domain: domain.toLowerCase(),
        },
      },
      create: {
        assessmentId,
        domain: domain.toLowerCase(),
        addedBy: userId,
      },
      update: {},
    });
  }

  async removeApprovedDomain(assessmentId: string, domain: string) {
    return this.prisma.approvedDomain.delete({
      where: {
        assessmentId_domain: {
          assessmentId,
          domain: domain.toLowerCase(),
        },
      },
    });
  }

  async getStats(assessmentId: string) {
    const assessment = await this.findOne(assessmentId);

    const [
      assetsByType,
      observationsBySeverity,
      toolRunsByStatus,
    ] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['type'],
        where: { assessmentId },
        _count: true,
      }),
      this.prisma.observation.groupBy({
        by: ['severity'],
        where: { assessmentId },
        _count: true,
      }),
      this.prisma.toolRun.groupBy({
        by: ['status'],
        where: { assessmentId },
        _count: true,
      }),
    ]);

    return {
      assessmentId,
      status: assessment.status,
      counts: assessment._count,
      assetsByType,
      observationsBySeverity,
      toolRunsByStatus,
    };
  }
}
