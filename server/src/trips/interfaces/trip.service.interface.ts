import { Trip, User } from '@shared/schema';

// A DTO for the transformed corporate trip data
export interface CorporateTripDto {
  id: number;
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
  getTripsByUserId(userId: string, orgId: number): Promise<Trip[]>;
  getCorporateTrips(orgId: number): Promise<CorporateTripDto[]>;
  getTripById(tripId: number, user: User): Promise<Trip | null>;
}
