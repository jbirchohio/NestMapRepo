import { z } from 'zod';

/**
 * Booking status values
 */
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

/**
 * Type of booking
 */
export type BookingType = 'flight' | 'hotel' | 'car_rental' | 'activity' | 'other';

/**
 * Booking provider types
 */
export const bookingProviders = [
  'internal',
  'amadeus',
  'sabre',
  'booking_com',
  'expedia',
  'airbnb',
  'viator',
  'getyourguide',
  'kayak',
  'skyscanner',
  'other'
] as const;

export type BookingProvider = typeof bookingProviders[number];

/**
 * Specific booking types for different booking categories
 */

export interface FlightBooking extends BaseBooking {
  type: 'flight';
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  seatNumber?: string | null;
}

export interface HotelBooking extends BaseBooking {
  type: 'hotel';
  hotelName: string;
  roomType: string;
  roomNumber?: string | null;
  guestName: string;
  numberOfGuests: number;
  amenities?: string[];
}

export interface CarRentalBooking extends BaseBooking {
  type: 'car_rental';
  rentalCompany: string;
  carModel: string;
  licensePlate?: string | null;
  pickupLocation: string;
  dropoffLocation?: string | null;
  driverName: string;
  driverLicenseNumber?: string | null;
}

export interface ActivityBooking extends BaseBooking {
  type: 'activity';
  activityName: string;
  location: string;
  startTime: string;
  endTime: string;
  participantName: string;
  numberOfParticipants: number;
  guideName?: string | null;
}

/**
 * Union type of all specific booking types
 */
export type AnyBooking = FlightBooking | HotelBooking | CarRentalBooking | ActivityBooking | BaseBooking;

/**
 * Base booking interface containing all common fields
 * This should be used as the source of truth for booking-related types
 */
export interface BaseBooking {
  /** Unique identifier for the booking */
  id: string;
  
  /** ID of the user who made the booking */
  userId: string;
  
  /** Type of booking */
  type: BookingType;
  
  /** Provider of the booking (e.g., 'internal', 'amadeus', 'booking_com') */
  provider: BookingProvider;
  
  /** Reference ID from the provider's system */
  providerReferenceId: string;
  
  /** Current status of the booking */
  status: BookingStatus;
  
  /** Start date in ISO format */
  startDate: string;
  
  /** End date in ISO format */
  endDate: string;
  
  /** Total price in the smallest currency unit (e.g., cents) */
  totalPrice: number;
  
  /** Currency code (e.g., 'USD', 'EUR') */
  currency: string;
  
  /** Reference or confirmation number */
  referenceNumber?: string;
  
  /** Additional notes about the booking */
  notes?: string;
  
  /** ID of the associated trip, if any */
  tripId?: string;
  
  /** ID of the associated organization */
  organizationId: string;
  
  /** Metadata for the booking (e.g., provider-specific data) */
  metadata?: Record<string, unknown>;
}

/**
 * Client-specific extensions to the base booking type
 * Contains UI-specific or client-only fields
 */
export interface ClientBooking extends BaseBooking {
  /** Whether the booking is selected in the UI */
  isSelected?: boolean;
  
  /** Whether the booking details are expanded in the UI */
  isExpanded?: boolean;
  
  /** Whether the booking is being edited */
  isEditing?: boolean;
  
  /** Client-side validation errors */
  errors?: Record<string, string>;
}

/**
 * Server-specific extensions to the base booking type
 * Contains server-only fields (e.g., timestamps, relations)
 */
export interface ServerBooking extends BaseBooking {
  /** When the booking was created */
  createdAt: string;
  
  /** When the booking was last updated */
  updatedAt: string;
  
  /** When the booking was cancelled, if applicable */
  cancelledAt?: string | null;
  
  /** ID of the user who cancelled the booking, if applicable */
  cancelledBy?: string | null;
}

/**
 * Type for creating a new booking
 */
export interface CreateBookingData {
  type: BookingType;
  provider: BookingProvider;
  providerReferenceId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  currency: string;
  referenceNumber?: string;
  notes?: string;
  tripId?: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Type for updating an existing booking
 */
export type UpdateBookingData = Partial<Omit<CreateBookingData, 'type' | 'organizationId'>> & {
  status?: BookingStatus;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
};

/**
 * Schema for validating booking form data
 */
export const bookingFormSchema = z.object({
  type: z.enum(['flight', 'hotel', 'car_rental', 'activity', 'other']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalPrice: z.number().min(0, 'Price must be a positive number'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  tripId: z.string().optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Type inferred from the booking form schema
 */
export type BookingFormValues = z.infer<typeof bookingFormSchema>;

/**
 * Parameters for searching/filtering bookings
 */
export interface BookingSearchParams {
  type?: BookingType | BookingType[];
  status?: BookingStatus | BookingStatus[];
  userId?: string;
  organizationId?: string;
  tripId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  provider?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Type for the booking workflow steps
 */
export type BookingStep = 'client-info' | 'flights' | 'hotels' | 'confirmation';

/**
 * Type guard to check if an object is a valid BaseBooking
 */
export function isBooking(obj: unknown): obj is BaseBooking {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'userId' in obj &&
    'type' in obj &&
    'status' in obj &&
    'startDate' in obj &&
    'endDate' in obj &&
    'totalPrice' in obj &&
    'currency' in obj &&
    'organizationId' in obj
  );
}

/**
 * Type guard to check if an object is a valid ClientBooking
 */
export function isClientBooking(obj: unknown): obj is ClientBooking {
  return isBooking(obj) && 'isSelected' in obj;
}

/**
 * Type guard to check if an object is a valid ServerBooking
 */
export function isServerBooking(obj: unknown): obj is ServerBooking {
  return isBooking(obj) && 'createdAt' in obj && 'updatedAt' in obj;
}

/**
 * Type guard to check if a string is a valid BookingStatus
 */
export function isBookingStatus(status: unknown): status is BookingStatus {
  return [
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'refunded',
  ].includes(status as string);
}

/**
 * Type guard to check if a string is a valid BookingType
 */
export function isBookingType(type: unknown): type is BookingType {
  return [
    'flight',
    'hotel',
    'car_rental',
    'activity',
    'other',
  ].includes(type as string);
}
