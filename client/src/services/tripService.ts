import { ApiClient } from '@/services/api/apiClient';
import { GeneratedTrip } from '@/lib/types';

const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
});

export interface GenerateTripParams {
  prompt: string;
  conversationId?: string;
}

export interface CreateClientItineraryParams {
  tripData: GeneratedTrip;
  clientEmail: string;
}

class TripService {
  private static instance: TripService;

  private constructor() {}

  public static getInstance(): TripService {
    if (!TripService.instance) {
      TripService.instance = new TripService();
    }
    return TripService.instance;
  }

  public async generateTrip(params: GenerateTripParams): Promise<GeneratedTrip> {
    const response = await apiClient.post<GeneratedTrip>('/trips/generate', params);
    return response.data;
  }

  public async createClientItinerary(params: CreateClientItineraryParams): Promise<{ trackingCode: string }> {
    const response = await apiClient.post<{ trackingCode: string }>('/client-itineraries', params);
    return response.data;
  }

  public async getTripByTrackingCode(trackingCode: string): Promise<GeneratedTrip> {
    const response = await apiClient.get<GeneratedTrip>(`/trips/track/${trackingCode}`);
    return response.data;
  }

  /**
   * Generate a public share URL for a client itinerary using its tracking code.
   * The backend should return an object: { share_url: string }
   */
  public async shareTripWithClient(trackingCode: string): Promise<{ share_url: string }> {
    const response = await apiClient.post<{ share_url: string }>(
      '/client-itineraries/share',
      { trackingCode }
    );
    return response.data;
  }

  /**
   * Update the status of a trip. The backend endpoint is assumed to be
   * PATCH /trips/{tripId}/status with body { status: string }
   */
  public async updateTripStatus(tripId: string, status: string): Promise<void> {
    await apiClient.patch(`/trips/${tripId}/status`, { status });
  }
}

export const tripService = TripService.getInstance();
