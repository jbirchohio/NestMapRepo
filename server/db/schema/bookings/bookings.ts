import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations';
import { users } from '../users';
import { trips } from '../trips/trips';
import { activities } from '../trips/trip-activities';
import { withBaseColumns } from '../base';

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

/**
 * Bookings table definition
 * Aligned with shared/types/bookings.ts
 */
export const bookings = pgTable('bookings', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'set null' }),
  activityId: uuid('activity_id')
    .references(() => activities.id, { onDelete: 'set null' }),
  
  // Booking details
  reference: text('reference')
    .notNull()
    .unique()
    .default(sql`'B' || lpad(floor(random() * 1000000)::text, 6, '0')`),
  type: text('type').$type<BookingType>().notNull(),
  status: text('status').$type<BookingStatus>().default('pending').notNull(),
  
  // Date and time
  bookingDate: timestamp('booking_date', { withTimezone: true }).notNull(),
  checkInDate: timestamp('check_in_date', { withTimezone: true }),
  checkOutDate: timestamp('check_out_date', { withTimezone: true }),
  
  // Financial
  amount: integer('amount'), // In cents
  currency: text('currency').default('USD'),
  taxAmount: integer('tax_amount'),
  feeAmount: integer('fee_amount'),
  discountAmount: integer('discount_amount'),
  totalAmount: integer('total_amount'),
  
  // Provider details
  provider: text('provider'), // e.g., 'expedia', 'booking.com', 'direct'
  providerBookingId: text('provider_booking_id'),
  providerConfirmation: text('provider_confirmation'),
  
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
  
  // Additional details
  notes: text('notes'),
  
  // Cancellation policy
  cancellationPolicy: jsonb('cancellation_policy').$type<{
    cancellable: boolean;
    freeCancellationUntil?: string; // ISO date
    penaltyAmount?: number;
    penaltyCurrency?: string;
    description?: string;
  }>(),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Indexes
  orgUserIdx: index('bookings_org_user_idx').on(table.organizationId, table.userId),
  tripIdx: index('bookings_trip_idx').on(table.tripId),
  activityIdx: index('bookings_activity_idx').on(table.activityId),
  statusIdx: index('bookings_status_idx').on(table.status),
  typeIdx: index('bookings_type_idx').on(table.type),
  dateIdx: index('bookings_date_idx').on(table.bookingDate),
  providerIdx: index('bookings_provider_idx').on(table.provider, table.providerBookingId),
}));

// Schema for creating/updating a booking
export const insertBookingSchema = createInsertSchema(bookings, {
  reference: (schema) => schema.reference.min(1).max(100),
  type: (schema) => schema.type.oneOf([...bookingTypeEnum]),
  status: (schema) => schema.status.oneOf([...bookingStatusEnum]).default('pending'),
  amount: (schema) => schema.amount.optional(),
  currency: (schema) => schema.currency.length(3).optional(),
  provider: (schema) => schema.provider.optional(),
  providerBookingId: (schema) => schema.providerBookingId.optional(),
  notes: (schema) => schema.notes.optional(),
  metadata: (schema) => schema.metadata.optional(),
});

// Schema for selecting a booking
export const selectBookingSchema = createSelectSchema(bookings);

// TypeScript types
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// Export the schema with types
export const bookingSchema = {
  insert: insertBookingSchema,
  select: selectBookingSchema,
} as const;
