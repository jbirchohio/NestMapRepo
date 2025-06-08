import { BaseModel } from './base';

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'user' | 'guest';

export interface JwtPayload {
  userId: string | number;
  email: string;
  role: UserRole;
  organizationId?: string | number;
  iat?: number;
  exp?: number;
  sub?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData extends LoginCredentials {
  username: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface User extends BaseModel {
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  organizationId: number | null;
  emailVerified: boolean;
  lastLogin: Date | null;
  avatarUrl?: string | null;
  timezone?: string;
  locale?: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultView: 'list' | 'grid' | 'calendar';
  };
}
