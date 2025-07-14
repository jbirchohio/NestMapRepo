// Core auth exports - use explicit named exports to avoid ambiguities
export { createToken, validateToken } from './jwt';
// Explicitly re-export types to avoid ambiguity
export type { UserRole, TokenType } from './jwt/types';

// Export middleware functions
export { authenticate, requireRole, requireOrganizationAccess } from './middleware';

// Services and Repositories
export { JwtAuthService, verifyToken as verifyJwtToken } from './services/jwtAuthService';
export { UserRepositoryImpl } from './repositories/user.repository';
// Make sure this path exists before uncommenting
// export { RefreshTokenRepositoryImpl } from './repositories/refresh-token';

// Controllers
export { AuthController } from './controllers/auth.controller';

// DTOs
export * from './dtos/auth.dto';

// Container (for dependency injection)
export { AuthContainer, authContainer } from './auth.container';

// Re-export commonly used types
export type { TokenPayload, TokenVerificationResult } from './jwt/types';
