// Standardized authentication types for the entire application

export interface JWTUser {
  id: number;
  username: string;
  email: string;
  role: string;
  // Additional properties that may be used in some contexts
  userId?: number; // Alias for id
  user_id?: number; // Another alias for id
  roleType?: string;
  authId?: string;
  displayName?: string;
  permissions?: string[];
  subscription_tier?: string;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: JWTUser;
  isAuthenticated?: () => boolean;
}

export interface AuditLogEntry {
  user_id?: number;
  userId?: number; // Alternative name
  action: string;
  details?: any;
  ip_address?: string;
  timestamp?: Date;
}

export interface SecureQueryBuilder {
  userId?: number;
}

export type UserRole = 'admin' | 'manager' | 'user' | 'guest' | 'super_admin';