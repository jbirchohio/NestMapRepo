import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  integer, 
  jsonb, 
  pgEnum,
  type PgColumn,
  type PgTableWithColumns,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { users, trips } from './schema.js';
import { activities } from './schema.js';

// Booking status enum - must match shared types
const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
] as const);

// Booking type enum - must match shared types
const bookingTypeEnum = pgEnum('booking_type', [
  'flight',
  'hotel',
  'car_rental',
  'activity',
  'other'
] as const);

/**
 * Bookings table definition
 * Aligned with shared/types/bookings.ts
 */
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: text('reference').notNull().unique().default(
    sql`'B' || lpad(floor(random() * 1000000)::text, 6, '0')`
  ),
  type: bookingTypeEnum('type').notNull(),
  status: bookingStatusEnum('status').default('pending').notNull(),
  bookingDate: timestamp('booking_date', { withTimezone: true }).notNull(),
  checkInDate: timestamp('check_in_date', { withTimezone: true }),
  checkOutDate: timestamp('check_out_date', { withTimezone: true }),
  amount: integer('amount'), // In cents
  currency: text('currency').default('usd'),
  provider: text('provider').notNull(),
  providerReferenceId: text('provider_reference_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').notNull(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'set null' }),
  notes: text('notes'),
  cancellationPolicy: text('cancellation_policy'),
  cancellationDeadline: timestamp('cancellation_deadline', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Types
export type Booking = InferModel<typeof bookings>;
export type InsertBooking = InferModel<typeof bookings, 'insert'>;

// Type helpers for Drizzle ORM
export type AnyBooking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// Indexes that will be created by the migration
export const bookingIndexes = {
  bookings_user_id_idx: ['user_id'],
  bookings_organization_id_idx: ['organization_id'],
  bookings_trip_id_idx: ['trip_id'],
  bookings_activity_id_idx: ['activity_id'],
  bookings_status_idx: ['status'],
  bookings_type_idx: ['type'],
  bookings_booking_date_idx: ['booking_date'],
  bookings_provider_reference_idx: ['provider', 'provider_reference_id']
} as const;
