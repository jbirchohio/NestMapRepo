/**
 * Custom Express request types with authentication
 */

import type { Request } from 'express';
import type { AuthUser } from './user.js';

/**
 * Custom fields added to the Express Request
 */
export interface CustomRequestFields {
  /** The authenticated user */
  user: AuthUser;
  /** Authentication details */
  auth?: any /** FIXANYERROR: Replace 'any' */;
  /** Organization ID for the current request context */
  organizationId?: string | number;
  /** Unique ID for the request for tracing */
  requestId?: string;
  /** Request start time for performance tracking */
  startTime?: [number, number];
  /** Authentication token */
  token?: string;
  /** Check if the request is authenticated */
  isAuthenticated(): boolean;
  /** Check if the user has the specified role(s) */
  hasRole(role: string | string[]): boolean;
  /** Check if the user has the specified permission(s) */
  hasPermission(permission: string | string[]): boolean;
}

/**
 * Extended Request type with authentication fields
 */
export type AuthenticatedRequest = Request & CustomRequestFields;
