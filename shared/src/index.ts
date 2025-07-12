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
  UserRole,
  TripRole,
  OrganizationPlan
} from './schema.js';
