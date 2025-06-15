import { RefreshToken } from '../../../db/schema';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * Interface defining the contract for refresh token repository operations.
 * Extends the base repository interface to include common CRUD operations
 * and adds refresh token specific operations.
 */
export interface RefreshTokenRepository extends BaseRepository<RefreshToken, string, Omit<RefreshToken, 'id' | 'createdAt'>, Partial<Omit<RefreshToken, 'id' | 'createdAt'>>> {
  /**
   * Creates a new refresh token
   * @param token The refresh token data to create (excluding id and createdAt)
   * @returns The created refresh token with generated fields
   */
  create(token: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;

  /**
   * Finds a refresh token by its ID
   * @param id The ID of the refresh token to find
   * @returns The refresh token if found, undefined otherwise
   */
  findById(id: string): Promise<RefreshToken | undefined>;

  /**
   * Finds a refresh token by its token value
   * @param token The token value to search for
   * @returns The refresh token if found and valid, undefined otherwise
   */
  findByToken(token: string): Promise<RefreshToken | undefined>;

  /**
   * Revokes a refresh token by its ID
   * @param id The ID of the token to revoke
   * @throws {Error} If the token cannot be revoked
   */
  revokeToken(id: string): Promise<void>;

  /**
   * Revokes all active refresh tokens for a user
   * @param userId The ID of the user whose tokens should be revoked
   * @throws {Error} If the operation fails
   */
  revokeAllForUser(userId: string): Promise<void>;

  /**
   * Deletes all expired refresh tokens
   * @returns The number of tokens deleted
   * @throws {Error} If the operation fails
   */
  deleteExpiredTokens(): Promise<number>;
}
