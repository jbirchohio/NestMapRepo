import { RefreshToken, RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';

export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  private tokens: Map<string, RefreshToken> = new Map();

  async create(tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    const refreshToken: RefreshToken = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      ...tokenData,
      createdAt: new Date(),
      revoked: false,
    };
    this.tokens.set(refreshToken.id, refreshToken);
    return refreshToken;
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return this.tokens.get(id) || null;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return Array.from(this.tokens.values()).find(t => t.token === token) || null;
  }

  async revokeToken(tokenId: string, replacedByToken?: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (token && !token.revoked) {
      this.tokens.set(tokenId, { 
        ...token, 
        revoked: true,
        replacedByToken
      });
    }
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    for (const [id, token] of this.tokens.entries()) {
      if (token.userId === userId && !token.revoked) {
        this.tokens.set(id, { 
          ...token, 
          revoked: true 
        });
      }
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    for (const [id, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(id);
      }
    }
  }
}

