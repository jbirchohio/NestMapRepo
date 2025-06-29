import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  integer, 
  jsonb, 
  pgEnum, 
  index,
  numeric
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { trips } from '../trips/trips.js';
import { tripActivities } from '../trips/trip-activities.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
import type { Metadata } from '../shared/types.js';

// Booking status enum
export const bookingStatusEnum = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
] as const;

// Booking type enum
export const bookingTypeEnum = [
  'flight',
  'hotel',
  'car_rental',
  'activity',
  'other'
] as const;

export type BookingStatus = typeof bookingStatusEnum[number];
export type BookingType = typeof bookingTypeEnum[number];

// Zod enum types
export const bookingStatusSchema = z.enum(bookingStatusEnum);
export const bookingTypeSchema = z.enum(bookingTypeEnum);

/**
 * Bookings table definition
 * Aligned with shared/types/bookings.ts
 */
export const bookings = pgTable('bookings', {
  ...withBaseColumns,
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  trip_id: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  activity_id: uuid('activity_id')
    .references(() => tripActivities.id, { onDelete: 'set null' }),
  
  // Booking details
  reference: text('reference')
    .notNull()
    .unique()
    .default(sql`'B' || lpad(floor(random() * 1000000)::text, 6, '0')`),
  type: text('type', { enum: bookingTypeEnum }).notNull(),
  status: text('status', { enum: bookingStatusEnum }).notNull().default('pending'),
  
  // Payment details
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  payment_status: text('payment_status').notNull().default('pending'),
  payment_method: text('payment_method'),
  payment_date: timestamp('payment_date', { mode: 'date' }),
  
  // Provider details
  provider: text('provider').notNull(),
  provider_booking_id: text('provider_booking_id'),
  provider_reference: text('provider_reference'),
  
  // Booking details
  start_date: timestamp('start_date', { mode: 'date' }),
  end_date: timestamp('end_date', { mode: 'date' }),
  notes: text('notes'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
  
  // Location details
  location: text('location'),
  address: jsonb('address').$type<{
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
    formatted?: string;
  }>(),
  
  // Cancellation policy
  cancellation_policy: jsonb('cancellation_policy').$type<{
    cancellable: boolean;
    freeCancellationUntil?: string; // ISO date
    penaltyAmount?: number;
    penaltyCurrency?: string;
    description?: string;
  }>(),
}, (table) => ({
  // Indexes
  orgUserIdx: index('bookings_org_user_idx').on(table.organization_id, table.user_id),
  tripIdx: index('bookings_trip_idx').on(table.trip_id),
  activityIdx: index('bookings_activity_idx').on(table.activity_id),
  statusIdx: index('bookings_status_idx').on(table.status),
  typeIdx: index('bookings_type_idx').on(table.type),
  dateIdx: index('bookings_date_idx').on(table.start_date),
  providerIdx: index('bookings_provider_idx').on(table.provider, table.provider_booking_id),
}));

// Create base schemas with proper typing
const baseInsertSchema = createInsertSchema(bookings) as unknown as z.ZodObject<{
  [K in keyof NewBooking]: z.ZodType<NewBooking[K]>;
}>;

const baseSelectSchema = createSelectSchema(bookings) as unknown as z.ZodObject<{
  [K in keyof Booking]: z.ZodType<Booking[K]>;
}>;

// Schema for creating/updating a booking
export const insertBookingSchema = baseInsertSchema.pick({
  organization_id: true,
  user_id: true,
  trip_id: true,
  activity_id: true,
  reference: true,
  type: true,
  status: true,
  amount: true,
  currency: true,
  payment_status: true,
  payment_method: true,
  payment_date: true,
  provider: true,
  provider_booking_id: true,
  provider_reference: true,
  start_date: true,
  end_date: true,
  notes: true,
  metadata: true
}).extend({
  reference: z.string().min(1, 'Reference is required').max(100, 'Reference is too long'),
  type: bookingTypeSchema,
  status: bookingStatusSchema.default('pending'),
  amount: z.string().or(z.number()).transform(val => String(val)),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  provider: z.string().min(1, 'Provider is required').max(100, 'Provider name is too long'),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Schema for selecting a booking
export const selectBookingSchema = baseSelectSchema.extend({
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable()
});

// TypeScript types
export interface Booking extends BaseTable {
  organization_id: string;
  user_id: string;
  trip_id: string | null;
  activity_id: string | null;
  reference: string;
  type: BookingType;
  status: BookingStatus;
  amount: string;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  payment_date: Date | null;
  provider: string;
  provider_booking_id: string | null;
  provider_reference: string | null;
  start_date: Date | null;
  end_date: Date | null;
  notes: string | null;
}

export type NewBooking = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Application-facing interface with camelCase
export interface BookingWithCamelCase {
  id: string;
  organizationId: string;
  userId: string;
  tripId: string | null;
  activityId: string | null;
  reference: string;
  type: BookingType;
  status: BookingStatus;
  amount: string;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentDate: Date | null;
  provider: string;
  providerBookingId: string | null;
  providerReference: string | null;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  metadata: Metadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Utility function to convert database booking to application booking
export function toBookingWithCamelCase(dbBooking: Booking): BookingWithCamelCase {
  // Convert the booking to a plain object first
  const bookingObj = { ...dbBooking } as unknown as Record<string, unknown>;
  return toCamelCase<BookingWithCamelCase>(bookingObj);
}

// Utility function to convert application booking to database booking
export function toDbBooking(booking: Partial<BookingWithCamelCase>): Partial<NewBooking> {
  // Convert the booking to a plain object first
  const bookingObj = { ...booking } as unknown as Record<string, unknown>;
  return toSnakeCase<Partial<NewBooking>>(bookingObj);
}

// Export the schema with types
export const bookingSchema = {
  table: bookings,
  insert: insertBookingSchema,
  select: selectBookingSchema,
  toCamelCase: toBookingWithCamelCase,
  toSnakeCase: toDbBooking
};
