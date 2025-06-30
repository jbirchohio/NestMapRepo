import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from 'express';
import type { AuthUser } from './auth-user.js';
import type { UserRole } from '@shared/schema/types/user/index.js';

// Re-export AuthUser for convenience
export type { AuthUser };

// Define our custom properties that we'll add to the request
export interface SecureRequest extends Omit<ExpressRequest, 'organizationId'> {
  user?: AuthUser;
  organizationId?: string;
  apiVersion?: string;
  apiKeyAuth?: {
    organizationId: string;
    permissions: string[];
    rateLimit: number;
  };
  [key: string]: unknown; // Allow additional properties
}

// Type guard to check if a value is a SecureRequest
export function isSecureRequest(value: unknown): value is SecureRequest {
  return (
    typeof value === 'object' && 
    value !== null && 
    'user' in value
  );
}

// Type guard for role checking
export function hasRole(user: AuthUser | undefined, role: UserRole | UserRole[]): boolean {
  if (!user) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

// Type guard for permission checking
export function hasPermission(user: AuthUser | undefined, permission: string | string[]): boolean {
  if (!user?.permissions) return false;
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.some(p => user.permissions?.includes(p));
}

// Middleware type that works with SecureRequest
export type SecureRequestHandler = (
  req: SecureRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void> | Response;

// Helper function to wrap SecureRequestHandler into Express RequestHandler
export function secureMiddleware(handler: SecureRequestHandler): RequestHandler {
  return (req: ExpressRequest, res: Response, next: NextFunction) => {
    // The request is already properly typed as SecureRequest when passed to the handler
    return handler(req as unknown as SecureRequest, res, next);
  };
}

// Helper function to create a secure request from a regular request
export function createSecureRequest(req: ExpressRequest): SecureRequest {
  return req as unknown as SecureRequest;
}
