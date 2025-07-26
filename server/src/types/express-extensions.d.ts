import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from '../rbac';

declare global {
  namespace Express {
    // Extend the base Request interface
    interface Request extends ExpressRequest {
      // Request tracking
      requestId: string;
      startTime: [number, number];
      
      // Standard Express properties that we want to ensure are available
      originalUrl: string;
      
      // User authentication (from your auth system)
      user?: AuthenticatedUser;
      
      // Add other custom request properties here
    }
  }
}

export {}; // This ensures the file is treated as a module

