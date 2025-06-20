// Define UserRole enum locally to avoid circular dependencies
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

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
  [key: string]: any;
}

// Export a type that can be used for request.user
export type RequestUser = Omit<AuthUser, 'organization_id'> & {
  organization_id?: string; // Keep for backward compatibility
};

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  organizationId: string;
  organizationFilter: (orgId: string | null) => boolean;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
}
