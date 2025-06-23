import { Request as ExpressRequest } from '../../express-augmentations';

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
      user?: {
        id: string;
        email: string;
        organizationId: string;
        role: string;
        // Add other user properties as needed
      };
      
      // Add other custom request properties here
    }
  }
}

export {}; // This ensures the file is treated as a module
