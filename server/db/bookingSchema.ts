import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb, 
  pgEnum, 
  type PgTableWithColumns, 
  type AnyPgColumn 
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, trips } from './schema.js';
// Booking status enum
export const bookingStatusEnum = pgEnum('booking_status', [
    'pending',
    'confirmed',
    'cancelled',
    'completed'
] as const);
// Booking type enum
export const bookingTypeEnum = pgEnum('booking_type', [
    'flight',
    'hotel',
    'car',
    'activity',
    'transportation',
    'other'
] as const);
// Bookings table
export const bookings = pgTable('bookings', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
    type: bookingTypeEnum('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    location: text('location'),
    status: bookingStatusEnum('status').default('pending').notNull(),
    confirmationCode: text('confirmation_code'),
    confirmedAt: timestamp('confirmed_at'),
    provider: text('provider'),
    providerReferenceId: text('provider_reference_id'),
    cancellationReason: text('cancellation_reason'),
    price: integer('price'), // In cents
    currency: text('currency').default('usd'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
// Types
export type Booking = InferSelectModel<typeof bookings>;
export type InsertBooking = InferInsertModel<typeof bookings>;
