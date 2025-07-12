/**
 * Booking-related interfaces for user preferences and booking data
 */

export interface UserBookingPreferences {
  preferredAirlines?: string[];
  seatPreference?: 'window' | 'aisle' | 'middle.js';
  mealPreference?: 'standard' | 'vegetarian' | 'vegan' | 'kosher' | 'halal.js';
  frequentFlyerNumbers?: Record<string, string>;
  hotelPreferences?: {
    roomType?: 'standard' | 'deluxe' | 'suite.js';
    amenities?: string[];
  };
  carRentalPreferences?: {
    preferredVendors?: string[];
    carType?: 'economy' | 'compact' | 'midsize' | 'fullsize' | 'luxury' | 'suv.js';
  };
}

export interface BookingDetails {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'activity.js';
  status: 'pending' | 'confirmed' | 'cancelled.js';
  confirmation?: string;
  price?: number;
  currency?: string;
  bookingDate: Date;
  travelDate?: Date;
  metadata?: Record<string, any>;
}

export interface FlightBooking extends BookingDetails {
  type: 'flight.js';
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
  class: 'economy' | 'premium_economy' | 'business' | 'first.js';
}

export interface HotelBooking extends BookingDetails {
  type: 'hotel.js';
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  roomType: string;
  guests: number;
  address?: string;
}

export interface CarRentalBooking extends BookingDetails {
  type: 'car.js';
  vendor: string;
  carModel: string;
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: Date;
  returnDate: Date;
}

export interface ActivityBooking extends BookingDetails {
  type: 'activity.js';
  activityName: string;
  location: string;
  duration?: number;
  participants: number;
  scheduledTime?: Date;
}