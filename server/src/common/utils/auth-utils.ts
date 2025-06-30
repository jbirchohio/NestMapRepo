import { UserRole } from '@shared/schema/types/auth/user.js';

/**
 * Check if a user has any of the specified roles
 * @param user The user to check
 * @param roles A single role or array of roles to check against
 * @returns boolean indicating if the user has any of the specified roles
 */
export function hasRole(
  user: { role: UserRole } | undefined, 
  roles: UserRole | UserRole[]
): boolean {
  if (!user) return false;
  
  const userRoles = Array.isArray(roles) ? roles : [roles];
  return userRoles.includes(user.role);
}

/**
 * Check if a user is an admin or manager
 * @param user The user to check
 * @returns boolean indicating if the user is an admin or manager
 */
export function isAdminOrManager(user: { role: UserRole } | undefined): boolean {
  return hasRole(user, [UserRole.ADMIN, UserRole.MANAGER]);
}

/**
 * Check if a user is an admin
 * @param user The user to check
 * @returns boolean indicating if the user is an admin
 */
export function isAdmin(user: { role: UserRole } | undefined): boolean {
  return hasRole(user, UserRole.ADMIN);
}

/**
 * Check if a user is a manager
 * @param user The user to check
 * @returns boolean indicating if the user is a manager
 */
export function isManager(user: { role: UserRole } | undefined): boolean {
  return hasRole(user, UserRole.MANAGER);
}

/**
 * Check if a user is a regular member
 * @param user The user to check
 * @returns boolean indicating if the user is a regular member
 */
export function isMember(user: { role: UserRole } | undefined): boolean {
  return hasRole(user, UserRole.MEMBER);
}
