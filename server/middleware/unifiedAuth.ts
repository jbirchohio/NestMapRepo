// Import from auth.ts
import { 
  authenticateJWT,
  requireRole as originalRequireRole,
  type AuthRequest,
  type AuthUser
} from './auth';

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
