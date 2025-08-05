import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simple user schema for consumers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash"), // For JWT auth
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  bio: text("bio"), // Short bio for social features
  preferences: jsonb("preferences"), // User preferences (currency, units, etc)
  stripe_customer_id: text("stripe_customer_id"), // For payments
  created_at: timestamp("created_at").defaultNow(),
  last_login: timestamp("last_login"),
});

// Trips - the core entity
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(), // Trip owner
  title: text("title").notNull(),
  description: text("description"),
  destination: text("destination"),
  start_date: date("start_date"),
  end_date: date("end_date"),
  cover_image: text("cover_image"), // Trip cover photo
  total_budget: decimal("total_budget", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  visibility: text("visibility").default("private"), // private, friends, public
  share_code: text("share_code").unique(), // For sharing trips
  tags: jsonb("tags").$type<string[]>(), // Trip tags for discovery
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Activities within trips
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(), // Who added it
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("custom"), // custom, viator, flight, hotel, restaurant
  date: date("date"),
  start_time: text("start_time"),
  end_time: text("end_time"),
  location: text("location"),
  coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  booking_details: jsonb("booking_details"), // External booking info
  external_id: text("external_id"), // Viator product ID, etc
  external_url: text("external_url"), // Booking link
  notes: text("notes"),
  completed: boolean("completed").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip collaborators for group trips
export const tripCollaborators = pgTable("trip_collaborators", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").notNull().default("viewer"), // owner, editor, viewer
  accepted: boolean("accepted").default(false),
  invited_at: timestamp("invited_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
});

// Social connections between users
export const userConnections = pgTable("user_connections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  connected_user_id: integer("connected_user_id").notNull(),
  status: text("status").default("pending"), // pending, accepted, blocked
  created_at: timestamp("created_at").defaultNow(),
});

// Trip likes/saves for social features
export const tripLikes = pgTable("trip_likes", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Comments on trips/activities
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  trip_id: integer("trip_id"),
  activity_id: integer("activity_id"),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  type: text("type").notNull(), // trip_invite, comment, like, etc
  title: text("title").notNull(),
  message: text("message"),
  data: jsonb("data"), // Additional context
  read: boolean("read").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// Bookings tracking
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  trip_id: integer("trip_id"),
  activity_id: integer("activity_id"),
  type: text("type").notNull(), // flight, hotel, activity
  status: text("status").default("pending"), // pending, confirmed, cancelled
  provider: text("provider"), // duffel, viator, etc
  external_booking_id: text("external_booking_id"),
  confirmation_code: text("confirmation_code"),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  booking_data: jsonb("booking_data"), // Full booking details
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip templates for sharing/inspiration
export const tripTemplates = pgTable("trip_templates", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  original_trip_id: integer("original_trip_id"),
  title: text("title").notNull(),
  description: text("description"),
  destination: text("destination"),
  duration_days: integer("duration_days"),
  estimated_budget: decimal("estimated_budget", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  cover_image: text("cover_image"),
  tags: jsonb("tags").$type<string[]>(),
  uses_count: integer("uses_count").default(0),
  is_featured: boolean("is_featured").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// User sessions for auth
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Waitlist for early access
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  referral_source: text("referral_source"),
  created_at: timestamp("created_at").defaultNow(),
});

// Simple analytics events
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  session_id: text("session_id"),
  event_type: text("event_type").notNull(),
  event_data: jsonb("event_data"),
  created_at: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertTripSchema = createInsertSchema(trips);
export const insertActivitySchema = createInsertSchema(activities);
export const insertBookingSchema = createInsertSchema(bookings);

// Helper types
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type Notification = typeof notifications.$inferSelect;