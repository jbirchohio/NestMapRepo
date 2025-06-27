import type { AuthUser } from '../src/types/auth-user.js';

declare global {
  namespace Express {
    // User role types
    type UserRole = 'admin' | 'user' | 'editor';

    // Base user interface
    interface User extends AuthUser {
      id: string;
      email: string;
      organizationId: string | null;
      role?: UserRole;
      permissions?: string[];
    }

    // Extend the Request interface
    interface Request {
      user?: User | null;
      organizationId: string | null;
      organization?: {
        id: string;
        name: string;
        settings: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
      };
      organizationFilter?: (orgId: string | null) => boolean;
      isWhiteLabelDomain?: boolean;
      domainOrganizationId?: string | null;
      token?: string;
      requestId?: string;
      startTime?: [number, number];
      isAuthenticated(): this is { user: User };
      hasRole(role: UserRole | UserRole[]): boolean;
      hasPermission(permission: string | string[]): boolean;
    }
    
    // Extend the Response interface
    interface Response<ResBody = any> {
      json: (body: ResBody) => this;
      status: (code: number) => this;
      success: (data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, message?: string) => this;
      error: (message: string, code?: number, details?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => this;
      send: (body: ResBody) => this;
    }
  }

  // Custom request type for route handlers
  interface CustomRequest extends Express.Request {
    user: Express.User;
    organizationId: string | null;
    organizationFilter?: (orgId: string | null) => boolean;
    isWhiteLabelDomain?: boolean;
    domainOrganizationId?: string | null;
  }
}

export type AuthenticatedRequest = Express.CustomRequest;

export {};