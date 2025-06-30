/**
 * Dependency injection tokens
 */
export const TYPES = {
  // Services
  UserRepository: Symbol.for('UserRepository'),
  UserContextService: Symbol.for('UserContextService'),
  
  // Middleware
  AuthzMiddleware: Symbol.for('AuthzMiddleware'),
  
  // Utils
  Logger: Symbol.for('Logger'),
} as const;

export type TYPES = typeof TYPES;
