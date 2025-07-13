import winston from 'winston';
import { TransformableInfo } from 'logform';
import { StreamOptions } from 'morgan';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Create a type-safe printf function that handles the log format
const createLogFormat = () => {
  return printf((info: TransformableInfo) => {
    const { timestamp, level, message, ...metadata } = info;
    const metaString = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  });
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    createLogFormat()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create a stream for morgan
const stream: StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Export Logger class
export class Logger {
  constructor(private context: string) {}
  
  info(message: string, meta?: any): void {
    logger.info(`[${this.context}] ${message}`, meta);
  }
  
  error(message: string, error?: any): void {
    logger.error(`[${this.context}] ${message}`, error);
  }
  
  warn(message: string, meta?: any): void {
    logger.warn(`[${this.context}] ${message}`, meta);
  }
  
  log(message: string, meta?: any): void {
    logger.info(`[${this.context}] ${message}`, meta);
  }
}

export { logger, stream };
export default logger;
