import { AuthUser } from '../types/auth-user.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: any;
      organizationId?: string;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      organization?: {
        id: string;
        name: string;
        settings: any;
      };
      token?: string;
      requestId?: string;
      startTime?: [number, number];
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
      organizationFilter?: (orgId: string | null) => boolean;
      isAuthenticated?(): boolean;
      hasRole?(role: string | string[]): boolean;
      hasPermission?(permission: string | string[]): boolean;
    }
    
    interface Response {
      success?<T = any>(data?: T, message?: string, statusCode?: number): void;
      error?(message: string, statusCode?: number, errorCode?: string): void;
      paginate?<T = any>(data: T[], total: number, page: number, limit: number): void;
    }
  }
}

export {};