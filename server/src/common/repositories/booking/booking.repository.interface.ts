import { Booking } from '../../../db/schema';
import { BaseRepository } from '../base.repository.interface';
import { BookingConfirmationDetails } from '../../interfaces/booking.interfaces';

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
  getBookingStatsByUserId(userId: string): Promise<any>;
  getBookingStatsByOrgId(orgId: string): Promise<any>;
}
