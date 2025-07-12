// Core auth exports
export * from './jwt.js';
export * from './middleware.js';
export * from './types.js';

// Services and Repositories
export * from './services/auth.service.js';
export * from './repositories/user.repository.js';
export * from './repositories/refresh-token.repository.js';

// Controllers
export * from './controllers/auth.controller.js';

// DTOs
export * from './dtos/auth.dto.js';

// Container (for dependency injection)
export * from './auth.container.js';

// Re-export commonly used types
export type { TokenPayload, TokenVerificationResult } from './types.js';

// Register auth routes
export { registerAuthRoutes } from './auth.container.js';
