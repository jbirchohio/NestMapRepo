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
  role: text("role").default("user"), // System-wide role: admin, manager, user, guest
  organization_id: integer("organization_id"), // For B2B multi-tenant support
  created_at: timestamp("created_at").defaultNow(),
});

// Organizations for B2B/Enterprise customers
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"), // Company domain for auto-assignment
  plan: text("plan").default("free"), // free, team, enterprise
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip collaborators with roles
export const tripCollaborators = pgTable("trip_collaborators", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").notNull(), // admin, editor, viewer, commenter
  invited_by: integer("invited_by"), // User ID who sent invitation
  invited_at: timestamp("invited_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
  status: text("status").default("pending"), // pending, accepted, declined
});

export const insertUserSchema = createInsertSchema(users).pick({
  auth_id: true,
  username: true,
  email: true,
  display_name: true,
  avatar_url: true,
  role: true,
  organization_id: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  domain: true,
  plan: true,
});

export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators).pick({
  trip_id: true,
  user_id: true,
  role: true,
  invited_by: true,
});

// Team invitations table
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  role: text("role").notNull(), // user role in organization
  token: text("token").notNull().unique(), // unique invitation token
  status: text("status").default("pending"), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  organizationId: true,
  invitedBy: true,
  role: true,
  token: true,
  expiresAt: true,
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
  sharePermission: text("share_permission").default("read-only"), // "read-only" or "edit"
  // Location information
  city: text("city"),
  country: text("country"),
  location: text("location"),
  // City coordinates for map centering
  cityLatitude: text("city_latitude"),
  cityLongitude: text("city_longitude"),
  // Hotel/accommodation information
  hotel: text("hotel"),
  hotelLatitude: text("hotel_latitude"),
  hotelLongitude: text("hotel_longitude"),
  // Trip status
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  // B2B/Client mode fields
  tripType: text("trip_type").default("personal"), // "personal" or "business"
  clientName: text("client_name"),
  projectType: text("project_type"),
  organization: text("organization"),
  budget: text("budget"),
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
  // City coordinates for map centering
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
  // Hotel/accommodation information
  hotel: z.string().optional(),
  hotelLatitude: z.string().optional(),
  hotelLongitude: z.string().optional(),
  // B2B fields
  tripType: z.string().optional().default("personal"),
  clientName: z.string().optional(),
  projectType: z.string().optional(),
  organization: z.string().optional(),
  budget: z.string().optional(),
  // Trip completion tracking
  completed: z.boolean().optional().default(false),
  completedAt: z.date().optional(),
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
  travelMode: z.string().nullable().optional(),
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

// RBAC constants
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  USER: 'user',
  GUEST: 'guest'
} as const;

export const TRIP_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  COMMENTER: 'commenter'
} as const;

export const ORGANIZATION_PLANS = {
  FREE: 'free',
  TEAM: 'team',
  ENTERPRISE: 'enterprise'
} as const;

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type InsertTripCollaborator = z.infer<typeof insertTripCollaboratorSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

// RBAC utility types
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type TripRole = typeof TRIP_ROLES[keyof typeof TRIP_ROLES];
export type OrganizationPlan = typeof ORGANIZATION_PLANS[keyof typeof ORGANIZATION_PLANS];

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
