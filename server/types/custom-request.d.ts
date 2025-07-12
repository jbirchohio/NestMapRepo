import { Request as ExpressRequest } from 'express.js';
import { AuthUser } from '../src/types/auth-user.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    auth?: any;
    organizationId?: string | number;
    requestId?: string;
    startTime?: [number, number];
    token?: string;
    isAuthenticated?(): boolean;
    hasRole?(role: string | string[]): boolean;
    hasPermission?(permission: string | string[]): boolean;
  }
}

export interface CustomRequestFields {
  user: AuthUser;
  auth?: any;
  organizationId?: string | number;
  requestId?: string;
  startTime?: [number, number];
  token?: string;
  isAuthenticated(): boolean;
  hasRole(role: string | string[]): boolean;
  hasPermission(permission: string | string[]): boolean;
}

// Export the extended Request type
export type AuthenticatedRequest = Express.Request & CustomRequestFields;
