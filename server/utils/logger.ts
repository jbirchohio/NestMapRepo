/**
 * Production-ready logging utility
 * Replaces console.log statements with proper logging levels
 */

import { sentryService } from '../services/sentryService';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: any;
  timestamp?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, meta?: any): LogEntry {
    return {
      level,
      message,
      meta,
      timestamp: new Date().toISOString()
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }

    // In production, only log warnings and errors
    return level === 'error' || level === 'warn';
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logMessage = entry.meta 
      ? `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message} ${JSON.stringify(entry.meta)}`
      : `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.log(logMessage);
        break;
    }
  }

  error(message: string, meta?: any): void {
    this.output(this.formatMessage('error', message, meta));
    
    // Also send errors to Sentry if initialized
    if (meta instanceof Error) {
      sentryService.captureException(meta, { extra: { logMessage: message } });
    } else if (typeof meta === 'object' && meta?.error instanceof Error) {
      sentryService.captureException(meta.error, { extra: { logMessage: message, ...meta } });
    } else {
      sentryService.captureMessage(message, 'error', meta);
    }
  }

  warn(message: string, meta?: any): void {
    this.output(this.formatMessage('warn', message, meta));
  }

  info(message: string, meta?: any): void {
    this.output(this.formatMessage('info', message, meta));
  }

  debug(message: string, meta?: any): void {
    this.output(this.formatMessage('debug', message, meta));
  }
}

export const logger = new Logger();