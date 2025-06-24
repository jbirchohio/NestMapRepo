/**
 * Authentication and authorization type definitions
 */

import type { ID, ISO8601DateTime } from '../core/base';

declare namespace SharedTypes {
  // User roles for authorization
  type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
  
  // Permissions for fine-grained access control
  type Permission =
    | 'user:read' | 'user:write' | 'user:delete'
    | 'organization:read' | 'organization:write' | 'organization:delete'
    | 'trip:read' | 'trip:write' | 'trip:delete'
    | 'billing:read' | 'billing:write';

  // JWT token types
  type TokenType = 'access' | 'refresh' | 'verification' | 'password_reset';
  
  // JWT payload structure - this is the canonical JWT payload type
  interface JwtPayload {
    jti: ID;                // JWT ID
    sub: ID;                // Subject (user ID)
    email: string;          // User email
    role: UserRole;         // User role
    type: TokenType;        // Token type
    iat: number;            // Issued at (timestamp)
    exp: number;            // Expiration time (timestamp)
    organization_id?: ID;   // Organization ID (optional)
    permissions?: Permission[]; // User permissions
  }
  
  // Authentication tokens
  interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;     // Seconds until expiration
    token_type: string;     // Usually 'Bearer'
  }
  
  // Authentication response
  interface AuthResponse {
    user: User;
    tokens: AuthTokens;
  }
  
  // Password reset token result
  interface PasswordResetTokenResult {
    user_id: ID;
    email: string;
    jti: ID;
  }
  
  // Token verification result
  interface TokenVerificationResult<T = unknown> {
    payload: T;
    expired: boolean;
  }
}
