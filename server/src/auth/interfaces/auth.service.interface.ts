import { AuthResponse, LoginDto, RefreshTokenDto } from '../dtos/auth.dto.js.js';

export interface IAuthService {
  login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse>;
  refreshToken(tokenData: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse>;
  logout(refreshToken: string, authHeader?: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
}