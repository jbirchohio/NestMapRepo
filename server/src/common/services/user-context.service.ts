import type { Request } from 'express';
import { logger } from '../../utils/logger.js';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../repositories/prisma/user.prisma.repository';
import { PrismaUser, UserRole } from '../types/prisma-models';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize user repository
const userRepository = new PrismaUserRepository(prisma);

export class UserContextService {
  private readonly logger = logger.child({ module: 'UserContextService' });

  constructor() {}

  /**
   * Sets up the user context for the current request
   * @param req Express request object
   * @returns Promise that resolves when the user context is set up
   */
  async setUserContext(req: Request): Promise<void> {
    try {
      // If there's no user in the request, clear any existing context
      if (!req.user?.id) {
        this.clearUserContext(req);
        return;
      }

      // Get the user from the repository
      const user = await userRepository.findById(req.user.id);
      
      if (!user) {
        this.logger.warn({ userId: req.user.id }, 'User not found in repository');
        this.clearUserContext(req);
        return;
      }

      // Update the request with the user details
      req.user = {
        ...req.user,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role,
        organizationId: user.organizationId || null,
      };

      this.logger.debug(
        { userId: user.id, email: user.email, role: user.role },
        'User context set up successfully'
      );
    } catch (error) {
      this.logger.error(
        { error, userId: req.user?.id },
        'Error setting up user context'
      );
      this.clearUserContext(req);
    }
  }

  /**
   * Clears the user context from the request
   * @param req Express request object
   */
  private clearUserContext(req: Request): void {
    // Use type assertion to handle the case where user might be undefined
    (req as any).user = undefined;
    req.organizationId = undefined;
  }

  /**
   * Get the current user from the request
   */
  getCurrentUser(req: Request): PrismaUser | null {
    return (req as any).user || null;
  }

  /**
   * Check if the current user has the required role
   */
  hasRole(req: Request, requiredRole: UserRole | UserRole[]): boolean {
    const user = this.getCurrentUser(req);
    if (!user) return false;
    
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return requiredRoles.includes(user.role as UserRole);
  }

  /**
   * Check if the current user is an admin or super admin
   */
  isAdmin(req: Request): boolean {
    return this.hasRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  /**
   * Check if the current user is a super admin
   */
  isSuperAdmin(req: Request): boolean {
    return this.hasRole(req, UserRole.SUPER_ADMIN);
  }

  /**
   * Ensure the user has the required role (throws an error if not)
   * @throws {Error} If the user doesn't have the required role
   */
  ensureRole(req: Request, requiredRole: UserRole | UserRole[]): void {
    if (!this.hasRole(req, requiredRole)) {
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Ensure the user is an admin (throws an error if not)
   * @throws {Error} If the user is not an admin
   */
  ensureAdmin(req: Request): void {
    this.ensureRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  /**
   * Ensure the user is a super admin (throws an error if not)
   * @throws {Error} If the user is not a super admin
   */
  ensureSuperAdmin(req: Request): void {
    this.ensureRole(req, UserRole.SUPER_ADMIN);
  }

  /**
   * Gets the current user's ID from the request
   * @param req Express request object
   * @returns The user ID or undefined if not authenticated
   */
  getUserId(req: Request): string | undefined {
    return req.user?.id;
  }

  /**
   * Gets the current user's organization ID from the request
   * @param req Express request object
   * @returns The organization ID or undefined if not available
   */
  getOrganizationId(req: Request): string | undefined {
    return req.user?.organizationId || undefined;
  }

  /**
   * Checks if the current user has the required role
   * @param req Express request object
   * @param role The required role
   * @returns True if the user has the required role, false otherwise
   */
  hasRole(req: Request, role: UserRole): boolean {
    return req.user?.role === role;
  }

  /**
   * Checks if the current user has any of the required roles
   * @param req Express request object
   * @param roles Array of roles to check against
   * @returns True if the user has any of the required roles, false otherwise
   */
  hasAnyRole(req: Request, roles: UserRole[]): boolean {
    return roles.some(role => this.hasRole(req, role));
  }

  /**
   * Checks if the current user has the required permission
   * @param req Express request object
   * @param permission The required permission
   * @returns True if the user has the required permission, false otherwise
   */
  hasPermission(req: Request, permission: string): boolean {
    // Implement permission checking logic here
    // This is a simplified example - you'll need to implement your actual permission checking logic
    const userRole = req.user?.role as UserRole | undefined;
    
    if (!userRole) {
      return false;
    }

    // Example: Check if the user's role has the required permission
    // You'll need to implement your actual permission checking logic here
    return this.checkRolePermission(userRole, permission);
  }

  /**
   * Checks if a role has a specific permission
   * @param role The user's role
   * @param permission The required permission
   * @returns True if the role has the permission, false otherwise
   * @private
   */
  private checkRolePermission(role: UserRole, permission: string): boolean {
    // Implement your actual permission checking logic here
    // This is a simplified example
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.ADMIN]: ['read:users', 'write:users', 'read:organizations'],
      [UserRole.MEMBER]: ['read:profile', 'update:profile'],
      [UserRole.GUEST]: ['read:public'],
    };

    const permissions = rolePermissions[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }
}
