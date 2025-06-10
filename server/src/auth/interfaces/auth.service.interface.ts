import { LoginDto, RefreshTokenDto } from '../dtos/auth.dto';
import { AuthResponse } from './auth.interface';
import { User } from './user.interface';

export interface IAuthService {
  // Authentication methods
  login(loginDto: LoginDto, ipAddress: string, userAgent?: string): Promise<AuthResponse>;
  refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress: string, userAgent?: string): Promise<AuthResponse>;
  logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }>;
  
  // User validation
  validateUser(email: string, password: string): Promise<{ 
    id: string; 
    email: string; 
    role: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null>;
  
  // Password reset
  requestPasswordReset(email: string): Promise<{ success: boolean; message: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }>;
  
  // Token management
  generateTokens(user: User, ipAddress: string, userAgent?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Omit<User, 'passwordHash' | 'refreshToken'>;
  }>;
  
  // User management
  revokeAllSessions(userId: string): Promise<void>;
  
  // Utility methods
  verifyToken(token: string, type: string): Promise<{ userId: string; email: string; role: string }>;
}
