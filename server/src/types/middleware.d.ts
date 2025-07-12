import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { AuthUser } from './auth-user.js';

// Database metrics type
export interface DatabaseMetrics {
  queryCount: number;
  totalQueryTime: number;
  slowQueries: Array<{
    name: string;
    duration: number;
    timestamp: string;
  }>;
  recordQuery: (queryName: string, duration: number) => void;
  getMetrics: () => {
    queryCount: number;
    averageQueryTime: number;
    slowQueries: Array<{
      name: string;
      duration: number;
      timestamp: string;
    }>;
  };
}

// Secure database operations type
export interface SecureDbOperations {
  getTripsByOrg: (db: any, trips: any, additionalWhere?: any) => any;
  getActivitiesByOrg: (db: any, activities: any, additionalWhere?: any) => any;
  getUsersByOrg: (db: any, users: any, additionalWhere?: any) => any;
  validateAccess: (resourceOrgId: string | null) => boolean;
}

// Define our custom request properties
export interface CustomRequest extends ExpressRequest {
  // Standard Express request properties
  method: string;
  path: string;
  ip?: string;
  hostname?: string;
  params: Record<string, string>;
  body: any;
  query: Record<string, any>;
  headers: Record<string, string | string[]>;
  get(name: string): string | undefined;
  
  // Our custom properties
  // User authentication
  user?: AuthUser;
  isAuthenticated?(): this is this & { user: AuthUser };
  isUnauthenticated?(): boolean;
  
  // Organization context
  organizationId: string;
  organizationFilter: (orgId: string | null) => boolean;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  
  // Analytics
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
  
  // Organization context for database middleware
  organizationContext?: {
    organizationId: string;
    isWhiteLabelDomain: boolean;
    domainOrganizationId?: string;
    canAccessOrganization: (orgId: string | null) => boolean;
    requireSameOrganization: (orgId: string | null) => boolean;
  };
  
  // Database specific properties
  dbMetrics?: DatabaseMetrics;
  secureQuery?: any; // Type this properly if you have the SecureQueryBuilder type
  secureDbOps?: SecureDbOperations;
  
  // Standard Express properties we use
  path: string;
  ip?: string;
  hostname?: string;
  params: Record<string, string>;
  body: any;
  query: any;
  headers: Record<string, string | string[] | undefined>;
  organization_id?: string; // Add missing property
  organizationContext?: any; // Add missing property
}

// Extend Express types
declare global {
  namespace Express {
    interface Request extends CustomRequest {}
  }
}

// Export a type that can be used in our middleware
export type AuthenticatedRequest = CustomRequest & Required<Pick<CustomRequest, 'user' | 'organizationId' | 'organizationFilter'>>;

export type MiddlewareFunction = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;
