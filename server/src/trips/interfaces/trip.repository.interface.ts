import * as tripSchema from '../../db/tripSchema';
import * as schema from '../../db/schema';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import type { CorporateTripDto } from './trip.service.interface';

/**
 * Trip repository interface that extends the base repository interface
 * Adds trip-specific operations to the common CRUD operations
 */
export interface TripRepository extends BaseRepository<tripSchema.Trip, string, Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Trip retrieval
  getTripsByUserId(userId: string, orgId: string): Promise<tripSchema.Trip[]>;
  getTripsByOrganizationId(orgId: string): Promise<tripSchema.Trip[]>;
  getTripById(tripId: string): Promise<tripSchema.Trip | null>;
  
  // Trip management
  createTrip(tripData: Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<tripSchema.Trip>;
  updateTrip(tripId: string, tripData: Partial<Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<tripSchema.Trip | null>;
  deleteTrip(tripId: string): Promise<boolean>;
  
  // Corporate trip functionality
  getCorporateTrips(orgId: string): Promise<CorporateTripDto[]>;
  
  // Access control helper
  checkTripAccess(tripId: string, user: schema.User): Promise<boolean>;
}
