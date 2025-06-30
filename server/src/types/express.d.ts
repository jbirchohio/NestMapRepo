import type { AuthUser as SharedAuthUser, UserRole as SharedUserRole } from '@shared/schema/types/auth/index.js';

// This file extends the Express Request type to include our custom properties

declare global {
  namespace Express {
    // Use the shared AuthUser type for the Express User interface
    interface User extends Omit<SharedAuthUser, 'role'> {
      // Map the role to be compatible with Express's User type
      role: SharedUserRole | string;
      // Add any additional properties that might be needed
      organizationId?: string | null;
      sessionId?: string;
      isInOrganization?: (orgId: string) => boolean;
    }

    // Extend the Request interface with our custom properties
    interface Request {
      // Custom properties for request tracking
      requestId: string;
      startTime: [number, number];
      
      // Standard Express request properties that we use
      method: string;
      originalUrl: string;
      baseUrl: string;
      cookies: {
        [key: string]: string | undefined;
      };
      signedCookies: {
        [key: string]: string | undefined;
      };
      query: Record<string, any>;
      route: any;
      secure: boolean;
      xhr: boolean;
      protocol: 'http' | 'https';
      
      // User authentication
      user?: User;
      isAuthenticated(): this is { user: User };
      isUnauthenticated(): boolean;
      
      // Custom properties
      authInfo?: any;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      organizationId: string;
      organizationFilter: (orgId: string | null) => boolean;
      
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
      
      // Request properties
      path: string;
      ip?: string;
      hostname?: string;
      params: Record<string, string>;
      body: any;
      headers: Record<string, string | string[] | undefined>;
      
      // Organization context for database middleware
      organizationContext?: {
        organizationId: string;
        isWhiteLabelDomain: boolean;
        domainOrganizationId?: string;
      };
      
      // Database security properties
      secureQuery?: any; // Replace 'any' with the actual type of SecureQueryBuilder if available
      secureDbOps?: {
        getTripsByOrg: (db: any, trips: any, additionalWhere?: any) => any;
        // Add other secure database operation types as needed
      };
      
      // Add any other custom properties used in your application
      [key: string]: any;
    }
  }
}

// Export a type that can be used in our middleware
export type AuthenticatedRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = import('./auth-user.js').AuthenticatedRequest<
  Params,
  ResBody,
  ReqBody,
  ReqQuery
>;

// Export all types for easy importing
export * from './auth-user.js';
