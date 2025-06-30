import type { BookingStatus, BookingType } from '@shared/schema/types/booking';

/**
 * Data Transfer Object for creating a booking
 */
export interface CreateBookingDto {
  type: BookingType;
  status?: BookingStatus;
  bookingDate?: Date | string;
  checkInDate?: Date | string | null;
  checkOutDate?: Date | string | null;
  amount: number;
  currency?: string;
  provider: string;
  providerBookingId?: string;
  userId: string | number;
  organizationId: string | number;
  tripId?: string | number | null;
  activityId?: string | number | null;
  notes?: string | null;
  cancellationPolicy?: string | null;
  cancellationDeadline?: Date | string | null;
  cancellationReason?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Data Transfer Object for updating a booking
 */
export interface UpdateBookingDto extends Partial<Omit<CreateBookingDto, 'userId' | 'organizationId' | 'reference'>> {
  status?: BookingStatus;
  reference?: string; // Make reference optional for updates
}

/**
 * Parameters for searching bookings
 */
export interface BookingSearchParams {
  userId?: string | number;
  organizationId?: string | number;
  tripId?: string | number;
  status?: BookingStatus | BookingStatus[];
  type?: BookingType | BookingType[];
  startDate?: Date | string;
  endDate?: Date | string;
  provider?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}
