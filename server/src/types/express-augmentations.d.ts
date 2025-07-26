import { Request as ExpressRequest } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    ip?: string;
    socket?: {
      remoteAddress?: string;
    };
    cookies?: {
      [key: string]: string;
    };
    headers: {
      [key: string]: string | string[] | undefined;
      'user-agent'?: string;
      'authorization'?: string;
    };
    // Add any other custom properties your application uses
  }
}

// This makes TypeScript recognize the augmented Request type
export interface Request extends ExpressRequest {}

