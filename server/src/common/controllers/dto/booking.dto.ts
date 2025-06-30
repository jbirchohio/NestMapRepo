import { z } from 'zod';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type BookingType = 'hotel' | 'flight' | 'car' | 'train' | 'activity' | 'other';

export interface BookingSearchParams {
  organizationId: string;
  status?: BookingStatus;
  type?: BookingType;
  search?: string;
  userId?: string;
  tripId?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

// Base booking schema that matches the database model
export const baseBookingSchema = z.object({
  id: z.string().uuid().optional(),
  reference: z.string(),
  type: z.enum(['hotel', 'flight', 'car', 'train', 'activity', 'other']),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  bookingDate: z.string().datetime(),
  checkInDate: z.string().datetime().optional().nullable(),
  checkOutDate: z.string().datetime().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  providerBookingId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  tripId: z.string().uuid().optional().nullable(),
  activityId: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type BaseBooking = z.infer<typeof baseBookingSchema>;

// Schema for creating a booking
export const createBookingSchema = z.object({
  type: z.enum(['hotel', 'flight', 'car', 'train', 'activity', 'other']),
  userId: z.union([z.string(), z.number()]),
  organizationId: z.union([z.string(), z.number()]),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
  bookingDate: z.union([z.string().datetime(), z.date()]).default(() => new Date().toISOString()),
  reference: z.string().default(() => `BOOK-${Date.now()}`),
  startDate: z.union([z.string().datetime(), z.date()]).optional(),
  endDate: z.union([z.string().datetime(), z.date()]).optional(),
  checkInDate: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  checkOutDate: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  amount: z.number(),
  currency: z.string().optional(),
  provider: z.string().optional().default('unknown'),
  providerBookingId: z.string().optional(),
  notes: z.string().nullable().optional(),
  tripId: z.union([z.string(), z.number()]).nullable().optional(),
  activityId: z.union([z.string(), z.number()]).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  cancellationPolicy: z.string().nullable().optional(),
  cancellationDeadline: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  cancellationReason: z.string().nullable().optional()
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;

// Schema for updating a booking
export const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  checkInDate: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  checkOutDate: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  provider: z.string().optional(),
  providerBookingId: z.string().optional(),
  notes: z.string().nullable().optional(),
  tripId: z.union([z.string(), z.number()]).nullable().optional(),
  activityId: z.union([z.string(), z.number()]).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  cancellationPolicy: z.string().nullable().optional(),
  cancellationDeadline: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  updatedBy: z.string().uuid()
}).partial();

export type UpdateBookingDto = z.infer<typeof updateBookingSchema>;

// Extended DTOs for specific operations
export interface CancelBookingDto {
  status: 'cancelled';
  cancellationReason?: string;
  updatedBy: string;
}

export interface BookingStats {
  total: number;
  byStatus: Record<BookingStatus, number>;
  byType: Record<BookingType, number>;
  upcoming: number;
  past: number;
  revenue: {
    total: number;
    byType: Record<BookingType, number>;
  };
  recent: BaseBooking[];
}

// Class for API responses with proper decorators
import { Expose, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, IsNumber, IsDateString, IsObject } from 'class-validator';

export class BookingResponse implements BaseBooking {
  @Expose()
  id!: string;

  @Expose()
  reference!: string;

  @Expose()
  @IsEnum(['hotel', 'flight', 'car', 'train', 'activity', 'other'])
  type!: BookingType;

  @Expose()
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed'])
  status!: BookingStatus;

  @Expose()
  @IsDateString()
  bookingDate!: string;

  @Expose()
  @IsDateString()
  @IsOptional()
  checkInDate?: string | null;

  @Expose()
  @IsDateString()
  @IsOptional()
  checkOutDate?: string | null;

  @Expose()
  @IsNumber()
  @IsOptional()
  amount?: number | null;

  @Expose()
  @IsString()
  @IsOptional()
  currency?: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  provider?: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  providerBookingId?: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  notes?: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  cancellationReason?: string | null;

  @Expose()
  @IsUUID()
  userId!: string;

  @Expose()
  @IsUUID()
  organizationId!: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  tripId?: string | null;

  @Expose()
  @IsUUID()
  @IsOptional()
  activityId?: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  createdBy?: string;

  @Expose()
  @IsString()
  @IsOptional()
  updatedBy?: string | null;

  @Expose()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown> | null;

  @Expose()
  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @Expose()
  @IsDateString()
  @IsOptional()
  updatedAt?: string;
}

// Type for internal use
export type BookingResponseType = BaseBooking;

// Type guard for BookingResponse
export function isBookingResponse(booking: unknown): booking is BookingResponse {
  return (
    typeof booking === 'object' &&
    booking !== null &&
    'id' in booking &&
    'reference' in booking &&
    'type' in booking &&
    'status' in booking &&
    'bookingDate' in booking
  );
}

// Type guard for array of BookingResponse
export function isBookingResponseArray(bookings: unknown): bookings is BookingResponse[] {
  return Array.isArray(bookings) && bookings.every(isBookingResponse);
}
