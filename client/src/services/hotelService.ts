import { ApiClient } from './api/apiClient';
import { Hotel, HotelSearchParams, RoomType } from '@/components/booking/types';

interface HotelSearchResponse {
  data: Hotel[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export const hotelService = {
  /**
   * Search for hotels based on search parameters
   */
  async searchHotels(params: HotelSearchParams): Promise<Hotel[]> {
    try {
      const response = await ApiClient.post<HotelSearchResponse>('/hotels/search', params);
      return response.data.data;
    } catch (error) {
      console.error('Error searching hotels:', error);
      throw new Error('Failed to search for hotels. Please try again later.');
    }
  },

  /**
   * Get hotel details by ID
   */
  async getHotelById(hotelId: string): Promise<Hotel> {
    try {
      const response = await ApiClient.get<{ data: Hotel }>(`/hotels/${hotelId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching hotel ${hotelId}:`, error);
      throw new Error('Failed to fetch hotel details. Please try again later.');
    }
  },

  /**
   * Get available room types for a hotel
   */
  async getAvailableRooms(
    hotelId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<RoomType[]> {
    try {
      const response = await ApiClient.get<{ data: RoomType[] }>(
        `/hotels/${hotelId}/rooms`,
        {
          params: { checkIn, checkOut, guests },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching rooms for hotel ${hotelId}:`, error);
      throw new Error('Failed to fetch available rooms. Please try again later.');
    }
  },

  /**
   * Book a room
   */
  async bookRoom(
    hotelId: string,
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    travelerInfo: any // TODO: Define proper type
  ): Promise<{ bookingId: string; confirmationNumber: string }> {
    try {
      const response = await ApiClient.post<{
        data: { bookingId: string; confirmationNumber: string };
      }>('/bookings', {
        hotelId,
        roomTypeId,
        checkIn,
        checkOut,
        guests,
        travelerInfo,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error booking room:', error);
      throw new Error('Failed to book room. Please try again later.');
    }
  },

  /**
   * Get booking details by ID
   */
  async getBookingDetails(bookingId: string) {
    try {
      const response = await ApiClient.get(`/bookings/${bookingId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching booking ${bookingId}:`, error);
      throw new Error('Failed to fetch booking details. Please try again later.');
    }
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    try {
      await apiClient.delete(`/bookings/${bookingId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error cancelling booking ${bookingId}:`, error);
      throw new Error('Failed to cancel booking. Please try again later.');
    }
  },
};
