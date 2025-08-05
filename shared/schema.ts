import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simplified user schema for consumers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").notNull().unique(), // For auth providers
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"), // JWT auth
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  role: text("role").default("user"), // Simplified: just user/admin
  role_type: text("role_type").default("consumer"), // Always consumer now
  organization_id: integer("organization_id"), // Kept for compatibility, always null
  company: text("company"), // Kept for compatibility, unused
  job_title: text("job_title"), // Kept for compatibility, unused
  team_size: text("team_size"), // Kept for compatibility, unused
  use_case: text("use_case"), // Kept for compatibility, unused
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
});

// Minimal organizations table for compatibility
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  plan: text("plan").default("free"),
  white_label_enabled: boolean("white_label_enabled").default(false),
  white_label_plan: text("white_label_plan").default("none"),
  primary_color: text("primary_color"),
  secondary_color: text("secondary_color"),
  accent_color: text("accent_color"),
  logo_url: text("logo_url"),
  support_email: text("support_email"),
  employee_count: integer("employee_count"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  subscription_status: text("subscription_status").default("inactive"),
  current_period_end: timestamp("current_period_end"),
  stripe_connect_account_id: text("stripe_connect_account_id"),
  stripe_connect_onboarded: boolean("stripe_connect_onboarded").default(false),
  stripe_issuing_enabled: boolean("stripe_issuing_enabled").default(false),
  stripe_payments_enabled: boolean("stripe_payments_enabled").default(false),
  stripe_transfers_enabled: boolean("stripe_transfers_enabled").default(false),
  stripe_external_account_id: text("stripe_external_account_id"),
  stripe_requirements_currently_due: jsonb("stripe_requirements_currently_due"),
  stripe_requirements_eventually_due: jsonb("stripe_requirements_eventually_due"),
  stripe_requirements_past_due: jsonb("stripe_requirements_past_due"),
  stripe_requirements_disabled_reason: text("stripe_requirements_disabled_reason"),
  stripe_requirements_current_deadline: timestamp("stripe_requirements_current_deadline"),
  funding_source_id: text("funding_source_id"),
  funding_source_type: text("funding_source_type"),
  funding_source_status: text("funding_source_status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  risk_level: text("risk_level").default("low"),
});

// Kept for compatibility but simplified
export const organizationRoles = pgTable("organization_roles", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  is_default: boolean("is_default").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Kept for compatibility
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  org_role: text("org_role").notNull().default("member"),
  permissions: jsonb("permissions"),
  invited_by: integer("invited_by"),
  invited_at: timestamp("invited_at").defaultNow(),
  joined_at: timestamp("joined_at"),
  status: text("status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip collaborators for sharing trips
export const tripCollaborators = pgTable("trip_collaborators", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").notNull(), // owner, editor, viewer
  invited_by: integer("invited_by"),
  invited_at: timestamp("invited_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
  status: text("status").default("pending"), // pending, accepted, declined
});

// Invitations for sharing
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id), // Always null for consumers
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  role: text("role").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

// Trip schema - core entity for consumer travel planning
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  user_id: integer("user_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Always null for consumers
  collaborators: jsonb("collaborators").default([]),
  // Sharing features for social/group trips
  is_public: boolean("is_public").default(false),
  share_code: text("share_code").unique(),
  sharing_enabled: boolean("sharing_enabled").default(false),
  share_permission: text("share_permission").default("read-only"), // "read-only" or "edit"
  // Location information
  city: text("city"),
  country: text("country"),
  location: text("location"),
  city_latitude: text("city_latitude"),
  city_longitude: text("city_longitude"),
  // Accommodation
  hotel: text("hotel"),
  hotel_latitude: text("hotel_latitude"),
  hotel_longitude: text("hotel_longitude"),
  // Trip status
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  // Keep these for compatibility but default to consumer values
  trip_type: text("trip_type").default("personal"), // Always personal for consumers
  client_name: text("client_name"), // Unused
  project_type: text("project_type"), // Unused
  budget: integer("budget"), // Trip budget in cents
  // Metadata
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Activities - things to do on trips
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Always null
  title: text("title").notNull(),
  date: date("date").notNull(),
  time: text("time"),
  location_name: text("location_name"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  notes: text("notes"),
  tag: text("tag"), // restaurant, activity, transport, accommodation, other
  assigned_to: text("assigned_to"), // For group trips
  order: integer("order"),
  travel_mode: text("travel_mode"), // walking, transit, driving
  completed: boolean("completed").default(false),
  // New fields for consumer features
  booking_url: text("booking_url"), // External booking link
  booking_reference: text("booking_reference"), // Confirmation code
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  provider: text("provider"), // viator, duffel, etc.
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Notes for trips
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  content: text("content").notNull(),
  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip todos/checklist
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  content: text("content").notNull(),
  is_completed: boolean("is_completed").default(false),
  assigned_to: text("assigned_to"),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

// Bookings for tracking reservations
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

// Keep all the existing corporate tables as empty shells for compatibility
// These prevent errors but are not used in the consumer app
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organization_id: integer("organization_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  team_id: integer("team_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").default("member"),
  joined_at: timestamp("joined_at").defaultNow(),
});

export const travelPolicies = pgTable("travel_policies", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  rules: jsonb("rules"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  activity_id: integer("activity_id").notNull(),
  user_id: integer("user_id").notNull(),
  organization_id: integer("organization_id"),
  category_id: integer("category_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  description: text("description"),
  receipt_url: text("receipt_url"),
  status: text("status").default("pending"),
  approved_by: integer("approved_by"),
  approved_at: timestamp("approved_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  stages: jsonb("stages").notNull(),
  conditions: jsonb("conditions"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  workflow_id: integer("workflow_id").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: integer("entity_id").notNull(),
  stage: integer("stage").default(0),
  status: text("status").default("pending"),
  submitted_by: integer("submitted_by").notNull(),
  submitted_at: timestamp("submitted_at").defaultNow(),
  completed_at: timestamp("completed_at"),
  comments: jsonb("comments").default([]),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Export schemas and types (keeping same exports for compatibility)
export const insertUserSchema = createInsertSchema(users);

export const registerUserSchema = insertUserSchema.omit({ 
  password_hash: true 
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertOrganizationRoleSchema = createInsertSchema(organizationRoles).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);
export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators);
export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  organizationId: true,
  invitedBy: true,
  role: true,
  token: true,
  expiresAt: true,
});

// Keep the complex insertTripSchema for compatibility
export const insertTripSchema = z.object({
  title: z.string(),
  start_date: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  end_date: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  user_id: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  organization_id: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ).optional(),
  collaborators: z.array(z.any()).default([]),
  isPublic: z.boolean().optional().default(false),
  shareCode: z.string().optional(),
  sharingEnabled: z.boolean().optional().default(false),
  sharePermission: z.string().optional().default("read-only"),
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  city_latitude: z.string().optional(),
  city_longitude: z.string().optional(),
  hotel: z.string().optional(),
  hotel_latitude: z.string().optional(),
  hotel_longitude: z.string().optional(),
  trip_type: z.string().optional().default("personal"),
  client_name: z.string().optional(),
  project_type: z.string().optional(),
  organization: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'number') return Math.round(val * 100);
    const parsed = parseFloat(val.replace(/[$,\s]/g, ''));
    return isNaN(parsed) ? undefined : Math.round(parsed * 100);
  }),
  completed: z.boolean().optional().default(false),
  completed_at: z.date().optional(),
});

// Keep transform functions for compatibility
export function transformTripToFrontend(trip: Trip) {
  return {
    id: trip.id,
    title: trip.title,
    startDate: trip.start_date,
    endDate: trip.end_date,
    userId: trip.user_id,
    organizationId: trip.organization_id,
    collaborators: trip.collaborators,
    isPublic: trip.is_public,
    shareCode: trip.share_code,
    sharingEnabled: trip.sharing_enabled,
    sharePermission: trip.share_permission,
    city: trip.city,
    country: trip.country,
    location: trip.location,
    cityLatitude: trip.city_latitude,
    cityLongitude: trip.city_longitude,
    hotel: trip.hotel,
    hotelLatitude: trip.hotel_latitude,
    hotelLongitude: trip.hotel_longitude,
    completed: trip.completed,
    completedAt: trip.completed_at,
    tripType: trip.trip_type,
    clientName: trip.client_name,
    projectType: trip.project_type,
    budget: trip.budget,
    createdAt: trip.created_at,
    updatedAt: trip.updated_at,
  };
}

export function transformActivityToFrontend(activity: Activity) {
  return {
    id: activity.id,
    tripId: activity.trip_id,
    organizationId: activity.organization_id,
    title: activity.title,
    date: activity.date,
    time: activity.time,
    locationName: activity.location_name,
    latitude: activity.latitude,
    longitude: activity.longitude,
    notes: activity.notes,
    tag: activity.tag,
    assignedTo: activity.assigned_to,
    order: activity.order,
    travelMode: activity.travel_mode,
    completed: activity.completed,
  };
}

// Export remaining schemas
export const insertActivitySchema = createInsertSchema(activities);
export const insertNoteSchema = createInsertSchema(notes);
export const insertTodoSchema = createInsertSchema(todos);
export const insertBookingSchema = createInsertSchema(bookings);

// Type exports
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type TripCollaborator = typeof tripCollaborators.$inferSelect;