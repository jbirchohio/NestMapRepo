// Import from auth.ts
import {
  authenticate as authenticateJWT,
  requireRole as originalRequireRole
} from './secureAuth';
import type { AuthenticatedRequest as AuthRequest, AuthUser } from '../src/types/auth-user';

// Re-export with new names
export const unifiedAuthMiddleware = authenticateJWT;
export const requireRole = originalRequireRole;

// Export types
export type { AuthRequest, AuthUser };

// Default export for CommonJS compatibility
export default {
  unifiedAuthMiddleware,
  requireRole,
  // Types can't be included in runtime exports
};
