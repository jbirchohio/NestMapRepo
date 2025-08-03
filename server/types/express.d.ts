import { JWTUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
      organizationId?: number;
      organization_id?: number;
      apiVersion?: string;
      apiKeyAuth?: {
        organizationId: number;
        permissions: string[];
        rateLimit: number;
      };
      authSession?: {
        userId: number;
        organizationId?: number;
        sessionId: string;
        mfaVerified?: boolean;
        role?: string;
      };
      authIdentifier?: string;
      secureQuery?: any;
      secureDbOps?: any;
      dbMetrics?: {
        queryCount: number;
        totalDuration: number;
        slowQueries: number;
        recordQuery?: (queryName: string, duration: number) => void;
        getMetrics?: () => any;
      };
      analyticsScope?: any;
      file?: any;
      isAuthenticated?: () => boolean;
      organizationContext?: {
        id: number;
        canAccessOrganization: (orgId: number | null) => boolean;
        requireSameOrganization?: (orgId: number | null) => boolean;
        enforceOrganizationAccess?: (orgId: number | null) => void;
      };
      userOrgRole?: string;
      skipCaseConversion?: boolean;
    }
  }
}

export {};