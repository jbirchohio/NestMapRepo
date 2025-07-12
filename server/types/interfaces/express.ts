import { Request as ExpressRequest } from 'express';
import { AuthUser } from '../../src/types/auth-user.js';

// Unified Express Request interface that consolidates all extensions
declare global {
  namespace Express {
    interface Request {
      // User authentication properties
      user?: AuthUser;
      auth?: any;
      
      // Organization context properties
      organizationId?: string | number;
      organizationFilter?: (orgId: string | null) => boolean;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      
      // Request tracking properties
      requestId?: string;
      startTime?: [number, number];
      token?: string;
      
      // Analytics and scoping
      analyticsScope?: {
        organizationId: string | number;
        startDate?: Date;
        endDate?: Date;
      };
      
      // Authentication methods
      isAuthenticated?: () => boolean;
      hasRole?: (role: string | string[]) => boolean;
      hasPermission?: (permission: string | string[]) => boolean;
      
      // File upload properties
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[]; };
      
      // Standard Express properties (ensure they exist)
      cookies: {
        [key: string]: string | undefined;
      };
      params: {
        [key: string]: string;
      };
      body: any;
      query: {
        [key: string]: string | string[] | undefined;
      };
    }
  }
}

// Export typed request interfaces for specific use cases
export interface AuthenticatedRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends ExpressRequest<Params, ResBody, ReqBody, ReqQuery> {
  user: AuthUser;
  organizationId: string | number;
  organizationFilter: (orgId: string | null) => boolean;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  analyticsScope?: {
    organizationId: string | number;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface OptionalAuthRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends ExpressRequest<Params, ResBody, ReqBody, ReqQuery> {
  user?: AuthUser;
  organizationId?: string | number;
  organizationFilter?: (orgId: string | null) => boolean;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
}