/**
 * Calo Security Assessment Platform - Worker Service
 * 
 * This worker processes security tool execution jobs from the BullMQ queue.
 * It implements strict safety constraints to prevent abuse:
 * 
 * SAFETY CONSTRAINTS:
 * - Rate limited: 1 request per second minimum
 * - Max requests per run: 50
 * - Max concurrent executions: 2
 * - Timeout per tool: 30 seconds
 * - Target validation before each request
 * - No aggressive scanning, brute forcing, or fuzzing
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient, ToolRunStatus, ToolName } from '@prisma/client';
import IORedis from 'ioredis';
import { ToolExecutor } from './tools/executor';
import { StorageClient } from './storage';
import { RateLimiter } from './rate-limiter';
import { Logger } from './logger';

const logger = new Logger('Worker');

// Initialize clients
const prisma = new PrismaClient();
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const storage = new StorageClient();
const rateLimiter = new RateLimiter({
  minDelayMs: parseInt(process.env.TOOL_RATE_LIMIT_MS || '1000'),
  maxRequestsPerRun: parseInt(process.env.TOOL_MAX_REQUESTS_PER_RUN || '50'),
  maxConcurrent: parseInt(process.env.TOOL_MAX_CONCURRENT || '2'),
  timeoutMs: parseInt(process.env.TOOL_TIMEOUT_MS || '30000'),
});

const toolExecutor = new ToolExecutor(prisma, storage, rateLimiter);

interface ToolJobData {
  toolRunId: string;
  assessmentId: string;
  toolName: ToolName;
  target: string;
  parameters?: Record<string, any>;
}

// Create the worker
const worker = new Worker<ToolJobData>(
  'tool-execution',
  async (job: Job<ToolJobData>) => {
    const { toolRunId, assessmentId, toolName, target, parameters } = job.data;
    logger.info(`Processing job ${job.id}: ${toolName} on ${target}`);

    const startTime = Date.now();

    try {
      // Wait for execution slot
      await rateLimiter.waitForExecutionSlot();

      // Update status to running
      await prisma.toolRun.update({
        where: { id: toolRunId },
        data: {
          status: ToolRunStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // Execute the tool
      const result = await toolExecutor.execute({
        toolRunId,
        assessmentId,
        toolName,
        target,
        parameters,
      });

      const durationMs = Date.now() - startTime;

      // Update with results
      await prisma.toolRun.update({
        where: { id: toolRunId },
        data: {
          status: ToolRunStatus.COMPLETED,
          finishedAt: new Date(),
          durationMs,
          stdoutRef: result.stdoutRef,
          stderrRef: result.stderrRef,
          resultSummary: result.summary,
          exitCode: result.exitCode,
          requestCount: result.requestCount,
        },
      });

      logger.info(`Completed job ${job.id} in ${durationMs}ms`);

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      logger.error(`Job ${job.id} failed: ${error.message}`);

      // Determine if it was a timeout
      const isTimeout = error.message?.includes('timeout');

      // Update with error
      await prisma.toolRun.update({
        where: { id: toolRunId },
        data: {
          status: isTimeout ? ToolRunStatus.TIMEOUT : ToolRunStatus.FAILED,
          finishedAt: new Date(),
          durationMs,
          errorMessage: error.message,
          exitCode: -1,
        },
      });

      throw error;
    } finally {
      rateLimiter.releaseExecutionSlot();
    }
  },
  {
    connection: redis,
    concurrency: parseInt(process.env.TOOL_MAX_CONCURRENT || '2'),
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
);

// Event handlers
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  logger.error(`Worker error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info('Worker started and waiting for jobs...');
