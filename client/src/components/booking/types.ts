import { BookingWorkflowProps } from './BookingWorkflow';

export type BookingStep = 'client-info' | 'flights' | 'hotels' | 'confirmation';

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

export { BookingWorkflowProps };
