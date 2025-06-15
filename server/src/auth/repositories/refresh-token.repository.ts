import { and, eq, lte } from 'drizzle-orm';
import { db } from '../../../db';
import { RefreshToken, refreshTokens } from '../../../db/schema';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { InternalServerError, NotFoundError } from '../../common/errors';
import { BaseRepositoryImpl } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';

/**
 * Implementation of the refresh token repository
 * Extends the base repository implementation to include common CRUD operations
 * and implements refresh token specific operations
 */
@Injectable()
export class RefreshTokenRepositoryImpl extends BaseRepositoryImpl<RefreshToken, string, Omit<RefreshToken, 'id' | 'createdAt'>, Partial<Omit<RefreshToken, 'id' | 'createdAt'>>> implements RefreshTokenRepository {
  constructor() {
    super('RefreshToken', refreshTokens, refreshTokens.id);
  }
  async create(token: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    try {
      const [newToken] = await db
        .insert(refreshTokens)
        .values({
          ...token,
          createdAt: new Date(),
        })
        .returning();

      if (!newToken) {
        throw new InternalServerError('Failed to create refresh token');
      }

      return newToken;
    } catch (error) {
      if (error instanceof Error) {
        throw new InternalServerError(`Failed to create refresh token: ${error.message}`);
      }
      throw new InternalServerError('Failed to create refresh token: Unknown error');
    }
  }

  async findById(id: string): Promise<RefreshToken | undefined> {
    try {
      const [token] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.id, id));

      return token;
    } catch (error) {
      throw new InternalServerError('Failed to find refresh token by ID');
    }
  }

  async findByToken(token: string): Promise<RefreshToken | undefined> {
    try {
      const [refreshToken] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token));

      return refreshToken;
    } catch (error) {
      throw new InternalServerError('Failed to find refresh token by token');
    }
  }

  async revokeToken(id: string): Promise<void> {
    try {
      const result = await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, id));

      if (result.rowCount === 0) {
        throw new NotFoundError('Refresh token not found');
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Failed to revoke refresh token');
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.userId, userId));
    } catch (error) {
      throw new InternalServerError('Failed to revoke all refresh tokens for user');
    }
  }

  async deleteExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(refreshTokens)
        .where(
          and(
            lte(refreshTokens.expiresAt, now),
            eq(refreshTokens.revoked, false)
          )
        );

      return result.rowCount || 0;
    } catch (error) {
      throw new InternalServerError('Failed to delete expired refresh tokens');
    }
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ 
          revoked: true,
          revokedReason: 'password_reset' 
        })
        .where(eq(refreshTokens.userId, userId));
    } catch (error) {
      throw new InternalServerError('Failed to invalidate refresh tokens for user');
    }
  }
}
