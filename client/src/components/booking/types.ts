export type BookingStep = 'client-info' | 'flights' | 'hotels' | 'confirmation';

export interface FlightSearchResponse {
  success: boolean;
  data: {
    flights: Array<{
      id: string;
      airline: string;
      flightNumber: string;
      departure: {
        airport: string;
        time: string;
      };
      arrival: {
        airport: string;
        time: string;
      };
      price: number;
      duration: number;
      stops: number;
    }>;
  };
  error?: string;
}

export interface HotelSearchResponse {
  success: boolean;
  data: {
    hotels: Hotel[];
    total: number;
    filters: {
      minPrice: number;
      maxPrice: number;
      amenities: string[];
      starRatings: number[];
    };
  };
  error?: string;
}

export interface BookingDetails {
  id: string;
  type: 'flight' | 'hotel' | 'package';
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  bookingReference: string;
  totalPrice: number;
  currency: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  travelerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  flightDetails?: any; // Replace with more specific type if needed
  hotelDetails?: any;   // Replace with more specific type if needed
  cancellationPolicy?: {
    canCancel: boolean;
    freeCancellationUntil?: string;
    penaltyAmount?: number;
    refundPercentage?: number;
  };
}

export interface TravelerInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: number;
  cabin: 'economy' | 'premium' | 'business' | 'first';
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface HotelFilterOptions {
  minStarRating: number;
  priceRange: PriceRange;
  amenities: string[];
  freeCancellation: boolean;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  filters?: Partial<HotelFilterOptions>;
}

export interface HotelImage {
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface HotelAmenity {
  id: string;
  name: string;
  category: string;
}

export interface RoomType {
  id: string;
  name: string;
  maxOccupancy: number;
  bedType: string;
  price: number;
  available: number;
  refundable: boolean;
  amenities: string[];
}

export interface Hotel {
  id: string;
  name: string;
  description: string;
  starRating: number;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  images: HotelImage[];
  amenities: HotelAmenity[];
  roomTypes: RoomType[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  cancellationPolicy: string;
  reviewScore?: number;
  reviewCount?: number;
  distanceFromCenter?: number;
  isRefundable: boolean;
  isAvailable: boolean;
}

export interface BookingFormData extends Omit<FlightSearchParams, 'passengers' | 'cabin'>, Omit<HotelSearchParams, 'guests' | 'rooms'> {
  tripType: 'one-way' | 'round-trip' | 'multi-city';
  passengers: number;
  primaryTraveler: TravelerInfo & { email: string; phone: string };
  additionalTravelers: TravelerInfo[];
  cabin: 'economy' | 'premium' | 'business' | 'first';
  budget?: number;
  department: string;
  projectCode: string;
  costCenter: string;
  selectedFlight?: any; // TODO: Add proper flight type
  selectedHotel?: Hotel;
  selectedRoomType?: RoomType;
}

export interface HotelSelectionProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data?: Partial<BookingFormData>) => void;
  onHotelSelect?: (hotel: Hotel, roomType: RoomType) => void;
}

export interface StepComponentProps {
  formData: BookingFormData;
  onChange?: (data: Partial<BookingFormData>) => void;
  onSubmit?: (data: BookingFormData) => void;
  onBack?: () => void;
  onNext?: () => void;
  onConfirm?: () => void;
}
