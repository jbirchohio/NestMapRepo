import winston from 'winston';
import { TransformableInfo } from 'logform';
import { StreamOptions } from 'morgan';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Create a type-safe printf function that handles the log format
const createLogFormat = () => {
  return printf((info: TransformableInfo) => {
    const { timestamp, level, message, ...metadata } = info;
    const metaString = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '.js';
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

export { logger, stream };
export default logger;
