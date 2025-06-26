import apiClient from './api/apiClient';
import { TripDTO } from '@/types/dtos/trip';
export interface GenerateTripParams {
    prompt: string;
    conversationId?: string;
}
export interface CreateClientItineraryParams {
    tripData: TripDTO;
    clientEmail: string;
}
class TripService {
    private static instance: TripService;
    private constructor() { }
    public static getInstance(): TripService {
        if (!TripService.instance) {
            TripService.instance = new TripService();
        }
        return TripService.instance;
    }
    public async generateTrip(params: GenerateTripParams): Promise<TripDTO> {
        const response = await apiClient.post<TripDTO>('/trips/generate', params);
        return response;
    }
    public async createClientItinerary(params: CreateClientItineraryParams): Promise<{
        trackingCode: string;
    }> {
        return apiClient.post<{
            trackingCode: string;
        }>('/client-itineraries', params);
    }
    public async getTripByTrackingCode(trackingCode: string): Promise<TripDTO> {
        return apiClient.get<TripDTO>(`/trips/track/${trackingCode}`);
    }
    /**
     * Generate a public share URL for a client itinerary using its tracking code.
     * The backend should return an object: { share_url: string }
     */
    public async shareTripWithClient(trackingCode: string): Promise<{
        share_url: string;
    }> {
        return apiClient.post<{
            share_url: string;
        }>('/client-itineraries/share', { trackingCode });
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
