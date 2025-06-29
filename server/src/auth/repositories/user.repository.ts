import { users, type User } from '../../../db/schema/index.js';
import logger from '../../../utils/logger.js';
import type { UserRepository as AuthUserRepository } from '../interfaces/user.repository.interface.js';
import type { UserRepository as CommonUserRepository } from '../../common/repositories/user/user.repository.interface.js';
import type { BaseRepository } from '../../common/repositories/base.repository.interface.js';

/**
 * Auth-specific user repository that wraps the main user repository
 * and adds auth-specific functionality
 */
export class UserRepositoryImpl implements AuthUserRepository, BaseRepository<User, string, any, any> {
  private readonly logger = logger;

  constructor(
    private readonly userRepository: CommonUserRepository & BaseRepository<User, string, any, any>
  ) {}

  // ========== BaseRepository Implementation ==========
  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    return this.userRepository.findById(id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async create(data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): Promise<User> {
    return this.userRepository.create(data);
  }

  async update(id: string, data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): Promise<User | null> {
    return this.userRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async count(filter?: Partial<User>): Promise<number> {
    return this.userRepository.count(filter);
  }

  async exists(id: string): Promise<boolean> {
    return this.userRepository.exists(id);
  }

  async withTransaction<R>(
    fn: (tx: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => Promise<R>
  ): Promise<R> {
    return this.userRepository.withTransaction(fn);
  }

  mapToModel(data: any): User {
    return this.userRepository.mapToModel(data);
  }

  // ========== AuthUserRepository Implementation ==========
  async findByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    return (await this.userRepository.findByEmail(email)) || undefined;
  }

  // Authentication related
  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    this.logger.log(`Incrementing failed login attempts for user ${userId}`);
    // Implementation would go here
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    this.logger.log(`Resetting failed login attempts for user ${userId}`);
    // Implementation would go here
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    this.logger.log(`Locking account for user ${userId} until ${lockedUntil}`);
    // Implementation would go here
  }

  async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    this.logger.log({ 
      message: `Updating last login for user ${userId}`, 
      context: { ipAddress } 
    });
    // Implementation would go here
  }

  isAccountLocked(user: User): boolean {
    // Implementation would go here
    return false;
  }

  // User management
  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>,
    password: string
  ): Promise<User> {
    return this.userRepository.create({
      ...userData,
      password // Note: Password should be hashed before this point or in the userRepository
    });
  }

  async updateUser(
    userId: string,
    userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User | undefined> {
    const result = await this.userRepository.update(userId, userData);
    return result || undefined;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.userRepository.delete(userId);
  }

  // Email verification
  async verifyEmail(userId: string): Promise<boolean> {
    this.logger.log(`Verifying email for user ${userId}`);
    // Implementation would go here
    return true;
  }

  // Password management
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    this.logger.log(`Changing password for user ${userId}`);
    // Implementation would go here
    return true;
  }

  async setPassword(userId: string, newPassword: string): Promise<boolean> {
    this.logger.log(`Setting new password for user ${userId}`);
    // Implementation would go here
    return true;
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    this.logger.log(`Updating password for user ${userId}`);
    // Implementation would go here
    return true;
  }

  // Preferences
  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<boolean> {
    this.logger.log({ 
      message: `Updating preferences for user ${userId}`,
      context: { preferences } 
    });
    // Implementation would go here
    return true;
  }

  // Password reset
  async findByResetToken(token: string): Promise<User | null> {
    this.logger.log('Finding user by reset token');
    // Implementation would go here
    return null;
  }

  // Organization-specific
  async findByOrganizationId(organizationId: string): Promise<User[]> {
    return this.userRepository.findByOrganizationId(organizationId);
  }
}
