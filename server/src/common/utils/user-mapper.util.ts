import type { ServiceUser } from '../../trips/interfaces/trip.service.interface.js';

/**
 * Maps an Express.User to a ServiceUser
 * @param user The Express user object
 * @returns A ServiceUser object with properly typed fields
 */
export function mapToServiceUser(user: Express.User): ServiceUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username || user.email.split('@')[0],
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    organizationId: user.organizationId || null,
    role: user.role,
    passwordHash: '', // Should be handled by auth layer
    passwordChangedAt: null, // Should be set by auth layer
    tokenVersion: 1, // Should be managed by auth layer
    passwordResetToken: null,
    passwordResetExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    isActive: true,
    emailVerified: user.emailVerified || false,
    lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
    createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
  };
}

/**
 * Checks if a user has admin privileges
 * @param role The user's role
 * @returns boolean indicating if the user is an admin
 */
export function isAdminUser(role: string): boolean {
  return ['admin', 'superAdmin', 'super_admin'].includes(role);
}
