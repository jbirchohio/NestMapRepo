/**
 * Logger interface for consistent logging across the application
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Simple console logger implementation
 */
export const consoleLogger: Logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(message, meta || '');
  },
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(message, meta || '');
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(message, meta || '');
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(message, meta || '');
  },
};
