/**
 * This barrel file re-exports all of the types and interfaces for the auth module.
 */

// Re-export all definitions from the new, authoritative files.
export * from './auth.js';
export * from './user.js';
export type { AuthResponse } from './jwt.js';

// Express type augmentations
import './express.js';

// Re-export DTOs
export * from './dto/index.js';
