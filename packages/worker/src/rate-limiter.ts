/**
 * Rate limiter for tool execution
 * 
 * CRITICAL SAFETY COMPONENT
 * Enforces strict rate limiting to prevent abuse and overwhelming targets
 */

import { Logger } from './logger';

const logger = new Logger('RateLimiter');

interface RateLimiterConfig {
  minDelayMs: number;
  maxRequestsPerRun: number;
  maxConcurrent: number;
  timeoutMs: number;
}

interface RunState {
  lastRequestTime: number;
  requestCount: number;
}

export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly runStates: Map<string, RunState> = new Map();
  private activeExecutions = 0;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    logger.info(
      `Rate limiter initialized: ${config.minDelayMs}ms delay, ` +
      `${config.maxRequestsPerRun} max requests, ` +
      `${config.maxConcurrent} concurrent`
    );
  }

  /**
   * Wait until we can make another request for this run
   */
  async waitForRequestSlot(runId: string): Promise<number> {
    let state = this.runStates.get(runId);
    if (!state) {
      state = { lastRequestTime: 0, requestCount: 0 };
      this.runStates.set(runId, state);
    }

    // Check max requests
    if (state.requestCount >= this.config.maxRequestsPerRun) {
      throw new Error(
        `Maximum request limit (${this.config.maxRequestsPerRun}) reached. ` +
        `This limit exists to prevent overwhelming target systems.`
      );
    }

    // Calculate delay
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequestTime;
    const delayNeeded = Math.max(0, this.config.minDelayMs - timeSinceLastRequest);

    if (delayNeeded > 0) {
      logger.debug(`Rate limiting: waiting ${delayNeeded}ms`);
      await this.sleep(delayNeeded);
    }

    // Update state
    state.requestCount++;
    state.lastRequestTime = Date.now();

    return state.requestCount;
  }

  /**
   * Wait for an execution slot
   */
  async waitForExecutionSlot(): Promise<void> {
    while (this.activeExecutions >= this.config.maxConcurrent) {
      logger.debug(`Concurrent limit reached (${this.activeExecutions}/${this.config.maxConcurrent}), waiting...`);
      await this.sleep(1000);
    }
    this.activeExecutions++;
    logger.debug(`Starting execution (${this.activeExecutions}/${this.config.maxConcurrent} active)`);
  }

  /**
   * Release an execution slot
   */
  releaseExecutionSlot(): void {
    if (this.activeExecutions > 0) {
      this.activeExecutions--;
      logger.debug(`Released execution slot (${this.activeExecutions}/${this.config.maxConcurrent} active)`);
    }
  }

  /**
   * Reset state for a run
   */
  resetRunState(runId: string): void {
    this.runStates.set(runId, { lastRequestTime: 0, requestCount: 0 });
  }

  /**
   * Get stats for a run
   */
  getRunStats(runId: string): { requestCount: number; remaining: number } {
    const state = this.runStates.get(runId);
    return {
      requestCount: state?.requestCount || 0,
      remaining: this.config.maxRequestsPerRun - (state?.requestCount || 0),
    };
  }

  /**
   * Get timeout value
   */
  getTimeoutMs(): number {
    return this.config.timeoutMs;
  }

  /**
   * Create a timeout promise
   */
  createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });
  }

  /**
   * Wrap a promise with timeout
   */
  async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([promise, this.createTimeout()]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
