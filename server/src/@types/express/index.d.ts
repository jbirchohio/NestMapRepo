import 'express';
import type { User } from '../../shared/src/schema.js';

declare global {
  namespace Express {
    // Extend the Express Request type with our custom properties
    interface Request {
      user?: User;
      cookies: {
        [key: string]: string | undefined;
      };
      params: {
        [key: string]: string;
      };
      body: any;
    }
  }
}

// This export is needed for TypeScript to treat this as a module
export {};
