// Core auth exports
export * from './jwt';
export * from './middleware';
export * from './types';

// Services and Repositories
export * from './services/auth.service';
export * from './repositories/user.repository';
export * from './repositories/refresh-token.repository';

// Controllers
export * from './controllers/auth.controller';

// DTOs
export * from './dtos/auth.dto';

// Container (for dependency injection)
export * from './auth.container';

// Re-export commonly used types
export type { TokenPayload, TokenVerificationResult } from './types';

// Register auth routes
export { registerAuthRoutes } from './auth.container';
