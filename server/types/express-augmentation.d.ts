// Express type augmentation for request/response objects
import { AuthUser } from '../src/types/auth-user.js';

// Define JWTUser type for authentication
interface JWTUser {
  id: string;
  userId?: string;
  email: string;
  role: string;
  organizationId?: string | null;
}

// Augment the Express namespace globally
declare global {
  namespace Express {
    interface Request {
      user?: JWTUser | AuthUser;
      organizationId?: string;
      organizationFilter?: (orgId: string | null) => boolean;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
      organizationContext?: {
        organizationId: string;
        isWhiteLabelDomain: boolean;
        domainOrganizationId?: string;
      };
      requestId?: string;
      startTime?: [number, number];
      token?: string;
      responseMetrics?: {
        startTime: [number, number];
        endTime?: [number, number];
        processingTime?: number;
        dbQueries?: number;
        cacheHits?: number;
        cacheMisses?: number;
      };
      unifiedMetrics?: {
        queries: number;
        cacheHits: number;
        cacheMisses: number;
        errors: number;
        startTime: [number, number];
      };
      trackQuery?: (query: string, duration: number) => void;
    }
  }
}

export {};