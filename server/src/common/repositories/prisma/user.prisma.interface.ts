import type { User as PrismaUser, UserRole } from '@prisma/client';
import type { BaseRepository } from '../base.repository.interface.js';

export type UserCreateInput = Omit<PrismaUser, 
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 
  'emailVerified' | 'isActive' | 'failedLoginAttempts' | 
  'lockedUntil' | 'refreshTokens' | 'role' | 'organization'
> & {
  role?: UserRole;
  organizationId?: string;
  password: string;
};

export type UserUpdateInput = Partial<Omit<UserCreateInput, 'email' | 'organizationId'>> & {
  role?: UserRole;
  password?: string;
};

/**
 * User repository interface that extends the base repository interface
 * Adds user-specific operations to the common CRUD operations
 */
export interface UserRepository extends BaseRepository<PrismaUser, string, UserCreateInput, UserUpdateInput> {
  // User retrieval
  findByEmail(email: string): Promise<PrismaUser | null>;
  findById(id: string): Promise<PrismaUser | null>;
  
  // Authentication related
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;
  updateLastLogin(userId: string, ipAddress: string): Promise<void>;
  isAccountLocked(user: PrismaUser): boolean;
  
  // User management
  createUser(userData: UserCreateInput): Promise<PrismaUser>;
  updateUser(userId: string, userData: UserUpdateInput): Promise<PrismaUser | null>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Email verification
  verifyEmail(userId: string): Promise<boolean>;
  
  // Password management
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  setPassword(userId: string, newPassword: string): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  
  // Preferences
  updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<boolean>;
  
  // Password reset
  findByResetToken(token: string): Promise<PrismaUser | null>;
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
}

// Re-export the Prisma User type for convenience
export type { PrismaUser as User };
