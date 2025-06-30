import prisma from '../prisma';
import { User } from '@prisma/client';

export class UserDAL {
    /**
     * Find a user by email
     */
    public async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    /**
     * Find active users in an organization
     */
    public async findActiveByOrganization(organizationId: string): Promise<User[]> {
        return prisma.user.findMany({
            where: {
                organizationMemberships: {
                    some: {
                        organizationId: organizationId,
                        status: 'active', // Assuming 'active' status for active users
                    },
                },
            },
            orderBy: {
                lastName: 'asc',
            },
        });
    }

    /**
     * Update user's last login timestamp
     */
    public async updateLastLogin(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Soft delete a user
     */
    public async softDelete(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: 'deleted', // Assuming a 'deleted' status in Prisma User model
                updatedAt: new Date(),
            },
        });
    }
}

// Export a singleton instance
export const userDAL = new UserDAL();