// Re-export schema and types
export * from './fieldTransforms.js';

// Export database types
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
