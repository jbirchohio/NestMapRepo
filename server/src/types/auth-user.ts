// Import UserRole from shared to maintain consistency
import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import type { UserRole } from '../../../shared/src/types/user/index.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  organizationId?: string | null;
  [key: string]: unknown; // Allow additional properties
}

// Type guard to check if a user has a specific role
export function hasRole(user: AuthUser | undefined, role: UserRole | UserRole[]): boolean {
  if (!user) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

// Type guard to check if a user has a specific permission
export function hasPermission(user: AuthUser | undefined, permission: string | string[]): boolean {
  if (!user?.permissions) return false;
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.some(p => user.permissions?.includes(p));
}

// Helper type for middleware that requires authentication
export type AuthenticatedRequestHandler = (
  req: ExpressRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void> | Response;

// Utility type to make all properties of T required except those in K
type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

// Re-export types for backward compatibility
export type { Request as AuthenticatedRequest } from 'express';
