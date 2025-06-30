import { PrismaClient, RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshTokenRepository } from '../../auth/interfaces/refresh-token.repository.interface.js';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    revoked?: boolean;
    revokedAt?: Date | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ id: string; token: string; userId: string; expiresAt: Date; revoked: boolean }> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revoked: data.revoked || false,
        revokedAt: data.revokedAt || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    return {
      id: refreshToken.id,
      token: refreshToken.token,
      userId: refreshToken.userId,
      expiresAt: refreshToken.expiresAt,
      revoked: refreshToken.revoked,
    };
  }

  async findByToken(token: string): Promise<{
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    revoked: boolean;
  } | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return null;
    }

    return {
      id: refreshToken.id,
      token: refreshToken.token,
      userId: refreshToken.userId,
      expiresAt: refreshToken.expiresAt,
      revoked: refreshToken.revoked,
    };
  }

  async revokeByToken(token: string): Promise<boolean> {
    try {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { 
          revoked: true,
          revokedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { 
        userId,
        revoked: false,
      },
      data: { 
        revoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
