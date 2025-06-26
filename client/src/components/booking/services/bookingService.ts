import { apiClient } from '@/services/api/apiClient';
import { FlightSearchParams, FlightSearchResponse, HotelSearchParams, HotelSearchResponse, BookingDetails, } from '../types';
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
            return await apiClient.post<FlightSearchResponse>('/flights/search', params);
        } catch (error) {
            console.error('Error searching flights:', error);
            throw error;
        }
    }
    // Hotel Search
    public async searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
        try {
            return await apiClient.post<HotelSearchResponse>('/hotels/search', params);
        } catch (error) {
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
            const response = await apiClient.post<{ bookingId: string }>('/bookings', bookingData);
            return {
                success: true,
                bookingId: response.bookingId
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to create booking'
            };
        }
    }
    // Get Booking Details
    public async getBooking(bookingId: string) {
        try {
            return await apiClient.get<BookingDetails>(`/bookings/${bookingId}`);
        } catch (error) {
            console.error(`Error fetching booking ${bookingId}:`, error);
            throw error;
        }
    }
    // Cancel Booking
    public async cancelBooking(bookingId: string) {
        try {
            return await apiClient.post(`/bookings/${bookingId}/cancel`);
        } catch (error) {
            console.error(`Error cancelling booking ${bookingId}:`, error);
            throw error;
        }
    }
}
export const bookingService = BookingService.getInstance();
