// Import UserRole from shared to maintain consistency
import { UserRole } from '@shared/types/auth/permissions.js';
import type { Request } from 'express';
import type { AuthenticatedRequest as SharedAuthenticatedRequest } from '@shared/types/auth/custom-request.js';

export { UserRole };

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string | null;
    sessionId?: string;
    permissions: string[];
    displayName?: string;
    // For backward compatibility with older code
    organization_id?: string;
    // Add index signature to allow dynamic property access
    [key: string]: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
}

// Export a type that can be used for request.user
export type RequestUser = Omit<AuthUser, 'organization_id'> & {
    organization_id?: string; // Keep for backward compatibility
};

// Re-export the AuthenticatedRequest from shared types
export type { AuthenticatedRequest } from '@shared/types/auth/custom-request.js';

// Define extended properties if needed
export interface ExtendedRequestFields {
    organizationFilter: (orgId: string | null) => boolean;
    domainOrganizationId?: string;
    isWhiteLabelDomain?: boolean;
    analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
    };
}

// Create a type that extends the shared AuthenticatedRequest with our additional fields
export type ExtendedAuthenticatedRequest<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> = 
    SharedAuthenticatedRequest & Request<Params, ResBody, ReqBody, ReqQuery> & ExtendedRequestFields;
