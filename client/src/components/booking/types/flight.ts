export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface FlightSegment {
  id: string;
  departure: {
    airport: Airport;
    time: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: Airport;
    time: string;
    terminal?: string;
    gate?: string;
  };
  carrier: {
    code: string;
    name: string;
    logoUrl?: string;
  };
  flightNumber: string;
  aircraft: {
    code: string;
    name: string;
  };
  duration: number; // in minutes
  cabin: 'economy' | 'premium-economy' | 'business' | 'first';
  bookingClass: string;
  fareBasis: string;
  operatingCarrier?: {
    code: string;
    flightNumber: string;
  };
  technicalStops: Array<{
    airport: string;
    duration: number;
    arrivalTime: string;
    departureTime: string;
  }>;
}

export interface FlightPrice {
  amount: number;
  currency: string;
  formatted: string;
  taxes: number;
  fees: number;
  baseFare: number;
}

export interface Flight {
  id: string;
  type: 'departure' | 'return';
  segments: FlightSegment[];
  price: FlightPrice;
  duration: number; // in minutes
  stops: number;
  departureTime: string;
  arrivalTime: string;
  bookingClass: string;
  fareBasis: string;
  baggageAllowance: {
    cabin: 'economy' | 'premium-economy' | 'business' | 'first';
    checked: string;
  };
  refundable: boolean;
  changeable: boolean;
  availableSeats: number;
  amenities: string[];
  metadata?: Record<string, unknown>;
  // Optional fields used by simplified UI components
  airline?: string;
  flightNumber?: string;
  cabin?: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabin: 'economy' | 'premium-economy' | 'business' | 'first';
  directOnly?: boolean;
  maxStops?: number;
  maxPrice?: number;
  preferredAirlines?: string[];
  preferredStops?: string[];
  nonStop?: boolean;
}

export interface FlightSearchResponse {
  success: boolean;
  data: {
    flights: Flight[];
    metadata: {
      currency: string;
      totalResults: number;
      filteredResults: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HotelSearchParams {
  destination: string | { latitude: number; longitude: number };
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children?: number;
    rooms?: number;
  };
  filters?: {
    minStarRating?: number;
    priceRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    amenities?: string[];
    hotelChains?: string[];
  };
}

import { Hotel } from './hotel';

export interface HotelSearchResponse {
  success: boolean;
  data: {
    hotels: Hotel[];
    metadata: {
      currency: string;
      totalResults: number;
      filteredResults: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
