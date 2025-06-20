export interface RefreshToken {
  id: string;
  createdAt: Date;
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RefreshTokenRepository {
  create(token: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | undefined>;
  revokeByUserId(userId: string): Promise<void>;
  revokeByToken(token: string): Promise<void>;
  deleteExpired(): Promise<number>;
}