export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
  replacedByToken?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenRepository {
  create(tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;
  findById(id: string): Promise<RefreshToken | null>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revokeToken(tokenId: string, replacedByToken?: string): Promise<void>;
  revokeTokensForUser(userId: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}

