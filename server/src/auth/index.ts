// Core auth exports
export * from './jwt/index.ts';
export * from './middleware/index.ts';
export * from './types/index.ts';

// Services and Repositories
export * from './services/auth.service.ts';
export * from './repositories/user.repository.ts';
export * from './repositories/refresh-token.repository.ts';

// Controllers
export * from './controllers/auth.controller.ts';

// DTOs
export * from './dtos/auth.dto.ts';

// Dependency injection container
export * from './auth.container.ts';

// Re-export specific types
export type { TokenPayload, TokenVerificationResult } from './types/index.ts';

// Explicitly re-export registerAuthRoutes for clarity
export { registerAuthRoutes } from './auth.container.ts';
