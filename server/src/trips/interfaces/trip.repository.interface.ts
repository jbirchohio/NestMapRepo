import type { AuthUser } from '../../types/auth-user.js';
import type { CorporateTripDto } from './trip.service.interface.js';
import type { Trip, User } from '@shared/schema';

// Alias for the local Trip entity to avoid naming conflicts
import type { Trip as LocalTrip } from '../domain/trip.entity.js';

/**
 * Defines the contract for a trip repository, outlining the methods
 * for data access and manipulation related to trips.
 */
export interface ITripRepository {
  /**
   * Finds a trip by its unique identifier.
   * @param id The ID of the trip.
   * @returns A promise that resolves to the Trip or null if not found.
   */
  findById(id: string): Promise<Trip | null>;

  /**
   * Retrieves all trips.
   * @returns A promise that resolves to an array of all trips.
   */
  findAll(): Promise<Trip[]>;

  /**
   * Creates a new trip.
   * @param data The data for the new trip.
   * @returns A promise that resolves to the newly created trip.
   */
  create(data: Omit<LocalTrip, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalTrip>;

  /**
   * Updates an existing trip.
   * @param id The ID of the trip to update.
   * @param data The partial data to update the trip with.
   * @returns A promise that resolves to the updated trip or null if not found.
   */
  update(id: string, data: Partial<Omit<LocalTrip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LocalTrip | null>;

  /**
   * Deletes a trip by its unique identifier.
   * @param id The ID of the trip to delete.
   * @returns A promise that resolves to true if deletion was successful, false otherwise.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Retrieves all trips for a specific user.
   * @param userId The ID of the user.
   * @returns A promise that resolves to an array of trips.
   */
  findByUserId(userId: string): Promise<LocalTrip[]>;

  /**
   * Checks if a user has access to a specific trip.
   * @param tripId The ID of the trip.
   * @param user The authenticated user.
   * @returns A promise that resolves to true if the user has access, false otherwise.
   */
  checkTripAccess(tripId: string, user: AuthUser): Promise<boolean>;
  
  /**
   * Retrieves all trips for a specific user within an organization
   * @param userId The ID of the user
   * @param orgId The ID of the organization
   * @returns A promise that resolves to an array of trips
   */
  getTripsByUserId(userId: string, orgId: string): Promise<LocalTrip[]>;
  
  /**
   * Retrieves all corporate trips for an organization
   * @param orgId The ID of the organization
   * @returns A promise that resolves to an array of corporate trip DTOs
   */
  getCorporateTrips(orgId: string): Promise<Array<CorporateTripDto>>;
  
  /**
   * Retrieves a trip by its ID with proper access control
   * @param tripId The ID of the trip
   * @param user The authenticated user
   * @returns A promise that resolves to the trip or null if not found/not accessible
   */
  getTripById(tripId: string, user: AuthUser): Promise<LocalTrip | null>;
}

