import type { Request } from 'express';
import type { User } from '../user/index.js';

/** Additional fields injected into Express requests */
export interface CustomRequestFields {
  user: User;
  auth?: unknown;
  organizationId?: string | number;
  requestId?: string;
  startTime?: [number, number];
  token?: string;
  isAuthenticated(): boolean;
  hasRole(role: string | string[]): boolean;
  hasPermission(permission: string | string[]): boolean;
}

/** Express request type augmented with authentication details */
export type AuthenticatedRequest = Request & CustomRequestFields;

