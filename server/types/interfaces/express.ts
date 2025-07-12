import { Request as ExpressRequest } from 'express';
import { AuthUser } from '../../shared/src/schema.js'/src/types/auth-user.js';

// This file should be used to import the express augmentation
// The actual global augmentation is in server/@types/express/index.d.ts
// to avoid conflicts with multiple declarations

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