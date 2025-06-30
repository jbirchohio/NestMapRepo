import type { 
  Request as ExpressRequest, 
  Response as ExpressResponse, 
  NextFunction, 
  Router, 
  Application
} from 'express';

// Define our custom user type
interface IAuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  organizationId?: string | null;
  // Add other user properties as needed
}

// Export the AuthUser type for use throughout the application
export type AuthUser = IAuthUser;

// Extend Express namespace to include our custom types
declare global {
  namespace Express {
    // Extend the User interface if it exists, or declare it if it doesn't
    interface User extends IAuthUser {}
    
    // Extend the Request interface to include our custom properties
    interface Request {
      // User property will be of type User (which extends IAuthUser)
      user?: User;
      // Organization context for multi-tenancy
      organizationId?: string | null;
    }

    // Extend the Response interface if needed
    interface Response {
      // Add any custom response methods here
    }
  }
}

// Re-export types with proper type-only exports
export type { ExpressRequest as Request };
export type { ExpressResponse as Response };
export type { NextFunction, Router, Application };
