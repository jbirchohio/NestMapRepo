import { ISO8601DateTime } from './core/base';

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
  terminal?: string;
  gate?: string;
}

export interface FlightSegment {
  id: string;
  departure: {
    airport: Airport;
    scheduledTime: ISO8601DateTime;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: Airport;
    scheduledTime: ISO8601DateTime;
    terminal?: string;
    gate?: string;
  };
  carrier: {
    code: string;
    name: string;
    logoUrl?: string;
  };
  operatingCarrier?: {
    code: string;
    name: string;
  };
  marketingCarrier?: {
    code: string;
    name: string;
  };
  flightNumber: string;
  aircraft?: {
    code: string;
    name: string;
  };
  cabin: 'economy' | 'premium' | 'business' | 'first';
  bookingClass?: string;
  fareBasis?: string;
  duration: number; // in minutes
  technicalStops?: Array<{
    airport: Airport;
    arrivalTime: ISO8601DateTime;
    departureTime: ISO8601DateTime;
    duration: number;
  }>;
}

export interface FlightPrice {
  amount: number;
  currency: string;
  formatted: string;
  taxes: number;
  fees: number;
  baseFare: number;
  baggageAllowance?: {
    cabin: string;
    checked: string;
  };
}

export interface Flight {
  id: string;
  type: 'departure' | 'return';
  segments: FlightSegment[];
  price: FlightPrice;
  duration: number; // in minutes
  stops: number;
  departureTime: ISO8601DateTime;
  arrivalTime: ISO8601DateTime;
  bookingClass?: string;
  fareBasis?: string;
  baggageAllowance?: {
    cabin: string;
    checked: string;
  };
  refundable: boolean;
  changeable: boolean;
  availableSeats?: number;
  amenities?: string[];
  metadata?: Record<string, unknown>;
  airline?: string;
  flightNumber?: string;
  cabin: 'economy' | 'premium' | 'business' | 'first';
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
  cabin?: 'economy' | 'premium' | 'business' | 'first';
  directOnly?: boolean;
  maxStops?: number;
  maxPrice?: number;
  currency?: string;
}

export interface FlightSearchResponse {
  data: Flight[];
  meta: {
    count: number;
    total: number;
    page: number;
    pageSize: number;
  };
  searchParams: FlightSearchParams;
  currency: string;
  searchId?: string;
}
