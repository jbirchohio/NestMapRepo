// Import types first for proper type extraction
import type {
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
  OrganizationPlan
} from './schema.js';

// Re-export functions and constants (non-type exports)
export * from './fieldTransforms.js';
export { 
  USER_ROLES,
  transformTripToFrontend,
  transformActivityToFrontend
} from './schema.js';

// Re-export all types
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
  OrganizationPlan
};
