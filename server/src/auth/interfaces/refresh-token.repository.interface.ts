export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

export interface RefreshTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revokeByUserId(userId: string): Promise<void>;
  revokeByToken(token: string): Promise<void>;
  deleteExpired(): Promise<number>;
}