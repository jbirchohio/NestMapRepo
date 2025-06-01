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
  isPublic: boolean("is_public").default(false),
  shareCode: text("share_code").unique(),
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
  budget: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'number') return Math.round(val * 100); // Convert dollars to cents
    // Parse string budget (e.g., "$5000", "5000", "5,000")
    const parsed = parseFloat(val.replace(/[$,\s]/g, ''));
    return isNaN(parsed) ? undefined : Math.round(parsed * 100); // Convert to cents
  }),
  // Trip completion tracking
  completed: z.boolean().optional().default(false),
  completedAt: z.date().optional(),
});

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
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
  tripId: integer("trip_id").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  assignedTo: text("assigned_to"),
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
  tripId: integer("trip_id").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id), // Multi-tenant isolation
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

// Organization Members Types
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
