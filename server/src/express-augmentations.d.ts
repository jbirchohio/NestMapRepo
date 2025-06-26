import type { AuthUser } from '@shared/types/auth/user.js';

declare global {
  namespace Express {
    // Extend the User interface to match our AuthUser type
    interface User extends AuthUser {}

    // Response metrics interface
    interface ResponseMetrics {
      startTime?: bigint;  // Using bigint for high-precision timing
      endTime?: bigint;    // Using bigint for high-precision timing
      statusCode?: number;
      duration?: number;
      queryCount?: number;
      cacheStatus?: 'hit' | 'miss' | 'skip';
    }

    // Extend the Request interface with our custom properties
    interface Request {
      // The user property is now properly typed from the User interface above
      user?: User;
      // Standard Express properties
      method: string;
      originalUrl: string;
      baseUrl: string;
      path: string;
      url: string;
      ip: string;
      
      // Cookies and headers
      cookies: Record<string, string | undefined>;
      signedCookies: Record<string, string | undefined>;
      headers: Record<string, string | string[] | undefined>;
      
      // Request data
      params: Record<string, string>;
      query: Record<string, any>;
      body: any;
      route: any;
      
      // Connection info
      secure: boolean;
      xhr: boolean;
      protocol: 'http' | 'https';
      
      // Authentication
      user?: User;
      token?: string;
      isAuthenticated(): this is { user: User };
      isUnauthenticated(): boolean;
      
      // Organization context
      organizationId?: string | null;
      organizationFilter?: (orgId: string | null) => boolean;
      domainOrganizationId?: string | null;
      isWhiteLabelDomain?: boolean;
      
      // Analytics and metrics
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
      responseMetrics?: ResponseMetrics;
      
      // Request tracking
      requestId: string;
      startTime: [number, number];
      
      // Additional types used in the application
      authInfo?: any;
      [key: string]: any;
    }
  }
}

// This file doesn't need to export anything since it's just type declarations
export {};