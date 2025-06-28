import type { 
  BaseBooking, 
  BookingStatus, 
  BookingType, 
  AnyBooking
} from '@shared/types/booking/index.ts';
import type { BookingSearchParams } from '@shared/src/types/booking/index.js';
import type { BaseRepository } from '../base.repository.interface.js';

/**
 * Interface for booking repository operations
 * Extends the base repository with booking-specific methods
 */
export interface BookingRepository extends BaseRepository<
  BaseBooking, 
  string, 
  Omit<BaseBooking, 'id' | 'createdAt' | 'updatedAt' | 'reference'>,
  Partial<Omit<BaseBooking, 'id' | 'createdAt' | 'updatedAt' | 'reference'>>
> {
  /**
   * Find bookings by user ID
   * @param userId - The ID of the user
   * @param options - Additional query options (status, type, etc.)
   * @returns Array of bookings for the user
   */
  findByUserId(userId: string, options?: {
    status?: BookingStatus | BookingStatus[];
    type?: BookingType | BookingType[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<BaseBooking[]>;

  /**
   * Find bookings by trip ID
   * @param tripId - The ID of the trip
   * @param options - Additional query options (status, type, etc.)
   * @returns Array of bookings for the trip
   */
  findByTripId(tripId: string, options?: {
    status?: BookingStatus | BookingStatus[];
    type?: BookingType | BookingType[];
  }): Promise<BaseBooking[]>;

  /**
   * Find a booking by provider reference ID
   * @param providerReferenceId - The reference ID from the provider
   * @returns The booking if found, null otherwise
   */
  findByProviderReferenceId(providerReferenceId: string): Promise<BaseBooking | null>;

  /**
   * Find bookings by organization ID
   * @param organizationId - The ID of the organization
   * @param options - Search parameters
   * @returns Array of bookings for the organization
   */
  findByOrganizationId(organizationId: string, options?: BookingSearchParams): Promise<BaseBooking[]>;

  /**
   * Search bookings based on criteria
   * @param params - Search parameters
   * @returns Array of bookings matching the criteria
   */
  searchBookings(params: BookingSearchParams): Promise<BaseBooking[]>;

  /**
   * Confirm a booking
   * @param id - The ID of the booking to confirm
   * @param confirmationDetails - Confirmation details
   * @returns The updated booking or null if not found
   */
  confirmBooking(id: string, confirmationDetails: {
    providerReferenceId: string;
    confirmationNumber: string;
    confirmedAt: Date;
    details?: Record<string, unknown>;
  }): Promise<BaseBooking | null>;

  /**
   * Cancel a booking
   * @param id - The ID of the booking to cancel
   * @param cancellationReason - Reason for cancellation
   * @returns The updated booking or null if not found
   */
  cancelBooking(id: string, cancellationReason: string): Promise<BaseBooking | null>;

  /**
   * Get booking statistics for a user
   * @param userId - The ID of the user
   * @returns Object containing booking statistics
   */
  getBookingStatsByUserId(userId: string): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byType: Record<BookingType, number>;
    totalAmount: number;
    currency: string;
  }>;

  /**
   * Get booking statistics for an organization
   * @param orgId - The ID of the organization
   * @returns Object containing booking statistics
   */
  getBookingStatsByOrgId(orgId: string): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byType: Record<BookingType, number>;
    totalAmount: number;
    currency: string;
    byUser: Array<{ userId: string; count: number; amount: number }>;
  }>;

  /**
   * Update booking status
   * @param id - The ID of the booking
   * @param status - The new status
   * @param notes - Optional notes about the status change
   * @returns The updated booking or null if not found
   */
  updateStatus(id: string, status: BookingStatus, notes?: string): Promise<BaseBooking | null>;
}
