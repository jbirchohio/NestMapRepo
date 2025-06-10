import { apiClient } from './apiClient.js';
import type { 
  TripDTO, 
  CreateTripDTO, 
  UpdateTripDTO, 
  GetTripsParams, 
  TripsResponse,
  TripCardDTO
} from '../../types/dtos/trip.js';
import type { RequestConfig } from './types.js';

class TripService {
  private static instance: TripService;
  private basePath = '/trips';

  private constructor() {}

  public static getInstance(): TripService {
    if (!TripService.instance) {
      TripService.instance = new TripService();
    }
    return TripService.instance;
  }

  // Get all trips with filtering and pagination
  public async getTrips(params?: GetTripsParams, config?: RequestConfig): Promise<TripsResponse> {
    return apiClient.get<TripsResponse>(this.basePath, { ...config, params });
  }

  // Get a single trip by ID
  public async getTripById(id: string, config?: RequestConfig): Promise<TripDTO> {
    return apiClient.get<TripDTO>(`${this.basePath}/${id}`, config);
  }

  // Create a new trip
  public async createTrip(tripData: CreateTripDTO, config?: RequestConfig): Promise<TripDTO> {
    return apiClient.post<TripDTO, CreateTripDTO>(this.basePath, tripData, config);
  }

  // Update an existing trip
  public async updateTrip(id: string, updates: UpdateTripDTO, config?: RequestConfig): Promise<TripDTO> {
    return apiClient.put<TripDTO, UpdateTripDTO>(`${this.basePath}/${id}`, updates, config);
  }

  // Delete a trip
  public async deleteTrip(id: string, config?: RequestConfig): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`, config);
  }

  // Get trips for the dashboard (simplified data)
  public async getDashboardTrips(params?: {
    limit?: number;
    [key: string]: any;
    status?: string[];
  }): Promise<TripCardDTO[]> {
    return apiClient.get<TripCardDTO[]>(`${this.basePath}/dashboard`, { params });
  }

  // Get corporate trips (for corporate users)
  public async getCorporateTrips(params?: Omit<GetTripsParams, 'organizationId'>): Promise<TripsResponse> {
    return apiClient.get<TripsResponse>('/corporate/trips', { params });
  }
}

export const tripService = TripService.getInstance();
