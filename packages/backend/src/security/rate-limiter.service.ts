import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
}

/**
 * RateLimiterService - Controls the rate of outbound tool requests
 * 
 * SAFETY CONSTRAINTS:
 * - Minimum delay between requests (default: 1000ms)
 * - Maximum requests per tool run (default: 50)
 * - Maximum concurrent tool executions (default: 2)
 * 
 * This is a critical safety component to ensure we don't overwhelm targets.
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  // Per-assessment rate limit state
  private readonly assessmentLimits: Map<string, RateLimitState> = new Map();

  // Configuration
  private readonly minDelayMs: number;
  private readonly maxRequestsPerRun: number;
  private readonly maxConcurrent: number;
  private readonly timeoutMs: number;

  // Concurrent execution tracking
  private activeExecutions: number = 0;

  constructor(private configService: ConfigService) {
    this.minDelayMs = this.configService.get<number>('TOOL_RATE_LIMIT_MS', 1000);
    this.maxRequestsPerRun = this.configService.get<number>('TOOL_MAX_REQUESTS_PER_RUN', 50);
    this.maxConcurrent = this.configService.get<number>('TOOL_MAX_CONCURRENT', 2);
    this.timeoutMs = this.configService.get<number>('TOOL_TIMEOUT_MS', 30000);

    this.logger.log(
      `Rate limiter initialized: ${this.minDelayMs}ms delay, ${this.maxRequestsPerRun} max requests, ${this.maxConcurrent} concurrent`,
    );
  }

  /**
   * Get rate limit configuration
   */
  getConfig() {
    return {
      minDelayMs: this.minDelayMs,
      maxRequestsPerRun: this.maxRequestsPerRun,
      maxConcurrent: this.maxConcurrent,
      timeoutMs: this.timeoutMs,
    };
  }

  /**
   * Wait until we can make another request for this assessment
   * Returns the request number (1-based)
   */
  async waitForSlot(assessmentId: string): Promise<number> {
    let state = this.assessmentLimits.get(assessmentId);
    if (!state) {
      state = { lastRequestTime: 0, requestCount: 0 };
      this.assessmentLimits.set(assessmentId, state);
    }

    // Check if we've exceeded max requests
    if (state.requestCount >= this.maxRequestsPerRun) {
      throw new Error(
        `Maximum request limit (${this.maxRequestsPerRun}) reached for this tool run. ` +
        `This limit exists to prevent overwhelming target systems.`,
      );
    }

    // Calculate delay needed
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequestTime;
    const delayNeeded = Math.max(0, this.minDelayMs - timeSinceLastRequest);

    if (delayNeeded > 0) {
      this.logger.debug(`Rate limiting: waiting ${delayNeeded}ms before next request`);
      await this.sleep(delayNeeded);
    }

    // Update state
    state.requestCount++;
    state.lastRequestTime = Date.now();

    return state.requestCount;
  }

  /**
   * Check if we can start a new tool execution
   */
  canStartExecution(): boolean {
    return this.activeExecutions < this.maxConcurrent;
  }

  /**
   * Wait for a slot to become available for tool execution
   */
  async waitForExecutionSlot(): Promise<void> {
    while (!this.canStartExecution()) {
      this.logger.debug(
        `Concurrent limit reached (${this.activeExecutions}/${this.maxConcurrent}), waiting...`,
      );
      await this.sleep(1000);
    }
    this.activeExecutions++;
    this.logger.debug(`Starting execution (${this.activeExecutions}/${this.maxConcurrent} active)`);
  }

  /**
   * Release an execution slot
   */
  releaseExecutionSlot(): void {
    if (this.activeExecutions > 0) {
      this.activeExecutions--;
      this.logger.debug(`Released execution slot (${this.activeExecutions}/${this.maxConcurrent} active)`);
    }
  }

  /**
   * Reset rate limit state for an assessment (call when starting new tool run)
   */
  resetAssessmentState(assessmentId: string): void {
    this.assessmentLimits.set(assessmentId, {
      lastRequestTime: 0,
      requestCount: 0,
    });
  }

  /**
   * Get current stats for an assessment
   */
  getAssessmentStats(assessmentId: string): {
    requestCount: number;
    remainingRequests: number;
    lastRequestTime: number | null;
  } {
    const state = this.assessmentLimits.get(assessmentId);
    return {
      requestCount: state?.requestCount || 0,
      remainingRequests: this.maxRequestsPerRun - (state?.requestCount || 0),
      lastRequestTime: state?.lastRequestTime || null,
    };
  }

  /**
   * Get overall execution stats
   */
  getExecutionStats(): {
    activeExecutions: number;
    maxConcurrent: number;
    availableSlots: number;
  } {
    return {
      activeExecutions: this.activeExecutions,
      maxConcurrent: this.maxConcurrent,
      availableSlots: this.maxConcurrent - this.activeExecutions,
    };
  }

  /**
   * Create a timeout promise
   */
  createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });
  }

  /**
   * Wrap a promise with timeout
   */
  async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([promise, this.createTimeout()]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
