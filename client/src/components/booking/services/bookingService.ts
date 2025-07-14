import { apiClientV2 } from '@/services/api/apiClientV2';
import { 
  FlightSearchParams, 
  FlightSearchResponse,
  Flight as FlightType
} from '../types/flight';
import { 
  HotelSearchParams,
  HotelSearchResponse,
  Hotel as HotelType
} from '../types/hotel';

// Local type definitions
export interface BookingDetails {
  id: string;
  userId: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  bookingDate: string;
  totalAmount: number;
  currency: string;
  paymentStatus: 'paid' | 'unpaid';
  flights?: FlightType[];
  hotels?: HotelType[];
  activities?: any[];
}

export interface BookingData {
  type: 'flight' | 'hotel' | 'activity';
  tripId?: string;
  userId?: string;
  flightDetails?: {
    flightNumber: string;
    airline: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
    origin: string;
    destination: string;
    passengers: number;
    price: number;
  };
  hotelDetails?: {
    hotelName: string;
    location: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    guests: number;
    price: number;
  };
  activityDetails?: {
    name: string;
    date: string;
    time: string;
    location: string;
    participants: number;
    price: number;
  };
  paymentDetails?: {
    method: string;
    cardLastFour?: string;
    totalAmount: number;
    currency: string;
  };
}

// Interface for booking data to replace 'any' type
export interface BookingData {
  type: 'flight' | 'hotel' | 'activity';
  tripId?: string;
  userId?: string;
  flightDetails?: {
    flightNumber: string;
    airline: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
    origin: string;
    destination: string;
    passengers: number;
    price: number;
  };
  hotelDetails?: {
    hotelName: string;
    location: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    guests: number;
    price: number;
  };
  activityDetails?: {
    name: string;
    date: string;
    time: string;
    location: string;
    participants: number;
    price: number;
  };
  paymentDetails?: {
    method: string;
    cardLastFour?: string;
    totalAmount: number;
    currency: string;
  };
}

class BookingService {
  private static instance: BookingService;

  private constructor() {}

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  // Flight Search
  public async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    try {
      // Define the API response type
      interface ApiResponse {
        data: {
          flights: FlightType[];
          metadata: {
            currency: string;
            totalResults: number;
            filteredResults: number;
          };
        };
      }
      
      // Make the API call with the proper type
      const response = await apiClientV2.post<ApiResponse>('/api/flights/search', params);
      
      // Extract the flights and metadata from the response
      const flights = response.data.flights || [];
      const metadata = response.data.metadata || {
        currency: 'USD',
        totalResults: flights.length,
        filteredResults: flights.length
      };
      
      // Transform the API response to match FlightSearchResponse structure
      const flightSearchResponse: FlightSearchResponse = {
        success: true,
        data: {
          flights: flights,
          metadata: metadata
        },
        error: undefined
      };
      
      return flightSearchResponse;
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
    }
  }

  // Hotel Search
  public async searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
    try {
      const response = await apiClientV2.post<{
        hotels: HotelType[];
        pagination: {
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
        metadata: {
          currency: string;
          destination: string;
          checkIn: string;
          checkOut: string;
          guests: number;
        };
      }>('/api/hotels/search', params);

      return {
        success: true,
        data: {
          hotels: response.hotels,
          pagination: response.pagination,
          metadata: {
            currency: response.metadata.currency,
            destination: response.metadata.destination,
            checkIn: response.metadata.checkIn,
            checkOut: response.metadata.checkOut,
            guests: response.metadata.guests
          }
        }
      };
    } catch (error: unknown) {
      console.error('Error searching hotels:', error);
      return {
        success: false,
        data: { 
          hotels: [],
          pagination: {
            total: 0,
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            totalPages: 0
          },
          metadata: { 
            currency: 'USD',
            destination: '',
            checkIn: new Date().toISOString(),
            checkOut: new Date(Date.now() + 86400000).toISOString(),
            guests: 1
          } 
        },
        error: { 
          code: 'HOTEL_SEARCH_ERROR', 
          message: error instanceof Error ? error.message : 'An unknown error occurred while searching for hotels'
        }
      };
    }
  }

  // Create Booking
  public async createBooking(bookingData: BookingData): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      const response = await apiClientV2.post<{
        data: any; bookingId: string 
}>('/api/bookings', bookingData);
      return { success: true, bookingId: response.data.bookingId };
    } catch (error: unknown) {
      console.error('Error creating booking:', error);
      // Type guard for axios error with response property
      const axiosError = error as { response?: { data?: { message?: string } } };
      return { 
        success: false, 
        error: axiosError.response?.data?.message || 'Failed to create booking' 
      };
    }
  }

  // Get Booking Details
  public async getBooking(bookingId: string): Promise<BookingDetails> {
    try {
      const response = await apiClientV2.get<{ data: BookingDetails }>(`/api/bookings/${bookingId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching booking:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch booking: ${error.message}`);
      }
      throw new Error('Failed to fetch booking');
    }
  }

  // Cancel Booking
  public async cancelBooking(bookingId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // The API client wraps the response in a data property
      interface ApiResponse<T> {
        success: boolean;
        data?: T;
        message?: string;
      }

      // The actual response data type
      interface CancelBookingResponse {
        success: boolean;
        message?: string;
      }

      // Make the API call with proper typing
      const response = await apiClientV2.post<ApiResponse<CancelBookingResponse>>(
        `/api/bookings/${bookingId}/cancel`
      );
      
      // If the API call itself failed
      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel booking');
      }
      
      // If we have data but the operation wasn't successful
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || 'Failed to cancel booking');
      }
      
      return {
        success: true,
        message: response.data?.message || 'Booking cancelled successfully'
      };
    } catch (error: unknown) {
      console.error('Error cancelling booking:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to cancel booking: ${error.message}`);
      }
      throw new Error('Failed to cancel booking due to an unknown error');
    }
  }
}

export const bookingService = BookingService.getInstance();
