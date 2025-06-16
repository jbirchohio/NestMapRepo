import { and, eq, lte } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../../db';
import { refreshTokens, type RefreshToken } from '../../../db/schema.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepositoryImpl.name);

  async create(tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    try {
      const [token] = await db
        .insert(refreshTokens)
        .values({
          ...tokenData,
          createdAt: new Date()
        })
        .returning();
      
      if (!token) {
        throw new Error('Failed to create refresh token');
      }
      
      return token;
    } catch (error) {
      this.logger.error(`Failed to create refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to create refresh token');
    }
  }

  async findById(id: string): Promise<RefreshToken | undefined> {
    if (!id) {
      this.logger.warn('findById called with empty id');
      return undefined;
    }

    try {
      const [token] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.id, id))
        .limit(1);
      
      return token;
    } catch (error) {
      this.logger.error(`Failed to find token by id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to find refresh token');
    }
  }

  async findByToken(token: string): Promise<RefreshToken | undefined> {
    if (!token) {
      this.logger.warn('findByToken called with empty token');
      return undefined;
    }

    try {
      const [refreshToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, token),
            eq(refreshTokens.revoked, false),
            lte(refreshTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      return refreshToken;
    } catch (error) {
      this.logger.error(`Failed to find token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to find refresh token');
    }
  }

  async revokeToken(id: string): Promise<void> {
    if (!id) {
      this.logger.warn('revokeToken called with empty id');
      return;
    }

    try {
      const result = await db
        .update(refreshTokens)
        .set({
          revoked: true,
          revokedAt: new Date()
        })
        .where(eq(refreshTokens.id, id));

      if (result.rowCount === 0) {
        throw new Error(`Token with id ${id} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to revoke token ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to revoke refresh token');
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    if (!userId) {
      this.logger.warn('revokeAllForUser called with empty userId');
      return;
    }

    try {
      await db
        .update(refreshTokens)
        .set({
          revoked: true,
          revokedAt: new Date()
        })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.revoked, false)
          )
        );
    } catch (error) {
      this.logger.error(`Failed to revoke tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to revoke user refresh tokens');
    }
  }

  async deleteExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(refreshTokens)
        .where(
          and(
            lte(refreshTokens.expiresAt, new Date()),
            eq(refreshTokens.revoked, true)
          )
        );
      
      this.logger.log(`Deleted ${result.rowCount} expired refresh tokens`);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error(`Failed to delete expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to delete expired refresh tokens');
    }
  }
}
