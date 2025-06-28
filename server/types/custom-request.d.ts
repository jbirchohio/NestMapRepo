import { Request as ExpressRequest } from '../../express-augmentations';
import type { AuthUser } from '@shared/src/types/auth/user.js';
import type { JwtPayload } from '@shared/src/types/auth/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    auth?: JwtPayload;
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
  auth?: JwtPayload;
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
