import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../../../shared/types/auth';
import { User } from '../../../shared/types/auth';

declare global {
  namespace Express {
    // Extend the Request interface with our custom properties
    interface Request {
      /**
       * Authenticated user information
       */
      user?: User;
      
      /**
       * JWT payload if using JWT authentication
       */
      auth?: JwtPayload;
      
      /**
       * Organization ID from the request (can be in params, query, or body)
       */
      organizationId?: string | number;
      
      /**
       * Request ID for tracing
       */
      requestId?: string;
      
      /**
       * Request start time for performance measurement
       */
      startTime?: [number, number];
      
      /**
       * Raw token string if using token-based auth
       */
      token?: string;
      
      /**
       * Check if the request is authenticated
       */
      isAuthenticated?: () => boolean;
      
      /**
       * Check if the authenticated user has a specific role
       * @param role The role to check for
       */
      hasRole?: (role: string | string[]) => boolean;
      
      /**
       * Check if the authenticated user has any of the specified permissions
       * @param permissions The permissions to check for
       */
      hasPermission?: (permissions: string | string[]) => boolean;
    }
    
    // Extend the Response interface with our custom methods
    interface Response {
      /**
       * Send a success response with data
       */
      success: <T = any>(
        data: T,
        message?: string,
        statusCode?: number
      ) => Response;
      
      /**
       * Send an error response
       */
      error: (
        message: string,
        statusCode?: number,
        errorCode?: string,
        details?: any
      ) => Response;
      
      /**
       * Send a paginated response
       */
      paginate: <T = any>(
        data: T[],
        total: number,
        page: number,
        limit: number,
        message?: string
      ) => Response;
    }
  }
}

// Extend the global Express namespace with our custom types
declare module 'express-serve-static-core' {
  interface Request {
    // Make sure these match the ones in the global namespace
    user?: User;
    auth?: JwtPayload;
    organizationId?: string | number;
    requestId?: string;
    startTime?: [number, number];
    token?: string;
    isAuthenticated?: () => boolean;
    hasRole?: (role: string | string[]) => boolean;
    hasPermission?: (permissions: string | string[]) => boolean;
  }
  
  interface Response {
    success: <T = any>(
      data: T,
      message?: string,
      statusCode?: number
    ) => Response;
    
    error: (
      message: string,
      statusCode?: number,
      errorCode?: string,
      details?: any
    ) => Response;
    
    paginate: <T = any>(
      data: T[],
      total: number,
      page: number,
      limit: number,
      message?: string
    ) => Response;
  }
  
  interface Application {
    // Add any custom application-level methods here
  }
}

export {};
