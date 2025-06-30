/**
 * Trip-related type exports
 * Organized to avoid duplicate exports and maintain clarity
 */

// Core trip types
export * from './TripTypes.js';

// Business trip related types
export * from './BusinessTripTypes.js';

// Activity related types
export * from './TripActivityTypes.js';

// Re-export DTOs
export * from './trip.dto.js';

// Export shared types with explicit names
export type { default as SharedTripType } from './SharedTripType.js';
export type { default as SharedConflictFlagsType } from './SharedConflictFlagsType.js';
