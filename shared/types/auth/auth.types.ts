import type { UserRole } from './permissions.js';
import type { UserResponse } from './dto/user-response.dto.js';

export interface AuthError {
  code: string;
  message: string;
  status?: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  attributes?: string[];
  conditions?: Record<string, unknown>;
}

export interface SessionSecurity {
  isLocked: boolean;
  failedAttempts: number;
  lastFailedAttempt?: Date;
  lockUntil?: Date;
}

export interface AuthUser extends Omit<UserResponse, 'role'> {
  role: UserRole;
  permissions: string[];
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}
