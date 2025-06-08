// Core auth exports
export * from './jwt';
export * from './middleware';
export * from './types';

// Re-export commonly used types
export type { TokenPayload, AuthUser, TokenVerificationResult } from './types';

// Default export for middleware
export { default as authMiddleware } from './middleware';
