import winston from 'winston.js';
import path from 'path.js';
import fs from 'fs.js';

// Morgan uses a writable stream for logging HTTP requests. Define a simple
// type for that stream rather than augmenting the existing Winston types,
// which already declare a `stream` property with a different signature.
export interface MorganStream {
  write: (message: string) => void;
}

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
} as const;

type LogLevel = keyof typeof logLevels;

const colors: Record<LogLevel, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create a console transport for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const consoleTransport = new winston.transports.Console({
  format: consoleFormat
});

// Create the logger instance with proper type assertion
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'nestmap-api' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport);
}

// Create a stream for morgan
const morganStream: MorganStream = {
  write: (message: string) => {
    const logMessage = message.trim();
    if (!logMessage) return;
    
    // Log based on HTTP status code
    if (logMessage.includes(' 500 ') || logMessage.match(/ 5\d\d /)) {
      logger.error(logMessage);
    } else if (logMessage.match(/ 4\d\d /)) {
      logger.warn(logMessage);
    } else if (logMessage.match(/ 3\d\d /)) {
      logger.info(logMessage);
    } else {
      logger.info(logMessage);
    }
  },
};

export { logger, morganStream as stream };

export default logger;
