import { TripStatus, UserRole } from '@prisma/client';

/**
 * Represents the user associated with a trip, containing only public information.
 */
export interface TripUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: UserRole;
}

/**
 * Represents the core Trip domain entity.
 */
export interface Trip {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  destination?: string;
  status: TripStatus;
  isBusiness: boolean;
  budget?: number;
  currency: string;
  notes?: string;
  tags: string[];
  isRecurring: boolean;
  recurrencePattern?: string;
  parentTripId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: TripUser;
  // Optional metadata for fields not in the core schema
  metadata?: Record<string, any>;
}
