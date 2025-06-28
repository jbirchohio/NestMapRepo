import type { Logger } from 'winston';

declare module 'winston' {
  interface Logger {
    stream: (options?: unknown) => NodeJS.ReadableStream;
  }
}

export {};
