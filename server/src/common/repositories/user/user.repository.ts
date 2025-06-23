import type { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../db.ts';
import { users, organizationMembers, type User } from '../../../../db/schema.js';
import type { UserRepository } from './user.repository.interface.ts';
import type { UserBookingPreferences } from '../../interfaces/booking.interfaces.ts';
import type { BaseRepositoryImpl } from '../base.repository.ts';
import { UserResponse } from '@shared/types/auth/dto';
@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> implements UserRepository {
    constructor() {
        super('User', users, users.id);
    }
    async findByEmail(email: string): Promise<UserResponse | null> {
        this.logger.log(`Finding user by email: ${email}`);
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return user ? this.mapToUserResponse(user) : null;
    }

    async findByEmailAndTenant(email: string, tenantId: string): Promise<UserResponse | null> {
        this.logger.log(`Finding user by email (${email}) and tenant (${tenantId})`);
        const [user] = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.email, email),
                    eq(users.tenantId, tenantId)
                )
            )
            .limit(1);
        return user ? this.mapToUserResponse(user) : null;
    }
    async findByOrganizationId(organizationId: string): Promise<User[]> {
        this.logger.log(`Finding users for organization: ${organizationId}`);
        const members = await db
            .select({
            user: users
        })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(eq(organizationMembers.organizationId, organizationId));
        return members.map(m => m.user);
    }
    async updatePassword(id: string, passwordHash: string): Promise<boolean> {
        this.logger.log(`Updating password for user: ${id}`);
        const result = await db
            .update(users)
            .set({
                passwordHash,
                updatedAt: new Date()
            })
            .where(eq(users.id, id));
        return result.rowCount > 0;
    }

    async verifyPassword(userId: string, password: string): Promise<boolean> {
        this.logger.log(`Verifying password for user: ${userId}`);
        const user = await this.findById(userId);
        if (!user) return false;
        
        // In a real app, use bcrypt or similar for password verification
        // This is a simplified example
        return user.password === password;
    }
    
    private mapToUserResponse(user: User): UserResponse {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            role: user.role as any, // This should match your UserRole enum
            tenantId: user.tenantId || null,
            emailVerified: user.emailVerified || false,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt || null
        };
    }
    async updateLastLogin(id: string): Promise<boolean> {
        this.logger.log(`Updating last login for user: ${id}`);
        const result = await db
            .update(users)
            .set({
            lastLoginAt: new Date(),
            updatedAt: new Date()
        })
            .where(eq(users.id, id));
        return result.rowCount > 0;
    }
    async updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null> {
        this.logger.log(`Updating preferences for user: ${id}`);
        const [updatedUser] = await db
            .update(users)
            .set({
            preferences,
            updatedAt: new Date()
        })
            .where(eq(users.id, id))
            .returning();
        return updatedUser || null;
    }
}
