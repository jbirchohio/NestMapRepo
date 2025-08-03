// Standardized authentication types for the entire application

export interface JWTUser {
  id: number;
  username: string;
  email: string;
  role: string;
  organization_id: number;
  // Additional properties that may be used in some contexts
  organizationId?: number; // Alias for organization_id
  userId?: number; // Alias for id
  user_id?: number; // Another alias for id
  roleType?: string;
  authId?: string;
  displayName?: string;
  permissions?: string[];
  subscription_tier?: string;
  organization_tier?: string;
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
  organizationId?: number;
  organization_id?: number;
  userId?: number;
  enforceOrganizationScope: boolean;
}

export type UserRole = 'admin' | 'manager' | 'user' | 'guest' | 'super_admin';