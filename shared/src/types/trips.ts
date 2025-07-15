import { BaseModel, PaginationParams, PaginatedResponse } from './base.js';

export type TripStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type TripVisibility = 'private' | 'team' | 'public';

export interface Trip extends BaseModel {
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: TripStatus;
  visibility: TripVisibility;
  userId: number | string;
  organizationId: number | string;
  destination?: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
  budget?: number | null;
  currency?: string;
  timezone?: string;
  isBusiness: boolean;
  isInternational: boolean;
}

export interface TripCreateInput
  extends Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'status' | 'userId' | 'organizationId'> {
  activities?: Omit<Activity, 'id' | 'tripId' | 'created_at' | 'updated_at'>[];
  collaborators?: string[]; // Array of user emails or IDs
}

export interface TripUpdateInput extends Partial<TripCreateInput> {
  id: string | number;
}

export interface TripListParams extends PaginationParams {
  status?: TripStatus | TripStatus[];
  userId?: number | string;
  organizationId?: number | string;
  startDateFrom?: Date | string;
  startDateTo?: Date | string;
  search?: string;
  tags?: string[];
  isBusiness?: boolean;
  isInternational?: boolean;
}

export type TripListResponse = PaginatedResponse<Trip>;

export interface ActivityType {
  id: string | number;
  name: string;
  icon?: string;
  color?: string;
  isCustom: boolean;
  userId?: number | string;
  organizationId?: number | string;
}

export interface Activity extends BaseModel {
  tripId: number | string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  typeId?: number | string | null;
  type?: ActivityType | null;
  location?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cost?: number | null;
  currency?: string;
  notes?: string | null;
  isFlexible: boolean;
  isBooked: boolean;
  bookingId?: string | null;
  metadata?: Record<string, unknown>;
}
