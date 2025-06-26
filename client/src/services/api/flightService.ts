import { ApiClient } from './apiClient';
import type { Flight, FlightSearchParams, Airport } from '@shared/types/flight';

// Create an instance of ApiClient
const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
});

export const flightService = {
  async searchFlights(params: FlightSearchParams): Promise<Flight[]> {
    const response = await apiClient.post<{ data: Flight[] }>('/api/flights/search', params);
    return response.data;
  },
  
  async getFlightOffers(params: FlightSearchParams): Promise<Flight[]> {
    const response = await apiClient.post<{ data: Flight[] }>('/api/flights/offers', params);
    return response.data;
  },
  
  async createFlightBooking(offerId: string, passengerDetails: any) {
    const response = await apiClient.post<{ 
      data: { 
        bookingId: string; 
        status: string;
        // Add other fields from your API response
      } 
    }>('/api/flights/bookings', {
      offer_id: offerId,
      ...passengerDetails
    });
    return response.data;
  },
  
  async getAirports(query: string): Promise<Airport[]> {
    const response = await apiClient.get<{ data: Airport[] }>(`/api/airports?query=${encodeURIComponent(query)}`);
    return response.data;
  }
};

export default flightService;
