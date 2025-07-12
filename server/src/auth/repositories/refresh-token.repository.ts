import { eq, sql } from 'drizzle-orm.js';
import { db } from '../../../db/db.js.js';
import { users } from '../../../db/schema.js.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js.js';
import { logger } from '../../../utils/logger.js.js';
import type { RefreshToken } from '../interfaces/refresh-token.repository.interface.js.js';

export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  private readonly logger = logger;
  private tokens: Map<string, RefreshToken> = new Map();

  async create(tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    const refreshToken: RefreshToken = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      createdAt: new Date(),
      ...tokenData
    };

    this.tokens.set(refreshToken.token, refreshToken);
    return refreshToken;
  }

  async findByToken(token: string): Promise<RefreshToken | undefined> {
    const refreshToken = this.tokens.get(token);
    return refreshToken || undefined;
  }

  async revokeByUserId(userId: string): Promise<void> {
    const now = new Date();
    for (const [tokenKey, refreshToken] of this.tokens.entries()) {
      if (refreshToken.userId === userId && !refreshToken.revoked) {
        refreshToken.revoked = true;
        refreshToken.revokedAt = now;
      }
    }
    this.logger.info(`Revoked refresh tokens for user: ${userId}`);
  }

  async revokeByToken(token: string): Promise<void> {
    const refreshToken = this.tokens.get(token);
    if (refreshToken && !refreshToken.revoked) {
      refreshToken.revoked = true;
      refreshToken.revokedAt = new Date();
      this.logger.info(`Revoked refresh token: ${token}`);
    }
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [tokenKey, refreshToken] of this.tokens.entries()) {
      if (refreshToken.expiresAt < now) {
        this.tokens.delete(tokenKey);
        deletedCount++;
      }
    }
    
    this.logger.info(`Deleted ${deletedCount} expired refresh tokens`);
    return deletedCount;
  }
}