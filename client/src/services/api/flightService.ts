import { apiClient } from './apiClient';
import type { Flight, FlightSearchParams } from '@shared/types/flight';

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
    const response = await apiClient.post('/api/flights/bookings', {
      offer_id: offerId,
      ...passengerDetails
    });
    return response.data;
  },
  
  async getAirports(query: string) {
    const response = await apiClient.get(`/api/airports?query=${encodeURIComponent(query)}`);
    return response.data;
  }
};

export default flightService;
