import { eq, sql, and, isNull, gte } from 'drizzle-orm';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { UserRepository } from '../interfaces/user.repository.interface';
import { User } from '../../../db/schema';
import { hash, compare } from 'bcryptjs';
import { BadRequestError } from '../../common/errors';

export class UserRepositoryImpl implements UserRepository {
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gte(users.resetTokenExpires, new Date())
        )
      )
      .limit(1);

    return user || null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpires: expiresAt
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpires: null
      })
      .where(eq(users.id, userId));
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    await db.execute(
      sql`UPDATE ${users} 
          SET 
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
              WHEN failed_login_attempts + 1 >= ${MAX_LOGIN_ATTEMPTS} 
              THEN NOW() + INTERVAL '${LOCKOUT_MINUTES} minutes' 
              ELSE locked_until 
            END
          WHERE id = ${userId}`
    );
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      })
      .where(eq(users.id, userId));
  }

  isAccountLocked(user: User): boolean {
    return !!(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    await db
      .update(users)
      .set({
        lockedUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>, 
    password: string
  ): Promise<User> {
    const hashedPassword = await hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        passwordHash: hashedPassword,
        emailVerified: false,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return user;
  }

  async updateUser(
    userId: string, 
    userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    return !!user;
  }

  async verifyEmail(userId: string): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ emailVerified: users.emailVerified });
    
    return user?.emailVerified ?? false;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    const isMatch = await compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return false;
    }

    return this.setPassword(userId, newPassword);
  }

  async setPassword(userId: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await hash(newPassword, 10);
    await db
      .update(users)
      .set({ 
        passwordHash: hashedPassword,
        // Clear any password reset tokens when password is changed
        resetToken: null,
        resetTokenExpires: null
      })
      .where(eq(users.id, userId));
    return true;
  }
}
