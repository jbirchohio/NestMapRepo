// Import directly to avoid TypeScript ESM compatibility issues
import winston from 'winston';
import { TransformableInfo } from 'logform';
import { StreamOptions } from 'morgan';

// Use explicit typing to avoid TypeScript errors with ESM modules
type LoggerType = {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  log: (message: string, meta?: any) => void;
};

// Use type assertion to satisfy TypeScript
const winstonLogger = winston as unknown as {
  format: {
    printf: (fn: any) => any;
    timestamp: (opts?: any) => any;
    colorize: (opts?: any) => any;
    align: () => any;
    combine: (...args: any[]) => any;
  };
  createLogger: (opts: any) => any;
  transports: {
    Console: any;
    File: any;
  };
};

// Create a type-safe printf function that handles the log format
const createLogFormat = () => {
  return winstonLogger.format.printf((info: TransformableInfo) => {
    const { timestamp, level, message, ...metadata } = info;
    const metaString = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  });
};

// Create the logger with proper typing that works in ESM
const logger = winstonLogger.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winstonLogger.format.combine(
    winstonLogger.format.colorize({ all: true }),
    winstonLogger.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winstonLogger.format.align(),
    createLogFormat()
  ),
  transports: [
    new winstonLogger.transports.Console(),
    new winstonLogger.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winstonLogger.transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new winstonLogger.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winstonLogger.transports.File({ filename: 'logs/rejections.log' }),
  ],
}) as LoggerType;

// Create a stream for morgan
const stream: StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim(), {});
  },
};

// Export Logger class
export class Logger {
  constructor(private context: string) {}
  
  private formatMessage(message: string, meta?: Record<string, unknown>): string {
    return meta 
      ? `[${this.context}] ${message} ${JSON.stringify(meta)}`
      : `[${this.context}] ${message}`;
  }
  
  info(message: string, meta?: Record<string, unknown>): void {
    logger.info(this.formatMessage(message, meta));
  }
  
  error(message: string, error?: unknown): void {
    if (error) {
      logger.error(this.formatMessage(message, { error }));
    } else {
      logger.error(this.formatMessage(message));
    }
  }
  
  warn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(this.formatMessage(message, meta));
  }
  
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>): void {
    const logMessage = this.formatMessage(message, meta);
    logger.log(level, logMessage);
  }
  
  debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(this.formatMessage(message, meta));
  }
}

export { logger, stream };
export default logger;
