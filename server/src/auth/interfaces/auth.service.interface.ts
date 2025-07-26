import { AuthResponse, LoginDto, RefreshTokenDto, RegisterDto } from '../dtos/auth.dto';

export interface IAuthService {
  login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse>;
  register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse>;
  refreshToken(tokenData: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse>;
  logout(refreshToken: string, authHeader?: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
}

