import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - modified to work with Supabase auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").notNull().unique(), // Supabase auth ID
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  auth_id: true,
  username: true,
  email: true,
  display_name: true,
  avatar_url: true,
});

// Trip schema with enhanced sharing/collaboration features
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  userId: integer("user_id").notNull(),
  collaborators: jsonb("collaborators").default([]),
  // Sharing and collaboration settings
  isPublic: boolean("is_public").default(false),
  shareCode: text("share_code").unique(),
  sharingEnabled: boolean("sharing_enabled").default(false),
  // Location information
  city: text("city"),
  country: text("country"),
  location: text("location"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create a custom schema that properly handles dates as strings from JSON
export const insertTripSchema = z.object({
  title: z.string(),
  startDate: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  endDate: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  userId: z.number(),
  collaborators: z.array(z.any()).default([]),
  // Sharing and collaboration settings
  isPublic: z.boolean().optional().default(false),
  shareCode: z.string().optional(),
  sharingEnabled: z.boolean().optional().default(false),
  // Location fields are optional
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
});

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  locationName: text("location_name").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  notes: text("notes"),
  tag: text("tag"),
  assignedTo: text("assigned_to"),
  order: integer("order").notNull(),
  travelMode: text("travel_mode").default("walking"),
  completed: boolean("completed").default(false),
});

// Create a custom schema that properly handles dates as strings from JSON
export const insertActivitySchema = z.object({
  tripId: z.number(),
  title: z.string(),
  date: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  time: z.string(),
  locationName: z.string(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  order: z.number(),
  travelMode: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  completed: z.boolean().optional().default(false),
});

// Todo schema
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  assignedTo: text("assigned_to"),
});

export const insertTodoSchema = createInsertSchema(todos).pick({
  tripId: true,
  task: true,
  completed: true,
  assignedTo: true,
});

// Notes schema
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  content: text("content").notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  tripId: true,
  content: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
