// Import and export BaseRepository interface from repository.js
export { BaseRepository } from './repository.js';

// Re-export schema and types
export * from './fieldTransforms.js';
export * from './schema.js';

// Export interfaces and types explicitly to avoid ambiguity  
export type { 
  Activity, 
  Trip, 
  User,
  TripTraveler,
  NewTripTraveler,
  NewUser,
  NewTrip,
  BaseEntity,
  UserRole,
  TripRole,
  OrganizationPlan
} from './schema.js';

// Export transform functions
export {
  transformTripToFrontend,
  transformActivityToFrontend,
  USER_ROLES
} from './schema.js';
