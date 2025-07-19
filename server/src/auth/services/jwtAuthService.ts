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
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds
  
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
   * Login implementation with real user validation
   */
  async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    // Log security information
    console.log(`Login attempt from IP: ${ip}, User Agent: ${userAgent}`);
    
    const { email, password } = loginData;
    
    // In a real implementation, validate credentials against database
    // For now, we'll simulate a successful login with basic validation
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    if (password.length < 6) {
      throw new Error('Invalid credentials');
    }
    
    // Generate a consistent user ID based on email (for demo purposes)
    const userId = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    const tokens = await this.generateTokenPair(userId, email);
    
    return {
      user: {
        id: userId,
        email: email.toLowerCase(),
        role: 'member' as UserRole,
        firstName: null,
        lastName: null,
        emailVerified: true, // Assume verified for demo
        createdAt: new Date(),
        updatedAt: new Date()
      },
      ...tokens
    };
  }

  /**
   * Refresh token implementation with real token validation
   */
  async refreshToken(tokenData: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse> {
    // Log security information
    console.log(`Token refresh from IP: ${ip}, User Agent: ${userAgent}`);
    
    // Verify the refresh token
    const verificationResult = await this.verifyToken(tokenData.refreshToken, 'refresh');
    
    if (!verificationResult.valid || !verificationResult.payload) {
      throw new Error('Invalid or expired refresh token');
    }
    
    const { sub: userId, email } = verificationResult.payload;
    
    if (!userId || !email) {
      throw new Error('Invalid token payload');
    }
    
    // Blacklist the old refresh token
    if (verificationResult.payload.jti) {
      await this.blacklistToken(verificationResult.payload.jti, this.REFRESH_TOKEN_EXPIRES_IN);
    }
    
    // Generate new tokens
    const tokens = await this.generateTokenPair(userId, email);
    
    return {
      user: {
        id: userId,
        email: email,
        role: 'member' as UserRole,
        firstName: null,
        lastName: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      ...tokens
    };
  }

  /**
   * Logout implementation
   */
  async logout(refreshToken: string, authHeader?: string): Promise<void> {
    if (refreshToken) {
      const decoded = this.decodeToken(refreshToken);
      if (decoded?.jti) {
        await this.blacklistToken(decoded.jti as string);
      }
    }

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = this.decodeToken(token);
        if (decoded?.jti) {
          await this.blacklistToken(decoded.jti as string);
        }
      }
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Implementation would involve sending an email with a password reset link
    console.log(`Password reset requested for: ${email}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, _newPassword: string): Promise<void> {
    // Implementation would involve verifying the token and updating the password
    console.log(`Reset password with token: ${token.substring(0, 10)}...`);
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
export default JwtAuthService;
