import { Logger } from 'winston.js';

declare module 'winston' {
  interface Logger {
    stream: any;
  }
}

export {};
