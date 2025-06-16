import { Trip, User } from '../../../db/schema.js';
import { CorporateTripDto } from './trip.service.interface';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * Trip repository interface that extends the base repository interface
 * Adds trip-specific operations to the common CRUD operations
 */
export interface TripRepository extends BaseRepository<Trip, number, Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Trip retrieval
  getTripsByUserId(userId: string, orgId: number): Promise<Trip[]>;
  getTripsByOrganizationId(orgId: number): Promise<Trip[]>;
  getTripById(tripId: number): Promise<Trip | null>;
  
  // Trip management
  createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip>;
  updateTrip(tripId: number, tripData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip | null>;
  deleteTrip(tripId: number): Promise<boolean>;
  
  // Corporate trip functionality
  getCorporateTrips(orgId: number): Promise<CorporateTripDto[]>;
  
  // Access control helper
  checkTripAccess(tripId: number, user: User): Promise<boolean>;
}
