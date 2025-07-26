import * as tripSchema from '../../db/tripSchema';
import * as schema from '../../db/schema';

// A DTO for the transformed corporate trip data
export interface CorporateTripDto {
  id: string; // Changed from number to string to match UUID
  title: string;
  startDate: string;
  endDate: string;
  userId: string;
  city: string | null;
  country: string | null;
  budget: number | null;
  completed: boolean;
  trip_type: 'business' | 'leisure' | 'bleisure' | null;
  client_name: string | null;
  project_type: string | null;
  userName: string;
  userEmail: string;
}

export interface TripService {
  getTripsByUserId(userId: string, orgId: string): Promise<tripSchema.Trip[]>;
  getCorporateTrips(orgId: string): Promise<CorporateTripDto[]>;
  getTripById(tripId: string, user: schema.User): Promise<tripSchema.Trip | null>;
}

