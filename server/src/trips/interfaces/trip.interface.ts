import { Trip as PrismaTrip } from '@prisma/client';
import { User } from '@shared/schema/types/auth';

export interface Trip extends Omit<PrismaTrip, 'createdAt' | 'updatedAt'> {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  organizationId: string;
  createdById: string;
  updatedById: string | null;
  metadata: Record<string, unknown>;
  coverImageUrl?: string | null;
  isPublic: boolean;
}

export interface CreateTripDto {
  title: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
  organizationId: string;
  createdById: string;
  metadata?: Record<string, unknown>;
  coverImageUrl?: string;
  isPublic?: boolean;
}

export interface UpdateTripDto extends Partial<Omit<CreateTripDto, 'organizationId' | 'createdById'>> {}

export interface TripFilterOptions {
  status?: string;
  organizationId?: string;
  createdById?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
