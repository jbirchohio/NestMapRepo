import { User } from '@shared/../db/schema';
import { BaseRepository } from '@shared/common/repositories/base.repository.interface';

/**
 * User repository interface that extends the base repository interface
 * Adds user-specific operations to the common CRUD operations
 */
export interface UserRepository extends BaseRepository<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> {
  // User retrieval
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  
  // Authentication related
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;
  updateLastLogin(userId: string, ipAddress: string): Promise<void>;
  isAccountLocked(user: User): boolean;
  
  // User management
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>, password: string): Promise<User>;
  updateUser(userId: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Email verification
  verifyEmail(userId: string): Promise<boolean>;
  
  // Password management
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  setPassword(userId: string, newPassword: string): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  
  // Preferences
  updatePreferences(userId: string, preferences: Record<string, any>): Promise<boolean>;
  
  // Password reset
  findByResetToken(token: string): Promise<User | null>;
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
}
