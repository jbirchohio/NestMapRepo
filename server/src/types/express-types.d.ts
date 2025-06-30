/**
 * Server-specific Express type extensions
 * Extends the base Express types with our custom types and shared types
 */

import type { Request as ExpressRequest } from 'express';
import type { JwtPayload, UserRole, Permission } from '@shared/schema/types';

declare global {
  namespace Express {
    // Extend the base Express User interface with our shared JwtPayload
    interface User extends JwtPayload {
      // Add any server-specific user properties here
      sessionId?: string;
      displayName?: string;
      analyticsScope?: AnalyticsScope;
      
      // Add type-safe authentication methods
      hasRole(role: UserRole | UserRole[]): boolean;
      hasPermission(permission: Permission | Permission[]): boolean;
      isInOrganization(organizationId: string): boolean;
    }

    // Response metrics interface
    interface ResponseMetrics {
      startTime?: bigint;
      endTime?: bigint;
      statusCode?: number;
      duration?: number;
      queryCount?: number;
      cacheStatus?: 'hit' | 'miss' | 'skip';
    }

    // Analytics scope for request context
    interface AnalyticsScope {
      organizationId: string;
      startDate?: Date;
      endDate?: Date;
    }

    // Extend the base Express Request interface with our custom properties
    interface Request {
      // Standard Express properties that we use
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
      body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
      route: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
      
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
      analyticsScope?: AnalyticsScope;
      responseMetrics?: ResponseMetrics;
      
      // Request tracking
      requestId: string;
      startTime: [number, number];
      
      // Authentication helpers
      hasRole(role: UserRole | UserRole[]): boolean;
      hasPermission(permission: Permission | Permission[]): boolean;
    }

    // Extend Response with our custom methods
    interface Response {
      // Standard Express response methods
      status(code: number): this;
      json(body?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): this;
      send(body?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): this;
      
      // Custom response methods
      success(data?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, message?: string): this;
      error(message: string, code?: number, details?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): this;
      validationError(errors: Record<string, string[]>): this;
      unauthorized(message?: string): this;
      forbidden(message?: string): this;
      notFound(message?: string): this;
      conflict(message?: string): this;
      tooManyRequests(message?: string): this;
    }
  }

  // Helper types for route handlers
  type AuthenticatedRequest = ExpressRequest & {
    user: Express.User;
  };

  type AuthenticatedRequestHandler = (
    req: AuthenticatedRequest,
    res: Express.Response,
    next: Express.NextFunction
  ) => void | Promise<void>;
}

// Export types for use in the application
export {};
