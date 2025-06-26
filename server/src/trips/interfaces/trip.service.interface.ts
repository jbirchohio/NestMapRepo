import type { Trip } from '../../../db/schema.js';

// Define the ServiceUser interface to match what the controller provides
export interface ServiceUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: string | null;
  role: string;
  passwordHash: string;
  passwordChangedAt: Date | null;
  tokenVersion: number;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date | null;
  isActive?: boolean;
  emailVerified?: boolean;
}
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
    getTripsByUserId(userId: string, orgId: string, user: ServiceUser): Promise<Trip[]>;
    getCorporateTrips(orgId: string, user: ServiceUser): Promise<CorporateTripDto[]>;
    getTripById(tripId: string, user: ServiceUser): Promise<Trip | null>;
}
