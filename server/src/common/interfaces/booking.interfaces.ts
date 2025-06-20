/**
 * Booking-related interfaces for user preferences and booking data
 */

export interface UserBookingPreferences {
  preferredAirlines?: string[];
  seatPreference?: 'window' | 'aisle' | 'middle';
  mealPreference?: 'standard' | 'vegetarian' | 'vegan' | 'kosher' | 'halal';
  frequentFlyerNumbers?: Record<string, string>;
  hotelPreferences?: {
    roomType?: 'standard' | 'deluxe' | 'suite';
    amenities?: string[];
  };
  carRentalPreferences?: {
    preferredVendors?: string[];
    carType?: 'economy' | 'compact' | 'midsize' | 'fullsize' | 'luxury' | 'suv';
  };
}

export interface BookingDetails {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'activity';
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmation?: string;
  price?: number;
  currency?: string;
  bookingDate: Date;
  travelDate?: Date;
  metadata?: Record<string, any>;
}

export interface FlightBooking extends BookingDetails {
  type: 'flight';
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: Date;
  };
  arrival: {
    airport: string;
    time: Date;
  };
  seatNumber?: string;
  class: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface HotelBooking extends BookingDetails {
  type: 'hotel';
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  roomType: string;
  guests: number;
  address?: string;
}

export interface CarRentalBooking extends BookingDetails {
  type: 'car';
  vendor: string;
  carModel: string;
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: Date;
  returnDate: Date;
}

export interface ActivityBooking extends BookingDetails {
  type: 'activity';
  activityName: string;
  location: string;
  duration?: number;
  participants: number;
  scheduledTime?: Date;
}