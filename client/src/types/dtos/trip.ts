import { Timestamp, PaginationParams, PaginatedResponse, TripStatus } from './common';

export interface TripDTO {
  id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: TripStatus;
  budget?: number;
  userId: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Additional fields based on your domain
  clientName?: string;
  isBusinessTrip?: boolean;
  tags?: string[];
  thumbnailUrl?: string;
}

export interface CreateTripDTO extends Omit<TripDTO, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  status?: TripStatus; // Optional with default on the server
}

export interface UpdateTripDTO extends Partial<Omit<CreateTripDTO, 'userId' | 'organizationId'>> {
  // Can update most fields, but not the IDs
}

export interface GetTripsParams extends PaginationParams {
  userId?: string;
  organizationId?: string;
  status?: TripStatus | TripStatus[];
  startDateFrom?: Timestamp;
  startDateTo?: Timestamp;
  search?: string;
  tags?: string[];
}

export type TripsResponse = PaginatedResponse<TripDTO>;

// For the dashboard, we might want a simplified version of trips
export interface TripCardDTO {
  id: string;
  title: string;
  destination: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: TripStatus;
  thumbnailUrl?: string;
  daysUntilStart: number;
  isUpcoming: boolean;
  isActive: boolean;
}
