import { 
  LoginDto, 
  RegisterDto,
  RequestPasswordResetDto, 
  ResetPasswordDto,
  ChangePasswordDto,
  AuthResponse,
  UserResponse
} from '@shared/types/auth/dto';
import { UserRole } from '@shared/types/auth/permissions';

export interface IAuthService {
  /**
   * Authenticate a user with email and password
   */
  login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse>;
  
  /**
   * Register a new user
   */
  register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse>;
  
  /**
   * Refresh an access token using a refresh token
   */
  refreshToken(refreshToken: string, ip: string, userAgent: string): Promise<AuthResponse>;
  
  /**
   * Change a user's password
   */
  changePassword(userId: string, data: ChangePasswordDto): Promise<void>;
  
  /**
   * Log out the current user by revoking their tokens
   */
  logout(refreshToken: string, accessToken?: string): Promise<void>;
  
  /**
   * Request a password reset email
   */
  requestPasswordReset(data: RequestPasswordResetDto): Promise<void>;
  
  /**
   * Reset a user's password using a reset token
   */
  resetPassword(data: ResetPasswordDto): Promise<void>;
  
  /**
   * Revoke all active sessions for a user
   */
  revokeAllSessions(userId: string): Promise<void>;
  
  /**
   * Verify if the current user is authenticated
   */
  isAuthenticated(accessToken: string): Promise<boolean>;
  
  /**
   * Get the current user's information
   */
  getCurrentUser(accessToken: string): Promise<UserResponse | null>;
}
