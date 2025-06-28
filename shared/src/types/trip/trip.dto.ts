import type { Trip as SharedTrip, NewTrip } from '../../schema.js';

/**
 * Data Transfer Object for creating a new trip
 */
export interface CreateTripDTO extends Omit<NewTrip, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'sharingEnabled' | 'completed' | 'completedAt'> {
  title: string;
  startDate: string;
  endDate: string;
  organizationId: string;
  isPublic: boolean;
  sharePermission: 'view' | 'edit' | 'admin';
}

/**
 * Data Transfer Object for updating an existing trip
 */
export interface UpdateTripDTO extends Partial<Omit<SharedTrip, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'createdBy' | 'updatedBy' | 'sharingEnabled' | 'completed' | 'shareCode'>> {
  title?: string;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  isPublic?: boolean;
  sharePermission?: 'view' | 'edit' | 'admin';
  // Allow additional properties
  [key: string]: unknown;
}

/**
 * Data Transfer Object for trip query parameters
 */
export interface TripQueryParams {
  status?: string[];
  limit?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  [key: string]: unknown; // Allow additional filter params
}
