import { Trip, User } from '../../../db/schema.js';
import { CorporateTripDto } from './trip.service.interface';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * Trip repository interface that extends the base repository interface
 * Adds trip-specific operations to the common CRUD operations
 */
export interface TripRepository extends BaseRepository<Trip, string, Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Trip retrieval
  getTripsByUserId(userId: string, orgId: string): Promise<Trip[]>;
  getTripsByOrganizationId(orgId: string): Promise<Trip[]>;
  getTripById(tripId: string): Promise<Trip | null>;
  
  // Trip management
  createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip>;
  updateTrip(tripId: string, tripData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip | null>;
  deleteTrip(tripId: string): Promise<boolean>;
  
  // Corporate trip functionality
  getCorporateTrips(orgId: string): Promise<CorporateTripDto[]>;
  
  // Access control helper
  checkTripAccess(tripId: string, user: User): Promise<boolean>;
}
