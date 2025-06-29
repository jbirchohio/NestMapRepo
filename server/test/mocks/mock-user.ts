import type { AuthUser, UserRole } from '../../../shared/src/types/auth/index.js';

// Create a complete mock user that satisfies both AuthUser and Express.User
export const mockUser: AuthUser & {
  // Required by Express.User
  id: string;
  email: string;
  // Custom methods and properties
  hasRole(role: UserRole | UserRole[]): boolean;
  hasPermission(permission: string | string[]): boolean;
  organizationId: string;
  organization_id: string;
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // Add any other required Express.User properties
  name?: string;
} = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin' as UserRole,
  displayName: 'Test User',
  isActive: true,
  emailVerified: true,
  organizationId: 'test-org-id',
  organization_id: 'test-org-id', // Ensure this is always a string, never null or undefined
  permissions: ['read:all', 'write:all'],
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tenantId: 'test-tenant',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // Add Express.User methods
  hasRole(role: UserRole | UserRole[]) {
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(this.role);
  },
  hasPermission(permission: string | string[]) {
    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
    return permissionsToCheck.some(p => this.permissions?.includes(p));
  }
};
