/**
 * This barrel file re-exports all of the types and interfaces for the auth module.
 * We use explicit exports to avoid duplicate exports and maintain clarity.
 */

// Export auth-specific types
export * from './auth.js';

// Export JWT and response types
export type { AuthResponse } from './jwt.js';

// Express type augmentations
import './express.js';

// Re-export DTOs
export * from './dto/index.js';
