import { PrismaClient } from '@prisma/client';
import type { RefreshToken, RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { logger } from '../../utils/logger.js';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
    private readonly logger = logger;
    
    constructor(private readonly prisma: PrismaClient) {}

    async create(tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
        try {
            const token = await this.prisma.refreshToken.create({
                data: {
                    userId: tokenData.userId,
                    token: tokenData.token,
                    expiresAt: tokenData.expiresAt,
                    revoked: false,
                    revokedAt: null,
                    ipAddress: tokenData.ipAddress || null,
                    userAgent: tokenData.userAgent || null,
                },
            });

            return {
                ...token,
                // Ensure we return Date objects as expected by the interface
                createdAt: new Date(token.createdAt),
                expiresAt: new Date(token.expiresAt),
                revokedAt: token.revokedAt ? new Date(token.revokedAt) : null,
            };
        } catch (error) {
            this.logger.error(`Failed to create refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create refresh token');
        }
    }

    async findByToken(token: string): Promise<RefreshToken | undefined> {
        if (!token) {
            this.logger.warn('findByToken called with empty token');
            return undefined;
        }

        try {
            const result = await this.prisma.refreshToken.findFirst({
                where: { token, revoked: false },
            });

            if (!result) return undefined;

            return {
                ...result,
                // Ensure we return Date objects as expected by the interface
                createdAt: new Date(result.createdAt),
                expiresAt: new Date(result.expiresAt),
                revokedAt: result.revokedAt ? new Date(result.revokedAt) : null,
            };
        } catch (error) {
            this.logger.error(`Failed to find token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find refresh token');
        }
    }

    async revokeByUserId(userId: string): Promise<void> {
        if (!userId) {
            this.logger.warn('revokeByUserId called with empty userId');
            return;
        }

        try {
            await this.prisma.refreshToken.updateMany({
                where: { userId, revoked: false },
                data: { 
                    revoked: true,
                    revokedAt: new Date()
                },
            });
        } catch (error) {
            this.logger.error(`Failed to revoke tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to revoke refresh tokens');
        }
    }

    async revokeByToken(token: string): Promise<void> {
        if (!token) {
            this.logger.warn('revokeByToken called with empty token');
            return;
        }

        try {
            await this.prisma.refreshToken.updateMany({
                where: { token, revoked: false },
                data: { 
                    revoked: true,
                    revokedAt: new Date()
                },
            });
        } catch (error) {
            this.logger.error(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to revoke refresh token');
        }
    }

    async deleteExpired(): Promise<number> {
        try {
            const result = await this.prisma.refreshToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                },
            });
            
            return result.count;
        } catch (error) {
            this.logger.error(`Failed to delete expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to delete expired tokens');
        }
    }
}
