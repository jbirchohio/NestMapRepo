// Define Injectable as a class decorator type to avoid dependency on NestJS
type Injectable = () => ClassDecorator;
const Injectable: Injectable = () => {
  return (target: any) => {
    // This is just a stub decorator that does nothing
    return target;
  };
};
import jwtUtils, { 
  TokenPayload, 
  UserRole, 
  TokenType, 
  AuthTokens, 
  TokenVerificationResult 
} from '../jwt';
import { IAuthService } from '../interfaces/auth.service.interface';
import { AuthResponse, LoginDto, RefreshTokenDto } from '../dtos/auth.dto';

/**
 * Service handling JWT authentication operations
 */
@Injectable()
export class JwtAuthService implements IAuthService {
  /**
   * Generates an access and refresh token pair
   */
  async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole = 'member', // Changed from 'user' to 'member' to match UserRole type
    organizationId?: string
  ): Promise<AuthTokens> {
    return jwtUtils.generateTokenPair(userId, email, role, organizationId);
  }

  /**
   * Verifies a JWT token
   */
  async verifyToken<T extends TokenPayload = TokenPayload>(
    token: string,
    type: TokenType
  ): Promise<TokenVerificationResult<T>> {
    return jwtUtils.verifyToken<T>(token, type);
  }

  /**
   * Blacklists a token by its ID
   */
  async blacklistToken(
    tokenId: string,
    expiresInSeconds: number = 7 * 24 * 60 * 60 // Default 7 days
  ): Promise<void> {
    return jwtUtils.blacklistToken(tokenId, expiresInSeconds);
  }

  /**
   * Decodes a JWT token without verification
   */
  decodeToken<T extends Record<string, unknown> = TokenPayload>(
    token: string
  ): T | null {
    return jwtUtils.decodeToken<T>(token);
  }

  /**
   * Generates a single JWT token
   */
  async generateToken(
    payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp'> & { type: TokenType },
    expiresIn?: string | number
  ): Promise<string> {
    return jwtUtils.generateToken(payload, undefined, expiresIn);
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    return jwtUtils.revokeAllUserTokens(userId);
  }

  /**
   * Login implementation
   */
  async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    // This is a stub implementation - you'll need to implement the actual login logic
    // Log IP and user agent for security auditing in real implementation
    console.log(`Login attempt from IP: ${ip}, User Agent: ${userAgent}`);
    
    const userId = 'user-123'; // In a real implementation, validate credentials and get the user ID
    const email = loginData.email;
    const tokens = await this.generateTokenPair(userId, email);
    
    return {
      user: {
        id: userId,
        email: email,
        role: 'user'
      },
      tokens
    };
  }

  /**
   * Refresh token implementation
   */
  async refreshToken(tokenData: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse> {
    // This is a stub implementation - you'll need to implement the actual refresh logic
    // Log IP and user agent for security auditing in real implementation
    console.log(`Token refresh from IP: ${ip}, User Agent: ${userAgent}`);
    
    const decoded = this.decodeToken(tokenData.refreshToken);
    if (!decoded || !decoded.sub || !decoded.email) {
      throw new Error('Invalid refresh token');
    }
    
    const userId = decoded.sub;
    const email = decoded.email;
    const tokens = await this.generateTokenPair(userId, email);
    
    return {
      user: {
        id: userId,
        email: email,
        role: 'user'
      },
      tokens
    };
  }

  /**
   * Logout implementation
   */
  async logout(refreshToken: string, authHeader?: string): Promise<void> {
    if (refreshToken) {
      const decoded = this.decodeToken(refreshToken);
      if (decoded && decoded.jti) {
        await this.blacklistToken(decoded.jti);
      }
    }
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = this.decodeToken(token);
      if (decoded && decoded.jti) {
        await this.blacklistToken(decoded.jti);
      }
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Stub implementation
    console.log(`Password reset requested for ${email}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Stub implementation
    console.log(`Password reset with token ${token} and new password length: ${newPassword.length}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    return this.revokeAllUserTokens(userId);
  }
}

/**
 * Utility function to verify tokens for middleware use
 */
export const verifyToken = jwtUtils.verifyToken;
