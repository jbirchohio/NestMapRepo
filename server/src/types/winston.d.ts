import { Logger } from 'winston';

declare module 'winston' {
  interface Logger {
    stream: any;
  }
}

export {};

