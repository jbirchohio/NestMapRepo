import { Booking } from '../../../db/schema';
import { BaseRepository } from '../base.repository.interface';

// Define BookingConfirmationDetails type if it doesn't exist
export type BookingConfirmationDetails = Record<string, any>;

/**
 * Interface for booking repository operations
 * Extends the base repository with booking-specific methods
 */
export interface BookingRepository extends BaseRepository<Booking, string, Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Booking-specific retrieval methods
  findByUserId(userId: string): Promise<Booking[]>;
  findByTripId(tripId: string): Promise<Booking[]>;
  findByProviderReferenceId(providerReferenceId: string): Promise<Booking | null>;
  
  // Booking-specific management methods
  confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null>;
  cancelBooking(id: string, cancellationReason: string): Promise<Booking | null>;
  
  // Booking analytics and reporting
  getBookingStatsByUserId(userId: string): Promise<{total: number, statusCounts: Record<string, number>}>;
  getBookingStatsByOrgId(orgId: string): Promise<{total: number, statusCounts: Record<string, number>}>;
}

