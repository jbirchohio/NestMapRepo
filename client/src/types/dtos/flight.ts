import { Timestamp } from './common';

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface FlightSegment {
  id: string;
  departure: {
    airport: Airport;
    scheduledTime: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: Airport;
    scheduledTime: string;
    terminal?: string;
    gate?: string;
  };
  carrier: {
    code: string;
    name: string;
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
  cabinClass: 'economy' | 'premium' | 'business' | 'first';
  duration: number; // in minutes
  stops: number;
  stopDetails?: Array<{
    airport: Airport;
    arrivalTime: string;
    departureTime: string;
    duration: number;
  }>;
}

export interface FlightPrice {
  amount: number;
  currency: string;
  formatted: string;
  taxes: number;
  base: number;
  fees: number;
  totalAmount: number;
  baggageAllowance?: {
    cabin: string;
    checked: string;
  };
}

export interface Flight {
  id: string;
  segments: FlightSegment[];
  price: FlightPrice;
  duration: number; // in minutes
  stops: number;
  departureTime: string;
  arrivalTime: string;
  origin: Airport;
  destination: Airport;
  cabin: 'economy' | 'premium' | 'business' | 'first';
  availableSeats: number;
  bookingClass: string;
  fareBasis: string;
  fareRules?: string[];
  refundable: boolean;
  changeable: boolean;
  lastTicketingDate?: string;
  validatingAirline: string;
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
  maxStops?: number;
  maxPrice?: number;
  currency?: string;
  directOnly?: boolean;
  nonStop?: boolean;
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

export interface FlightBookingRequest {
  flightId: string;
  passengers: Array<{
    type: 'adult' | 'child' | 'infant';
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    passportNumber?: string;
    passportExpiry?: string;
    passportCountry?: string;
    nationality?: string;
    email: string;
    phone: string;
    frequentFlyerNumber?: string;
    specialAssistance?: string[];
    mealPreference?: string;
    seatPreference?: string;
  }>;
  contactInfo: {
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  payment: {
    method: 'credit_card' | 'paypal' | 'bank_transfer' | 'other';
    cardNumber?: string;
    cardHolder?: string;
    expiryDate?: string;
    cvv?: string;
    saveForFutureUse?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface FlightBookingResponse {
  bookingId: string;
  referenceNumber: string;
  status: 'confirmed' | 'pending' | 'failed' | 'cancelled';
  bookingDate: string;
  flights: Flight[];
  passengers: Array<{
    id: string;
    type: 'adult' | 'child' | 'infant';
    firstName: string;
    lastName: string;
    ticketNumber?: string;
    seatAssignment?: string;
  }>;
  price: FlightPrice & {
    taxes: number;
    fees: number;
    total: number;
    currency: string;
  };
  contactInfo: {
    email: string;
    phone: string;
  };
  payment: {
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    method: string;
    transactionId?: string;
  };
  cancellationPolicy?: {
    isRefundable: boolean;
    cancellationDeadline?: string;
    penaltyAmount?: number;
    penaltyCurrency?: string;
    notes?: string[];
  };
  baggageAllowance?: {
    cabin: string;
    checked: string;
    additionalInfo?: string;
  };
  checkInInfo?: {
    onlineCheckInAvailable: boolean;
    checkInOpens?: string;
    checkInCloses?: string;
    checkInUrl?: string;
  };
  documents?: Array<{
    type: 'eTicket' | 'receipt' | 'invoice' | 'boardingPass';
    url: string;
    name: string;
  }>;
  metadata?: Record<string, unknown>;
}
