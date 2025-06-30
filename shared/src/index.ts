// Re-export schema and types
export * from './fieldTransforms.js';

// Export database types and schema
export * from './schema.js';

// Export API client
export { api } from './api/index.js';

// Export query client
export { queryClient, createQueryClient } from './queryClient.js';

export type { QueryClient } from '@tanstack/query-core';

// Export types explicitly to avoid ambiguity
export type { 
  Activity, 
  Trip, 
  User, 
  TripTraveler, 
  NewTripTraveler, 
  NewUser, 
  NewTrip 
} from './schema.js';

// Export all types from the types directory
export * from './types/index.js';

// Explicitly export job types
export * from './types/job/index.js';

// Export API utilities
export * from './api/index.js';

export * from './queryClient.js';
export * from './fieldTransforms.js';
