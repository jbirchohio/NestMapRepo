import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - modified to work with Supabase auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").notNull().unique(), // Supabase auth ID
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"), // Secure password hash for authentication
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  role: text("role").default("user"), // System-wide role: admin, manager, user, guest
  role_type: text("role_type").default("corporate"), // Business mode: corporate, agency
  organization_id: integer("organization_id"), // For B2B multi-tenant support
  company: text("company"), // Company name
  job_title: text("job_title"), // Job title
  team_size: text("team_size"), // Team size range
  use_case: text("use_case"), // Primary use case
  created_at: timestamp("created_at").defaultNow(),
});

// Organizations for B2B/Enterprise customers
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"), // Company domain for auto-assignment
  plan: text("plan").default("free"), // free, team, enterprise
  white_label_enabled: boolean("white_label_enabled").default(false),
  white_label_plan: text("white_label_plan").default("none"), // none, basic, premium, enterprise
  // White-label branding configuration
  primary_color: text("primary_color"), // Custom primary color
  secondary_color: text("secondary_color"), // Custom secondary color
  accent_color: text("accent_color"), // Custom accent color
  logo_url: text("logo_url"), // Custom logo URL
  support_email: text("support_email"), // Custom support email
  employee_count: integer("employee_count"), // Organization size for demo analytics
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  subscription_status: text("subscription_status").default("inactive"), // active, inactive, past_due, canceled
  current_period_end: timestamp("current_period_end"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Organization members with roles - enables granular permissions within organizations
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  org_role: text("org_role").notNull().default("member"), // admin, manager, editor, member, viewer
  permissions: jsonb("permissions"), // Specific permissions override
  invited_by: integer("invited_by"), // User ID who sent invitation
  invited_at: timestamp("invited_at").defaultNow(),
  joined_at: timestamp("joined_at"),
  status: text("status").default("active"), // active, invited, suspended, inactive
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
  password_hash: true,
  display_name: true,
  avatar_url: true,
  role: true,
  role_type: true,
  organization_id: true,
  company: true,
  job_title: true,
  team_size: true,
  use_case: true,
});

// Authentication schema for registration (includes password field)
export const registerUserSchema = insertUserSchema.omit({ 
  password_hash: true 
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters")
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  domain: true,
  plan: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).pick({
  organization_id: true,
  user_id: true,
  org_role: true,
  permissions: true,
  invited_by: true,
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
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  user_id: integer("user_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
  collaborators: jsonb("collaborators").default([]),
  // Sharing and collaboration settings
  is_public: boolean("is_public").default(false),
  share_code: text("share_code").unique(),
  sharing_enabled: boolean("sharing_enabled").default(false),
  share_permission: text("share_permission").default("read-only"), // "read-only" or "edit"
  // Location information
  city: text("city"),
  country: text("country"),
  location: text("location"),
  // City coordinates for map centering
  city_latitude: text("city_latitude"),
  city_longitude: text("city_longitude"),
  // Hotel/accommodation information
  hotel: text("hotel"),
  hotel_latitude: text("hotel_latitude"),
  hotel_longitude: text("hotel_longitude"),
  // Trip status
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  // B2B/Client mode fields
  trip_type: text("trip_type").default("personal"), // "personal" or "business"
  client_name: text("client_name"),
  project_type: text("project_type"),
  budget: integer("budget"), // Budget in cents to avoid decimal precision issues
  // Metadata
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
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
  userId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  organizationId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ).optional(), // Multi-tenant isolation
  collaborators: z.array(z.any()).default([]),
  // Sharing and collaboration settings
  isPublic: z.boolean().optional().default(false),
  shareCode: z.string().optional(),
  sharingEnabled: z.boolean().optional().default(false),
  sharePermission: z.string().optional().default("read-only"),
  // Location fields are optional
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  // City coordinates for map centering
  city_latitude: z.string().optional(),
  city_longitude: z.string().optional(),
  // Hotel/accommodation information
  hotel: z.string().optional(),
  hotel_latitude: z.string().optional(),
  hotel_longitude: z.string().optional(),
  // B2B fields
  trip_type: z.string().optional().default("personal"),
  client_name: z.string().optional(),
  project_type: z.string().optional(),
  organization: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'number') return Math.round(val * 100); // Convert dollars to cents
    // Parse string budget (e.g., "$5000", "5000", "5,000")
    const parsed = parseFloat(val.replace(/[$,\s]/g, ''));
    return isNaN(parsed) ? undefined : Math.round(parsed * 100); // Convert to cents
  }),
  // Trip completion tracking
  completed: z.boolean().optional().default(false),
  completed_at: z.date().optional(),
});

// Helper function to transform database trip to frontend format
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

// Helper function to transform database activity to frontend format
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

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  location_name: text("location_name").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  notes: text("notes"),
  tag: text("tag"),
  assigned_to: text("assigned_to"),
  order: integer("order").notNull(),
  travel_mode: text("travel_mode").default("walking"),
  completed: boolean("completed").default(false),
});

// Create a custom schema that properly handles dates as strings from JSON
export const insertActivitySchema = z.object({
  tripId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  organizationId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ).optional(), // Multi-tenant isolation
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
  trip_id: integer("trip_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  assigned_to: text("assigned_to"),
});

export const insertTodoSchema = z.object({
  tripId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  organizationId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ).optional(),
  task: z.string(),
  completed: z.boolean().optional().default(false),
  assignedTo: z.string().optional(),
});

// Notes schema
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  organization_id: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
  content: text("content").notNull(),
});

export const insertNoteSchema = z.object({
  tripId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  organizationId: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ).optional(),
  content: z.string(),
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

// Enhanced permission system for organizations
export const ORGANIZATION_PERMISSIONS = {
  // Trip permissions
  VIEW_ALL_TRIPS: "view_all_trips",
  EDIT_ALL_TRIPS: "edit_all_trips", 
  CREATE_TRIPS: "create_trips",
  DELETE_TRIPS: "delete_trips",
  
  // Team permissions
  INVITE_MEMBERS: "invite_members",
  MANAGE_MEMBERS: "manage_members",
  VIEW_MEMBERS: "view_members",
  
  // Business permissions
  MANAGE_BUDGETS: "manage_budgets",
  EXPORT_DATA: "export_data",
  ACCESS_ANALYTICS: "access_analytics",
  
  // Admin permissions
  MANAGE_ORGANIZATION: "manage_organization",
  BILLING_ACCESS: "billing_access"
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

// White Label Branding Settings
export const whiteLabelSettings = pgTable("white_label_settings", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  company_name: text("company_name").notNull(),
  company_logo: text("company_logo"),
  tagline: text("tagline"),
  primary_color: text("primary_color").default("#3B82F6"),
  secondary_color: text("secondary_color").default("#64748B"),
  accent_color: text("accent_color").default("#10B981"),
  custom_domain: text("custom_domain"),
  support_email: text("support_email"),
  help_url: text("help_url"),
  footer_text: text("footer_text"),
  status: text("status").default("draft"), // draft, pending_approval, approved, rejected
  approved_by: integer("approved_by").references(() => users.id),
  approved_at: timestamp("approved_at"),
  rejection_reason: text("rejection_reason"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Custom Domain Management
export const customDomains = pgTable("custom_domains", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  domain: text("domain").notNull().unique(),
  subdomain: text("subdomain"), // For subdomain.nestmap.com
  ssl_certificate: text("ssl_certificate"),
  dns_verified: boolean("dns_verified").default(false),
  ssl_verified: boolean("ssl_verified").default(false),
  status: text("status").default("pending"), // pending, active, failed, disabled
  verification_token: text("verification_token"),
  created_at: timestamp("created_at").defaultNow(),
  verified_at: timestamp("verified_at"),
});

// White Label Approval Requests
export const whiteLabelRequests = pgTable("white_label_requests", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  requested_by: integer("requested_by").references(() => users.id).notNull(),
  request_type: text("request_type").notNull(), // branding_update, domain_setup, plan_upgrade
  request_data: jsonb("request_data"), // JSON data for the request
  status: text("status").default("pending"), // pending, approved, rejected
  reviewed_by: integer("reviewed_by").references(() => users.id),
  reviewed_at: timestamp("reviewed_at"),
  review_notes: text("review_notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// White Label Feature Limits
export const whiteLabelFeatures = pgTable("white_label_features", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull(), // basic, premium, enterprise
  custom_logo: boolean("custom_logo").default(false),
  custom_colors: boolean("custom_colors").default(false),
  custom_domain: boolean("custom_domain").default(false),
  remove_branding: boolean("remove_branding").default(false),
  custom_email_templates: boolean("custom_email_templates").default(false),
  api_access: boolean("api_access").default(false),
  max_users: integer("max_users").default(5),
  monthly_price: integer("monthly_price").default(0), // in cents
});

// Admin Audit Log for tracking administrative actions
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  admin_user_id: integer("admin_user_id").references(() => users.id).notNull(),
  action_type: text("action_type").notNull(), // organization_updated, request_reviewed, domain_verified, etc.
  target_organization_id: integer("target_organization_id").references(() => organizations.id),
  action_data: jsonb("action_data"), // JSON data containing details of the action
  ip_address: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas for new tables
export const insertWhiteLabelSettingsSchema = createInsertSchema(whiteLabelSettings).pick({
  organization_id: true,
  company_name: true,
  company_logo: true,
  tagline: true,
  primary_color: true,
  secondary_color: true,
  accent_color: true,
  custom_domain: true,
  support_email: true,
  help_url: true,
  footer_text: true,
});

export const insertCustomDomainSchema = createInsertSchema(customDomains).pick({
  organization_id: true,
  domain: true,
  subdomain: true,
});

export const insertWhiteLabelRequestSchema = createInsertSchema(whiteLabelRequests).pick({
  organization_id: true,
  requested_by: true,
  request_type: true,
  request_data: true,
});

// White Label constants
export const WHITE_LABEL_PLANS = {
  NONE: 'none',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
} as const;

export const WHITE_LABEL_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const DOMAIN_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  FAILED: 'failed',
  DISABLED: 'disabled'
} as const;

// Types for new tables
export type WhiteLabelSettings = typeof whiteLabelSettings.$inferSelect;
export type InsertWhiteLabelSettings = z.infer<typeof insertWhiteLabelSettingsSchema>;

export type CustomDomain = typeof customDomains.$inferSelect;
export type InsertCustomDomain = z.infer<typeof insertCustomDomainSchema>;

export type WhiteLabelRequest = typeof whiteLabelRequests.$inferSelect;
export type InsertWhiteLabelRequest = z.infer<typeof insertWhiteLabelRequestSchema>;

export type WhiteLabelFeature = typeof whiteLabelFeatures.$inferSelect;

export type WhiteLabelPlan = typeof WHITE_LABEL_PLANS[keyof typeof WHITE_LABEL_PLANS];

// Admin Audit Log Types
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;

// Expense Tracking Schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull(), // flight, hotel, meal, transport, misc
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("USD").notNull(),
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

// Calendar Integration Schema
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // google, outlook, apple
  accessToken: text("access_token"), // encrypted
  refreshToken: text("refresh_token"), // encrypted
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

// Trip Collaboration Schema
export const tripCollaborations = pgTable("trip_collaborations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // owner, editor, viewer
  permissions: jsonb("permissions").$type<{
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canApproveExpenses: boolean;
  }>().notNull(),
  invitedBy: integer("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



// Organization Members Types
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;

// Expense Types
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Calendar Integration Types
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;

// Trip Comments Schema
export const tripComments = pgTable("trip_comments", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => tripComments.id, { onDelete: "cascade" }),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Real-time Activity Log Schema
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // created, updated, deleted, commented
  entityType: text("entity_type").notNull(), // trip, activity, expense, comment
  entityId: integer("entity_id"),
  changes: jsonb("changes").$type<Record<string, any>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertTripCommentSchema = createInsertSchema(tripComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  timestamp: true,
  organizationId: true,
});

// Booking Management Schema
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // flight, hotel, activity, transport
  provider: text("provider").notNull(), // amadeus, booking.com, viator
  providerBookingId: text("provider_booking_id"),
  status: text("status").default("pending").notNull(), // pending, confirmed, cancelled, failed
  bookingData: jsonb("booking_data").$type<Record<string, any>>().notNull(),
  totalAmount: integer("total_amount"), // in cents
  currency: text("currency").default("USD").notNull(),
  passengerDetails: jsonb("passenger_details").$type<{
    passengers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      dateOfBirth?: string;
    }>;
  }>(),
  bookingReference: text("booking_reference"),
  confirmationEmail: text("confirmation_email"),
  checkInDate: timestamp("check_in_date"),
  checkOutDate: timestamp("check_out_date"),
  departureDate: timestamp("departure_date"),
  returnDate: timestamp("return_date"),
  cancellationPolicy: jsonb("cancellation_policy").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

// Booking Payment Schema
export const bookingPayments = pgTable("booking_payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("USD").notNull(),
  status: text("status").default("pending").notNull(), // pending, completed, failed, refunded
  paymentMethod: text("payment_method"), // card, bank_transfer, corporate_account
  refundAmount: integer("refund_amount"),
  refundReason: text("refund_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingPaymentSchema = createInsertSchema(bookingPayments).omit({
  id: true,
  createdAt: true,
  organizationId: true,
});

// Trip Collaboration Types
export type TripCollaboration = typeof tripCollaborations.$inferSelect;
export type TripComment = typeof tripComments.$inferSelect;
export type InsertTripComment = z.infer<typeof insertTripCommentSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Approval Workflow Schema
export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  requesterId: integer("requester_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  approverId: integer("approver_id").references(() => users.id),
  entityType: text("entity_type").notNull(), // trip, expense, budget_change, booking
  entityId: integer("entity_id").notNull(),
  requestType: text("request_type").notNull(), // create, modify, delete, budget_increase
  currentData: jsonb("current_data").$type<Record<string, any>>(),
  proposedData: jsonb("proposed_data").$type<Record<string, any>>().notNull(),
  reason: text("reason"),
  businessJustification: text("business_justification"),
  status: text("status").default("pending").notNull(), // pending, approved, rejected, cancelled
  priority: text("priority").default("normal").notNull(), // low, normal, high, urgent
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  autoApprovalRule: text("auto_approval_rule"),
  escalationLevel: integer("escalation_level").default(0),
  dueDate: timestamp("due_date"),
  notificationsSent: jsonb("notifications_sent").$type<Array<{
    type: string;
    sentAt: Date;
    recipient: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

// Approval Rules Schema
export const approvalRules = pgTable("approval_rules", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  conditions: jsonb("conditions").$type<{
    budgetThreshold?: number;
    departmentIds?: number[];
    userRoles?: string[];
    tripDuration?: number;
    destinationCountries?: string[];
    expenseCategories?: string[];
  }>().notNull(),
  approverRoles: jsonb("approver_roles").$type<string[]>().notNull(),
  autoApprove: boolean("auto_approve").default(false),
  escalationDays: integer("escalation_days").default(3),
  requiresBusinessJustification: boolean("requires_business_justification").default(false),
  active: boolean("active").default(true),
  priority: integer("priority").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApprovalRuleSchema = createInsertSchema(approvalRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
});

// Booking Types
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingPayment = typeof bookingPayments.$inferSelect;
export type InsertBookingPayment = z.infer<typeof insertBookingPaymentSchema>;

// Approval Types
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRule = typeof approvalRules.$inferSelect;
export type InsertApprovalRule = z.infer<typeof insertApprovalRuleSchema>;
