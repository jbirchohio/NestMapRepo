import type { Address, ContactInfo } from './common';

export interface HotelAmenity {
  code: string;
  name: string;
  category: string;
  description?: string;
  isAvailable: boolean;
}

export interface HotelRoom {
  id: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedConfiguration: string;
  amenities: string[];
  price: {
    amount: number;
    currency: string;
    formatted: string;
    taxes: number;
    fees: number;
    baseRate: number;
    total: number;
  };
  cancellationPolicy?: {
    type: 'FREE_CANCELLATION' | 'NON_REFUNDABLE' | 'PARTIAL_REFUND';
    description: string;
    deadline?: string;
    penaltyAmount?: number;
    penaltyCurrency?: string;
  };
  ratePlan: {
    id: string;
    name: string;
    mealPlan?: string;
    nonSmoking: boolean;
    refundable: boolean;
    available: number;
  };
  images: Array<{
    url: string;
    caption?: string;
    category: string;
    width?: number;
    height?: number;
  }>;
}

export interface Hotel {
  id: string;
  name: string;
  starRating: number;
  address: Address;
  description: string;
  amenities: HotelAmenity[];
  images: Array<{
    url: string;
    caption?: string;
    category: string;
    width?: number;
    height?: number;
  }>;
  checkInTime: string;
  checkOutTime: string;
  contact: ContactInfo;
  chain?: {
    id: string;
    name: string;
  };
  rooms: HotelRoom[];
  policies: {
    checkIn: {
      minAge: number;
      specialInstructions?: string;
    };
    checkOut: {
      lateCheckOutAvailable: boolean;
      lateCheckOutFee?: number;
      lateCheckOutTime?: string;
    };
    pets: {
      allowed: boolean;
      fee?: number;
      policy?: string;
    };
    fees: Array<{
      type: string;
      amount: number;
      currency: string;
      description: string;
      mandatory: boolean;
    }>;
  };
  distanceFrom: Array<{
    place: string;
    distance: number;
    unit: 'km' | 'mi';
    duration?: number;
  }>;
  metadata?: Record<string, unknown>;
  rating?: number;
  price?: {
    amount: number;
    currency: string;
    formatted: string;
  };
  reviewScore?: number;
  reviewCount?: number;
  isRefundable?: boolean;
  isAvailable?: boolean;
  pricePerNight?: number;
  totalPrice?: number;
  cancellationPolicy?: string;
  distanceFromCenter?: number;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  adults?: number;
  children?: number;
  childrenAges?: number[];
  sortBy?: 'price' | 'rating' | 'distance' | 'recommended';
  priceMin?: number;
  priceMax?: number;
  stars?: number[];
  amenities?: string[];
  chain?: string;
  searchAfter?: string;
  page?: number;
  limit?: number;
}

export interface HotelSearchResponse {
  data: Hotel[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  searchParams: HotelSearchParams;
}

export type HotelFilterOptions = {
  priceRange: [number, number];
  starRating: number[];
  amenities: string[];
  propertyTypes: string[];
  reviewScore: number;
  distance: number;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  refundable: boolean;
};
