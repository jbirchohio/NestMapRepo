import { BaseModel } from './base.js';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
export type BookingType = 'flight' | 'hotel' | 'car_rental' | 'activity' | 'other';

export interface Booking extends BaseModel {
  reference: string;
  type: BookingType;
  status: BookingStatus;
  bookingDate: Date | string;
  checkInDate?: Date | string | null;
  checkOutDate?: Date | string | null;
  amount: number;
  currency: string;
  provider: string;
  providerBookingId: string;
  providerReferenceId?: string | null;
  userId: number | string;
  organizationId: number | string;
  tripId?: number | string | null;
  activityId?: number | string | null;
  notes?: string | null;
  cancellationPolicy?: string | null;
  cancellationDeadline?: Date | string | null;
  metadata?: Record<string, unknown>;
}

export interface FlightBooking extends Booking {
  type: 'flight';
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: Date | string;
  arrivalTime: Date | string;
  passengerName: string;
  bookingClass: string;
  seatNumber?: string | null;
  baggageAllowance?: string | null;
}

export interface HotelBooking extends Booking {
  type: 'hotel';
  hotelName: string;
  roomType: string;
  roomNumber?: string | null;
  guestName: string;
  numberOfGuests: number;
  amenities?: string[];
}

export interface CarRentalBooking extends Booking {
  type: 'car_rental';
  rentalCompany: string;
  carModel: string;
  licensePlate?: string | null;
  pickupLocation: string;
  dropoffLocation?: string | null;
  driverName: string;
  driverLicenseNumber?: string | null;
}

export interface ActivityBooking extends Booking {
  type: 'activity';
  activityName: string;
  location: string;
  startTime: Date | string;
  endTime: Date | string;
  participantName: string;
  numberOfParticipants: number;
  guideName?: string | null;
}

export type AnyBooking = FlightBooking | HotelBooking | CarRentalBooking | ActivityBooking | Booking;

export interface BookingSearchParams {
  type?: BookingType | BookingType[];
  status?: BookingStatus | BookingStatus[];
  userId?: number | string;
  organizationId?: number | string;
  tripId?: number | string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  provider?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
