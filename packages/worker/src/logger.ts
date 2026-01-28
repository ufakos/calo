/**
 * Simple logger for the worker
 */
export class Logger {
  constructor(private context: string) {}

  private format(level: string, message: string): string {
    return `[${new Date().toISOString()}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string) {
    console.log(this.format('INFO', message));
  }

  warn(message: string) {
    console.warn(this.format('WARN', message));
  }

  error(message: string) {
    console.error(this.format('ERROR', message));
  }

  debug(message: string) {
    if (process.env.DEBUG === 'true') {
      console.log(this.format('DEBUG', message));
    }
  }
}
