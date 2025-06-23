import { apiClientV2 } from '@/services/api/apiClientV2';
import { FlightSearchParams, FlightSearchResponse, HotelSearchParams, HotelSearchResponse, BookingDetails, } from '../types.ts';
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
    private constructor() { }
    public static getInstance(): BookingService {
        if (!BookingService.instance) {
            BookingService.instance = new BookingService();
        }
        return BookingService.instance;
    }
    // Flight Search
    public async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
        try {
            const response = await apiClientV2.post<FlightSearchResponse>('/api/flights/search', params);
            return response.data;
        }
        catch (error) {
            console.error('Error searching flights:', error);
            throw error;
        }
    }
    // Hotel Search
    public async searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
        try {
            const response = await apiClientV2.post<HotelSearchResponse>('/api/hotels/search', params);
            return response.data;
        }
        catch (error) {
            console.error('Error searching hotels:', error);
            throw error;
        }
    }
    // Create Booking
    public async createBooking(bookingData: BookingData): Promise<{
        success: boolean;
        bookingId?: string;
        error?: string;
    }> {
        try {
            const response = await apiClientV2.post('/api/bookings', bookingData);
            return { success: true, bookingId: response.data.bookingId };
        }
        catch (error: unknown) {
            console.error('Error creating booking:', error);
            // Type guard for axios error with response property
            const axiosError = error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };
            return {
                success: false,
                error: axiosError.response?.data?.message || 'Failed to create booking'
            };
        }
    }
    // Get Booking Details
    public async getBooking(bookingId: string) {
        try {
            const response = await apiClientV2.get(`/api/bookings/${bookingId}`);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching booking:', error);
            throw error;
        }
    }
    // Cancel Booking
    public async cancelBooking(bookingId: string) {
        try {
            const response = await apiClientV2.post(`/api/bookings/${bookingId}/cancel`);
            return response.data;
        }
        catch (error) {
            console.error('Error cancelling booking:', error);
            throw error;
        }
    }
}
export const bookingService = BookingService.getInstance();
