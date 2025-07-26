import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users, organizations } from './schema';

// Trip status enum
export const tripStatusEnum = pgEnum('trip_status', ['draft', 'planned', 'active', 'completed', 'cancelled']);

// Trip role enum
export const tripRoleEnum = pgEnum('trip_role', ['owner', 'admin', 'editor', 'viewer']);

// Trips table
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: tripStatusEnum('status').default('draft').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  destinationCity: text('destination_city'),
  destinationCountry: text('destination_country'),
  destinationCoordinates: jsonb('destination_coordinates'), // {lat: number, lng: number}
  coverImageUrl: text('cover_image_url'),
  metadata: jsonb('metadata'), // For any additional data
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  lastUpdatedById: uuid('last_updated_by_id').references(() => users.id, { onDelete: 'set null' }),
});

// Trip collaborators table
export const tripCollaborators = pgTable('trip_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: tripRoleEnum('role').default('viewer').notNull(),
  isAccepted: boolean('is_accepted').default(false),
  acceptedAt: timestamp('accepted_at'),
}, (table) => ({
  tripUserUnique: index('trip_collaborators_trip_user_unique_idx').on(table.tripId, table.userId),
}));

// Trip travelers
export const tripTravelers = pgTable('trip_travelers', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  preferences: jsonb('preferences'), // Dietary, seating, etc.
});

// Trip itinerary items
export const tripItineraryItems = pgTable('trip_itinerary_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  location: text('location'),
  coordinates: jsonb('coordinates'), // {lat: number, lng: number}
  type: text('type').notNull(), // 'flight', 'hotel', 'activity', etc.
  bookingId: uuid('booking_id'), // Reference to a booking if applicable
  category: text('category'), // For grouping (e.g., 'transportation', 'accommodation', 'dining')
  day: integer('day'), // Day number in the trip
  order: integer('order').notNull().default(0), // Order within the day
  isHighlighted: boolean('is_highlighted').default(false),
  status: text('status').default('planned'), // 'planned', 'confirmed', 'cancelled', etc.
  metadata: jsonb('metadata'), // Additional details specific to the type
});

// Create Zod schemas for validation
export const insertTripSchema = createInsertSchema(trips);
export const selectTripSchema = createSelectSchema(trips);

export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators);
export const selectTripCollaboratorSchema = createSelectSchema(tripCollaborators);

export const insertTripTravelerSchema = createInsertSchema(tripTravelers);
export const selectTripTravelerSchema = createSelectSchema(tripTravelers);

export const insertTripItineraryItemSchema = createInsertSchema(tripItineraryItems);
export const selectTripItineraryItemSchema = createSelectSchema(tripItineraryItems);

// Define TypeScript types
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type NewTripCollaborator = typeof tripCollaborators.$inferInsert;

export type TripTraveler = typeof tripTravelers.$inferSelect;
export type NewTripTraveler = typeof tripTravelers.$inferInsert;

export type TripItineraryItem = typeof tripItineraryItems.$inferSelect;
export type NewTripItineraryItem = typeof tripItineraryItems.$inferInsert;

