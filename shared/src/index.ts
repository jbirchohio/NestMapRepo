// Re-export schema and types
export * from './fieldTransforms.js';
export * from './schema.js';

// Export types explicitly to avoid ambiguity  
export type { 
  Activity, 
  Trip, 
  User,
  TripTraveler,
  NewTripTraveler,
  NewUser,
  NewTrip,
  BaseEntity,
  BaseRepository,
  UserRole,
  TripRole,
  OrganizationPlan,
  // Export transform functions
  transformTripToFrontend,
  transformActivityToFrontend
} from './schema.js';

// Export constants
export { USER_ROLES } from './schema.js';
