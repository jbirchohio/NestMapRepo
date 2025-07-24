// Simple logging utility for the client

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(module: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${module}: ${message}`;
  }

  debug(module: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.formatMessage(module, message), data);
  }

  info(module: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatMessage(module, message), data);
  }

  warn(module: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage(module, message), data);
  }

  error(module: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.formatMessage(module, message), data);
  }

  createModuleLogger(module: string) {
    return {
      debug: (message: string, data?: any) => this.debug(module, message, data),
      info: (message: string, data?: any) => this.info(module, message, data),
      warn: (message: string, data?: any) => this.warn(module, message, data),
      error: (message: string, data?: any) => this.error(module, message, data),
    };
  }
}

export const logger = new Logger();
export const mapLogger = logger.createModuleLogger('Map');
