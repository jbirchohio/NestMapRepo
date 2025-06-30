import type { AuthUser } from '@shared/types/auth/user.js';
import type { 
  Trip, 
  CreateTripDto, 
  UpdateTripDto, 
  TripFilterOptions, 
  PaginatedResult, 
  PaginationOptions 
} from './trip.interface.js';

// A DTO for the transformed corporate trip data
export interface CorporateTripDto {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  userId: string;
  city: string | null;
  country: string | null;
  budget: number | null;
  completed: boolean;
  tripType: 'business' | 'leisure' | 'bleisure' | null;
  clientName: string | null;
  projectType: string | null;
  userName: string;
  userEmail: string;
}

export interface TripService {
  // Get trips for a specific user
  getTripsByUserId(
    userId: string, 
    orgId: string, 
    status?: string,
    pagination?: PaginationOptions
  ): Promise<Trip[]>;

  // Get trips for an organization (admin/manager only)
  getTripsByOrganizationId(
    orgId: string, 
    status?: string,
    pagination?: PaginationOptions
  ): Promise<Trip[]>;

  // Get corporate trips (filtered view for business users)
  getCorporateTrips(orgId: string): Promise<CorporateTripDto[]>;
  
  // Get a single trip by ID with access control
  getTripById(tripId: string, user: AuthUser): Promise<Trip | null>;
  
  // Create a new trip
  createTrip(createTripDto: CreateTripDto): Promise<Trip>;
  
  // Update an existing trip
  updateTrip(
    tripId: string, 
    updateTripDto: UpdateTripDto, 
    user: AuthUser
  ): Promise<Trip>;
  
  // Delete a trip
  deleteTrip(tripId: string, user: AuthUser): Promise<boolean>;
  
  // Check if a user has access to a trip
  checkTripAccess(tripId: string, user: AuthUser): Promise<boolean>;
  
  // Search trips with filters and pagination
  searchTrips(
    filters: TripFilterOptions,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Trip>>;
}
