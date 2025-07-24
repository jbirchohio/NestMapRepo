// Centralized logging utility

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: LogLevel, module: string, message: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    return `[${timestamp}] ${levelName} ${module}: ${message}`;
  }

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, module, message);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data);
        break;
    }

    // In production, you might want to send logs to a service
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      this.sendToLoggingService({ 
        timestamp: new Date(), 
        level, 
        module, 
        message, 
        data 
      });
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    // Placeholder for external logging service integration
    // Could send to services like Sentry, LogRocket, etc.
  }

  debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, module, message, data);
  }

  // Create module-specific logger
  createModuleLogger(module: string) {
    return {
      debug: (message: string, data?: any) => this.debug(module, message, data),
      info: (message: string, data?: any) => this.info(module, message, data),
      warn: (message: string, data?: any) => this.warn(module, message, data),
      error: (message: string, data?: any) => this.error(module, message, data),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Common module loggers
export const mapLogger = logger.createModuleLogger('Map');
export const optimizerLogger = logger.createModuleLogger('Optimizer');
export const apiLogger = logger.createModuleLogger('API');
export const authLogger = logger.createModuleLogger('Auth');
