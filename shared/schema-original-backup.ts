import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
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
  role: text("role").default("user"), // System-wide role: superadmin_owner, superadmin_staff, superadmin_auditor, admin, manager, user, guest
  role_type: text("role_type").default("corporate"), // Business mode: corporate, agency
  organization_id: integer("organization_id"), // For B2B multi-tenant support
  company: text("company"), // Company name
  job_title: text("job_title"), // Job title
  team_size: text("team_size"), // Team size range
  use_case: text("use_case"), // Primary use case
  last_login: timestamp("last_login"), // Track last login time
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
  // Stripe Connect for corporate cards
  stripe_connect_account_id: text("stripe_connect_account_id"), // Connected Stripe account for this organization
  stripe_connect_onboarded: boolean("stripe_connect_onboarded").default(false),
  stripe_issuing_enabled: boolean("stripe_issuing_enabled").default(false),
  stripe_payments_enabled: boolean("stripe_payments_enabled").default(false),
  stripe_transfers_enabled: boolean("stripe_transfers_enabled").default(false),
  stripe_external_account_id: text("stripe_external_account_id"), // Bank account for payouts
  // Stripe verification requirements tracking
  stripe_requirements_currently_due: jsonb("stripe_requirements_currently_due"),
  stripe_requirements_eventually_due: jsonb("stripe_requirements_eventually_due"),
  stripe_requirements_past_due: jsonb("stripe_requirements_past_due"),
  stripe_requirements_disabled_reason: text("stripe_requirements_disabled_reason"),
  stripe_requirements_current_deadline: timestamp("stripe_requirements_current_deadline"),
  funding_source_id: text("funding_source_id"), // Primary funding source for cards
  funding_source_type: text("funding_source_type"), // bank_account, credit_line, stripe_balance
  funding_source_status: text("funding_source_status").default("pending"), // pending, active, inactive, failed
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  risk_level: text("risk_level").default("low"), // low, medium, high
});

// Custom roles for organizations
export const organizationRoles = pgTable("organization_roles", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(), // Slug/key for the role
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  is_default: boolean("is_default").default(false),
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

export const insertUserSchema = createInsertSchema(users);

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

export const insertOrganizationSchema = createInsertSchema(organizations);

export const insertOrganizationRoleSchema = createInsertSchema(organizationRoles).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);

export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators);

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

// RBAC constants moved to end of file

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

// Trip travelers table for individual traveler information within a trip
export const tripTravelers = pgTable("trip_travelers", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id"), // Linked to actual user account (optional for guests)
  name: text("name").notNull(), // Full name of traveler
  email: text("email"), // Contact email
  phone: text("phone"), // Contact phone number
  date_of_birth: text("date_of_birth"), // Date of birth for flight bookings
  emergency_contact_name: text("emergency_contact_name"), // Emergency contact name
  emergency_contact_phone: text("emergency_contact_phone"), // Emergency contact phone
  emergency_contact_relationship: text("emergency_contact_relationship"), // Emergency contact relationship
  departure_city: text("departure_city"), // Where they're flying from
  departure_country: text("departure_country"),
  departure_latitude: text("departure_latitude"),
  departure_longitude: text("departure_longitude"),
  arrival_preferences: jsonb("arrival_preferences").default({}), // Flight preferences, times, etc.
  accommodation_preferences: jsonb("accommodation_preferences").default({}), // Room type, special needs
  dietary_requirements: text("dietary_requirements"),
  budget_allocation: integer("budget_allocation"), // Individual budget in cents
  travel_class: text("travel_class").default("economy"), // economy, business, first
  is_trip_organizer: boolean("is_trip_organizer").default(false),
  status: text("status").default("confirmed"), // confirmed, pending, cancelled
  notes: text("notes"), // Special requirements or notes
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertTripTravelerSchema = createInsertSchema(tripTravelers).pick({
  trip_id: true,
  user_id: true,
  name: true,
  email: true,
  phone: true,
  date_of_birth: true,
  emergency_contact_name: true,
  emergency_contact_phone: true,
  emergency_contact_relationship: true,
  departure_city: true,
  departure_country: true,
  departure_latitude: true,
  departure_longitude: true,
  arrival_preferences: true,
  accommodation_preferences: true,
  dietary_requirements: true,
  budget_allocation: true,
  travel_class: true,
  is_trip_organizer: true,
  status: true,
  notes: true,
});

export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type InsertTripCollaborator = z.infer<typeof insertTripCollaboratorSchema>;

export type TripTraveler = typeof tripTravelers.$inferSelect;
export type InsertTripTraveler = z.infer<typeof insertTripTravelerSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

// RBAC utility types - definitions moved to end of file

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Move Corporate Card Management System to end of file
// Corporate Card Management System
export const corporateCards = pgTable("corporate_cards", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  stripe_card_id: text("stripe_card_id").notNull(), // Stripe card ID
  card_number_masked: text("card_number_masked").notNull(), // Last 4 digits only
  card_token: text("card_token").notNull(), // Encrypted token for API calls
  card_provider: text("card_provider").notNull(), // stripe, marqeta, etc
  card_type: text("card_type").default("virtual"), // virtual, physical
  status: text("status").default("active"), // active, inactive, frozen, canceled
  spending_limit: integer("spending_limit"), // Limit in cents
  available_balance: integer("available_balance"), // Available balance in cents
  currency: text("currency").default("USD"),
  category_limits: jsonb("category_limits"), // Per-category spending limits
  allowed_merchants: jsonb("allowed_merchants"), // Whitelist of merchant categories
  blocked_merchants: jsonb("blocked_merchants"), // Blacklist of merchant categories
  cardholder_name: text("cardholder_name").notNull(),
  expiry_month: text("expiry_month"),
  expiry_year: text("expiry_year"),
  billing_address: jsonb("billing_address"),
  shipping_address: jsonb("shipping_address"),
  purpose: text("purpose"), // travel, office_supplies, marketing, etc
  department: text("department"),
  cost_center: text("cost_center"),
  manager_id: integer("manager_id"), // Who approves expenses
  auto_lock_triggers: jsonb("auto_lock_triggers"), // Automated controls
  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Cardholders table for Stripe Issuing
export const cardholders = pgTable("cardholders", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  stripe_cardholder_id: text("stripe_cardholder_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone_number: text("phone_number"),
  billing_address: jsonb("billing_address").notNull(),
  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Card transactions table
export const cardTransactions = pgTable("card_transactions", {
  id: serial("id").primaryKey(),
  card_id: integer("card_id").notNull(),
  user_id: integer("user_id").notNull(),
  stripe_transaction_id: text("stripe_transaction_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").default("USD"),
  merchant_name: text("merchant_name").notNull(),
  merchant_category: text("merchant_category"),
  merchant_mcc: text("merchant_mcc"), // Merchant Category Code
  status: text("status").default("pending"), // pending, completed, declined
  transaction_type: text("transaction_type").default("purchase"), // purchase, refund, adjustment
  authorization_code: text("authorization_code"),
  network_transaction_id: text("network_transaction_id"),
  settled_at: timestamp("settled_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Insert schemas for corporate cards
export const insertCorporateCardSchema = createInsertSchema(corporateCards).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCardholderSchema = createInsertSchema(cardholders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCardTransactionSchema = createInsertSchema(cardTransactions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for corporate cards
export type CorporateCard = typeof corporateCards.$inferSelect;
export type InsertCorporateCard = z.infer<typeof insertCorporateCardSchema>;

export type Cardholder = typeof cardholders.$inferSelect;
export type InsertCardholder = z.infer<typeof insertCardholderSchema>;

export type CardTransaction = typeof cardTransactions.$inferSelect;
export type InsertCardTransaction = z.infer<typeof insertCardTransactionSchema>;

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  card_id: integer("card_id"), // If paid with corporate card
  trip_id: integer("trip_id"), // If related to travel
  transaction_id: text("transaction_id"), // External transaction ID
  merchant_name: text("merchant_name").notNull(),
  merchant_category: text("merchant_category"),
  merchant_mcc: text("merchant_mcc"), // Merchant Category Code
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").default("USD"),
  transaction_date: timestamp("transaction_date").notNull(),
  expense_category: text("expense_category").notNull(), // travel, meals, office, etc
  description: text("description"),
  receipt_url: text("receipt_url"),
  receipt_status: text("receipt_status").default("pending"), // pending, uploaded, verified
  business_purpose: text("business_purpose"),
  attendees: jsonb("attendees"), // For meal expenses
  mileage: integer("mileage"), // For vehicle expenses
  status: text("status").default("pending"), // pending, approved, rejected, reimbursed
  approval_status: text("approval_status").default("pending"), // pending, approved, rejected
  approved_by: integer("approved_by"),
  approved_at: timestamp("approved_at"),
  rejection_reason: text("rejection_reason"),
  reimbursement_status: text("reimbursement_status").default("pending"),
  reimbursed_at: timestamp("reimbursed_at"),
  policy_violations: jsonb("policy_violations"), // Any policy violations detected
  tax_deductible: boolean("tax_deductible").default(true),
  billable_to_client: boolean("billable_to_client").default(false),
  client_id: integer("client_id"), // If billable
  project_code: text("project_code"),
  gl_code: text("gl_code"), // General Ledger code
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const spendPolicies = pgTable("spend_policies", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true),
  applies_to: text("applies_to").default("all"), // all, departments, users, roles
  target_departments: jsonb("target_departments"),
  target_users: jsonb("target_users"),
  target_roles: jsonb("target_roles"),

  // Spending limits
  daily_limit: integer("daily_limit"),
  weekly_limit: integer("weekly_limit"),
  monthly_limit: integer("monthly_limit"),
  annual_limit: integer("annual_limit"),

  // Category-specific limits
  category_limits: jsonb("category_limits"), // { "travel": 5000, "meals": 100 }
  merchant_restrictions: jsonb("merchant_restrictions"),

  // Approval workflows
  requires_approval_over: integer("requires_approval_over"), // Amount requiring approval
  auto_approve_under: integer("auto_approve_under"), // Auto-approve small amounts
  approval_chain: jsonb("approval_chain"), // Multi-level approval process

  // Receipt requirements
  receipt_required_over: integer("receipt_required_over"),
  business_purpose_required: boolean("business_purpose_required").default(false),

  // Time restrictions
  allowed_days: jsonb("allowed_days"), // Days of week allowed
  allowed_hours: jsonb("allowed_hours"), // Time ranges allowed

  // Geographic restrictions
  allowed_countries: jsonb("allowed_countries"),
  blocked_countries: jsonb("blocked_countries"),

  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Duplicate declaration removed - using the one defined above

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  budget_type: text("budget_type").notNull(), // department, project, employee, category

  // Budget scope
  department: text("department"),
  project_code: text("project_code"),
  employee_id: integer("employee_id"),
  expense_category: text("expense_category"),

  // Budget amounts
  total_budget: integer("total_budget").notNull(), // Total budget in cents
  spent_amount: integer("spent_amount").default(0),
  committed_amount: integer("committed_amount").default(0), // Pending expenses
  remaining_amount: integer("remaining_amount").notNull(),

  // Time period
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  budget_period: text("budget_period"), // monthly, quarterly, annual

  // Alerts and controls
  alert_thresholds: jsonb("alert_thresholds"), // { "50": ["email"], "80": ["email", "slack"] }
  auto_lock_at_limit: boolean("auto_lock_at_limit").default(false),

  // Ownership
  owner_id: integer("owner_id").notNull(),
  approvers: jsonb("approvers"), // Who can approve budget changes

  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const expenseApprovals = pgTable("expense_approvals", {
  id: serial("id").primaryKey(),
  expense_id: integer("expense_id").notNull(),
  organization_id: integer("organization_id").notNull(),
  approver_id: integer("approver_id").notNull(),
  approval_level: integer("approval_level").default(1), // For multi-level approvals
  status: text("status").default("pending"), // pending, approved, rejected
  comments: text("comments"),
  approved_amount: integer("approved_amount"), // Might be less than requested
  policy_override: boolean("policy_override").default(false),
  override_reason: text("override_reason"),
  processed_at: timestamp("processed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  batch_id: text("batch_id"), // Group reimbursements together

  // Reimbursement details
  total_amount: integer("total_amount").notNull(),
  currency: text("currency").default("USD"),
  expense_ids: jsonb("expense_ids").notNull(), // Array of expense IDs

  // Payment details
  payment_method: text("payment_method"), // direct_deposit, check, payroll
  payment_status: text("payment_status").default("pending"), // pending, processing, paid, failed
  payment_reference: text("payment_reference"), // Bank reference number
  payment_date: timestamp("payment_date"),

  // Banking information
  bank_account_id: text("bank_account_id"),
  routing_number: text("routing_number"),
  account_number_masked: text("account_number_masked"),

  processed_by: integer("processed_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

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
  subdomain: text("subdomain"), // For subdomain.remvana.com
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

// User Sessions for tracking active users
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id),
  session_token: text("session_token").notNull().unique(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  last_activity: timestamp("last_activity").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
});

// Admin Settings for system configuration
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Audit Log for tracking administrative actions
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  admin_user_id: integer("admin_user_id").references(() => users.id).notNull(),
  action_type: text("action_type").notNull(), // SYSTEM_SETTINGS_UPDATE, EMAIL_TEST, etc.
  action_data: jsonb("action_data"), // JSON data containing details of the action
  ip_address: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notifications table for user notifications system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id),
  type: text("type").notNull(), // booking_confirmation, trip_reminder, team_invite, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  read: boolean("read").default(false),
  actions: jsonb("actions"), // Array of action objects with label and url
  metadata: jsonb("metadata"), // Additional context data
  expires_at: timestamp("expires_at"), // Optional expiration for temporary notifications
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
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

// Notifications schema
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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

// Using corporate card expenses table from above instead of this duplicate

// Using corporate card expenses schema defined above

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

// Expense Schema
export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Expense Types
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Calendar Integration Types
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;

// Trip Comments Schema
export const tripComments = pgTable("trip_comments", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  activity_id: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parent_id: integer("parent_id").references((): any => tripComments.id, { onDelete: "cascade" }),
  resolved: boolean("resolved").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
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
  created_at: true,
  updated_at: true,
  organization_id: true,
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

// Superadmin Audit Logs
export const superadminAuditLogs = pgTable("superadmin_audit_logs", {
  id: serial("id").primaryKey(),
  superadmin_user_id: integer("superadmin_user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // user_deactivate, org_disable, role_change, etc.
  target_type: text("target_type").notNull(), // user, organization, trip, etc.
  target_id: text("target_id").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  risk_level: text("risk_level").default("low"), // low, medium, high, critical
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Active Sessions for monitoring
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id),
  session_token: text("session_token"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  last_activity: timestamp("last_activity").defaultNow().notNull(),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// AI Usage Tracking
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id),
  feature: text("feature").notNull(), // trip_optimizer, ai_suggestions, etc.
  tokens_used: integer("tokens_used").notNull(),
  cost_cents: integer("cost_cents").notNull(),
  model: text("model").notNull(),
  success: boolean("success").default(true).notNull(),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Feature Flags
export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  flag_name: text("flag_name").notNull().unique(),
  description: text("description"),
  default_value: boolean("default_value").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Organization Feature Overrides
export const organizationFeatureFlags = pgTable("organization_feature_flags", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  flag_name: text("flag_name").notNull(),
  enabled: boolean("enabled").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Background Jobs
export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  job_type: text("job_type").notNull(), // export_data, send_email, etc.
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  data: jsonb("data").$type<Record<string, any>>(),
  result: jsonb("result").$type<Record<string, any>>(),
  error_message: text("error_message"),
  attempts: integer("attempts").default(0).notNull(),
  max_attempts: integer("max_attempts").default(3).notNull(),
  scheduled_at: timestamp("scheduled_at").defaultNow().notNull(),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Revenue Metrics
export const revenueMetrics = pgTable("revenue_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  mrr: decimal("mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  new_mrr: decimal("new_mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  churned_mrr: decimal("churned_mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  total_customers: integer("total_customers").notNull().default(0),
  new_customers: integer("new_customers").notNull().default(0),
  churned_customers: integer("churned_customers").notNull().default(0),
  churn_rate: decimal("churn_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  growth_rate: decimal("growth_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Superadmin Background Jobs
export const superadminBackgroundJobs = pgTable("superadmin_background_jobs", {
  id: serial("id").primaryKey(),
  job_type: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, any>>(),
  result: jsonb("result").$type<Record<string, any>>(),
  error_message: text("error_message"),
  attempts: integer("attempts").default(0),
  max_attempts: integer("max_attempts").default(3),
  scheduled_at: timestamp("scheduled_at").defaultNow(),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  deployment_id: text("deployment_id").notNull().unique(),
  version: text("version").notNull(),
  environment: text("environment").notNull(),
  deployment_type: text("deployment_type").notNull(),
  status: text("status").notNull().default("pending"),
  deployed_by: integer("deployed_by").references(() => users.id),
  git_commit: text("git_commit"),
  git_branch: text("git_branch"),
  rollback_to: integer("rollback_to"), // Will add self-reference later
  error_logs: text("error_logs"),
  deployment_logs: text("deployment_logs"),
  health_check_status: text("health_check_status"),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Billing Events
export const billingEvents = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  event_type: text("event_type").notNull(), // subscription_created, payment_succeeded, etc.
  stripe_event_id: text("stripe_event_id"),
  amount_cents: integer("amount_cents"),
  currency: text("currency").default("usd"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for superadmin tables
export const insertSuperadminAuditLogSchema = createInsertSchema(superadminAuditLogs).omit({
  id: true,
  created_at: true,
});

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  created_at: true,
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  created_at: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  created_at: true,
});

export const insertOrganizationFeatureFlagSchema = createInsertSchema(organizationFeatureFlags).omit({
  id: true,
  created_at: true,
});

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({
  id: true,
  created_at: true,
});

export const insertBillingEventSchema = createInsertSchema(billingEvents).omit({
  id: true,
  created_at: true,
});

// Superadmin types
export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect;
export type InsertSuperadminAuditLog = z.infer<typeof insertSuperadminAuditLogSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type OrganizationFeatureFlag = typeof organizationFeatureFlags.$inferSelect;
export type InsertOrganizationFeatureFlag = z.infer<typeof insertOrganizationFeatureFlagSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type RevenueMetric = typeof revenueMetrics.$inferSelect;
export type SuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;

// Travel Policy Schema
export const travelPolicies = pgTable("travel_policies", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true),
  applies_to: text("applies_to").default("all"), // all, departments, roles, users
  target_departments: jsonb("target_departments").$type<string[]>(),
  target_roles: jsonb("target_roles").$type<string[]>(),
  target_users: jsonb("target_users").$type<number[]>(),

  // Flight policies
  flight_class_domestic: text("flight_class_domestic").default("economy"), // economy, premium_economy, business, first
  flight_class_international: text("flight_class_international").default("economy"),
  flight_booking_window: integer("flight_booking_window"), // Days in advance required
  flight_price_limit_domestic: integer("flight_price_limit_domestic"), // Price limit in cents
  flight_price_limit_international: integer("flight_price_limit_international"),
  preferred_airlines: jsonb("preferred_airlines").$type<string[]>(),

  // Hotel policies
  hotel_star_rating_max: integer("hotel_star_rating_max").default(4),
  hotel_price_limit_domestic: integer("hotel_price_limit_domestic"), // Per night in cents
  hotel_price_limit_international: integer("hotel_price_limit_international"),
  preferred_hotel_chains: jsonb("preferred_hotel_chains").$type<string[]>(),

  // Ground transport policies
  ground_transport_types: jsonb("ground_transport_types").$type<string[]>(), // taxi, uber, rental_car, public_transport
  rental_car_class: text("rental_car_class").default("economy"),
  ride_share_max_class: text("ride_share_max_class").default("uberx"), // uberx, comfort, black

  // Meal policies
  breakfast_limit: integer("breakfast_limit"), // In cents
  lunch_limit: integer("lunch_limit"),
  dinner_limit: integer("dinner_limit"),
  per_diem_domestic: integer("per_diem_domestic"),
  per_diem_international: jsonb("per_diem_international").$type<Record<string, number>>(), // By country

  // Approval requirements
  requires_pre_approval: boolean("requires_pre_approval").default(false),
  auto_approve_in_policy: boolean("auto_approve_in_policy").default(true),
  approval_chain: jsonb("approval_chain").$type<Array<{level: number, approver_role: string, threshold?: number}>>(),

  // Compliance settings
  require_business_purpose: boolean("require_business_purpose").default(true),
  require_cost_center: boolean("require_cost_center").default(false),
  require_project_code: boolean("require_project_code").default(false),
  allowed_expense_types: jsonb("allowed_expense_types").$type<string[]>(),

  // Time restrictions
  advance_booking_required: integer("advance_booking_required"), // Days
  weekend_travel_allowed: boolean("weekend_travel_allowed").default(false),
  holiday_travel_allowed: boolean("holiday_travel_allowed").default(false),

  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Travel Policy Violations
export const policyViolations = pgTable("policy_violations", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  policy_id: integer("policy_id").references(() => travelPolicies.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  trip_id: integer("trip_id").references(() => trips.id),
  expense_id: integer("expense_id").references(() => expenses.id),
  booking_id: integer("booking_id").references(() => bookings.id),

  violation_type: text("violation_type").notNull(), // over_budget, out_of_policy, no_approval, etc
  violation_details: jsonb("violation_details").$type<{
    rule: string;
    expected: any;
    actual: any;
    difference?: number;
  }>().notNull(),

  severity: text("severity").default("medium"), // low, medium, high, critical
  status: text("status").default("pending"), // pending, approved, rejected, escalated

  justification: text("justification"),
  approved_by: integer("approved_by").references(() => users.id),
  approval_notes: text("approval_notes"),

  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

// Enhanced Expense Receipts with OCR
export const expenseReceipts = pgTable("expense_receipts", {
  id: serial("id").primaryKey(),
  expense_id: integer("expense_id").references(() => expenses.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),

  file_url: text("file_url").notNull(),
  file_type: text("file_type").notNull(), // image/jpeg, image/png, application/pdf
  file_size: integer("file_size"), // In bytes

  // OCR Results
  ocr_status: text("ocr_status").default("pending"), // pending, processing, completed, failed
  ocr_confidence: decimal("ocr_confidence"), // 0-1 confidence score
  ocr_extracted_data: jsonb("ocr_extracted_data").$type<{
    merchant_name?: string;
    amount?: number;
    currency?: string;
    date?: string;
    tax_amount?: number;
    tip_amount?: number;
    items?: Array<{name: string; quantity: number; price: number}>;
    payment_method?: string;
  }>(),

  ocr_raw_text: text("ocr_raw_text"),
  ocr_processed_at: timestamp("ocr_processed_at"),

  verification_status: text("verification_status").default("unverified"), // unverified, verified, flagged
  verified_by: integer("verified_by").references(() => users.id),
  verified_at: timestamp("verified_at"),

  created_at: timestamp("created_at").defaultNow(),
});

// Mileage Tracking
export const mileageTracking = pgTable("mileage_tracking", {
  id: serial("id").primaryKey(),
  expense_id: integer("expense_id").references(() => expenses.id).notNull(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),

  trip_date: date("trip_date").notNull(),
  start_location: text("start_location").notNull(),
  end_location: text("end_location").notNull(),

  // GPS Tracking
  start_latitude: decimal("start_latitude"),
  start_longitude: decimal("start_longitude"),
  end_latitude: decimal("end_latitude"),
  end_longitude: decimal("end_longitude"),

  route_polyline: text("route_polyline"), // Encoded polyline for map display

  distance_miles: decimal("distance_miles").notNull(),
  rate_per_mile: decimal("rate_per_mile").notNull(), // IRS or custom rate
  total_amount: integer("total_amount").notNull(), // In cents

  purpose: text("purpose").notNull(),
  vehicle_type: text("vehicle_type").default("personal"), // personal, company, rental

  tracking_method: text("tracking_method").default("manual"), // manual, gps, connected_car

  created_at: timestamp("created_at").defaultNow(),
});

// Duty of Care - Traveler Tracking
export const travelerTracking = pgTable("traveler_tracking", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  trip_id: integer("trip_id").references(() => trips.id).notNull(),

  current_location: text("current_location"),
  current_latitude: decimal("current_latitude"),
  current_longitude: decimal("current_longitude"),
  location_updated_at: timestamp("location_updated_at"),

  check_in_status: text("check_in_status").default("pending"), // pending, checked_in, delayed, emergency
  last_check_in: timestamp("last_check_in"),
  next_check_in_due: timestamp("next_check_in_due"),

  // Emergency Information
  emergency_contact_notified: boolean("emergency_contact_notified").default(false),
  local_emergency_numbers: jsonb("local_emergency_numbers").$type<{
    police?: string;
    medical?: string;
    embassy?: string;
  }>(),

  // Health & Safety
  travel_alerts: jsonb("travel_alerts").$type<Array<{
    type: string; // weather, political, health, security
    severity: string;
    message: string;
    issued_at: Date;
  }>>(),

  medical_info_on_file: boolean("medical_info_on_file").default(false),
  travel_insurance_policy: text("travel_insurance_policy"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Travel Risk Assessments
export const travelRiskAssessments = pgTable("travel_risk_assessments", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  destination_country: text("destination_country").notNull(),
  destination_city: text("destination_city"),

  risk_level: text("risk_level").default("low"), // low, medium, high, extreme

  // Risk Categories
  health_risk: text("health_risk").default("low"),
  health_details: jsonb("health_details").$type<{
    diseases?: string[];
    vaccinations_required?: string[];
    medical_facilities_quality?: string;
  }>(),

  security_risk: text("security_risk").default("low"),
  security_details: jsonb("security_details").$type<{
    crime_level?: string;
    terrorism_threat?: string;
    civil_unrest?: boolean;
    areas_to_avoid?: string[];
  }>(),

  covid_risk: text("covid_risk").default("low"),
  covid_details: jsonb("covid_details").$type<{
    entry_requirements?: string[];
    quarantine_rules?: string;
    vaccination_required?: boolean;
    testing_required?: boolean;
  }>(),

  travel_advisories: jsonb("travel_advisories").$type<Array<{
    source: string;
    level: string;
    message: string;
    updated_at: Date;
  }>>(),

  last_updated: timestamp("last_updated").defaultNow(),
  expires_at: timestamp("expires_at"),
});

// Corporate Card Integration Enhancements
export const corporateCardPolicies = pgTable("corporate_card_policies", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  card_id: integer("card_id").references(() => corporateCards.id),

  // Real-time controls
  merchant_category_restrictions: jsonb("merchant_category_restrictions").$type<{
    allowed?: string[];
    blocked?: string[];
  }>(),

  time_restrictions: jsonb("time_restrictions").$type<{
    allowed_days?: number[]; // 0-6 (Sunday-Saturday)
    allowed_hours?: {start: string; end: string};
    timezone?: string;
  }>(),

  geographic_restrictions: jsonb("geographic_restrictions").$type<{
    allowed_countries?: string[];
    blocked_countries?: string[];
    allowed_regions?: string[];
  }>(),

  transaction_limits: jsonb("transaction_limits").$type<{
    single_transaction?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    per_merchant_category?: Record<string, number>;
  }>(),

  // Automated actions
  auto_lock_rules: jsonb("auto_lock_rules").$type<Array<{
    condition: string;
    action: string;
  }>>(),

  notification_settings: jsonb("notification_settings").$type<{
    transaction_alerts?: boolean;
    threshold_amount?: number;
    alert_channels?: string[]; // email, sms, push, slack
  }>(),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Integration Mappings for Accounting Software
export const accountingIntegrations = pgTable("accounting_integrations", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  integration_type: text("integration_type").notNull(), // quickbooks, sap, netsuite, xero

  connection_status: text("connection_status").default("disconnected"), // connected, disconnected, error
  last_sync: timestamp("last_sync"),

  // Field Mappings
  expense_category_mappings: jsonb("expense_category_mappings").$type<Record<string, string>>(), // Our category -> Their account
  tax_code_mappings: jsonb("tax_code_mappings").$type<Record<string, string>>(),
  department_mappings: jsonb("department_mappings").$type<Record<string, string>>(),
  project_mappings: jsonb("project_mappings").$type<Record<string, string>>(),

  // Sync Settings
  auto_sync_enabled: boolean("auto_sync_enabled").default(true),
  sync_frequency: text("sync_frequency").default("daily"), // realtime, hourly, daily, weekly
  sync_direction: text("sync_direction").default("one_way"), // one_way, two_way

  // API Credentials (encrypted)
  api_credentials: jsonb("api_credentials").$type<{
    client_id?: string;
    client_secret?: string;
    access_token?: string;
    refresh_token?: string;
    company_id?: string;
  }>(),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertTravelPolicySchema = createInsertSchema(travelPolicies).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPolicyViolationSchema = createInsertSchema(policyViolations).omit({
  id: true,
  created_at: true,
});

export const insertExpenseReceiptSchema = createInsertSchema(expenseReceipts).omit({
  id: true,
  created_at: true,
});

export const insertMileageTrackingSchema = createInsertSchema(mileageTracking).omit({
  id: true,
  created_at: true,
});

export const insertTravelerTrackingSchema = createInsertSchema(travelerTracking).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTravelRiskAssessmentSchema = createInsertSchema(travelRiskAssessments).omit({
  id: true,
  last_updated: true,
});

export const insertCorporateCardPolicySchema = createInsertSchema(corporateCardPolicies).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertAccountingIntegrationSchema = createInsertSchema(accountingIntegrations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for new tables
export type TravelPolicy = typeof travelPolicies.$inferSelect;
export type InsertTravelPolicy = z.infer<typeof insertTravelPolicySchema>;
export type PolicyViolation = typeof policyViolations.$inferSelect;
export type InsertPolicyViolation = z.infer<typeof insertPolicyViolationSchema>;
export type ExpenseReceipt = typeof expenseReceipts.$inferSelect;
export type InsertExpenseReceipt = z.infer<typeof insertExpenseReceiptSchema>;
export type MileageTracking = typeof mileageTracking.$inferSelect;
export type InsertMileageTracking = z.infer<typeof insertMileageTrackingSchema>;
export type TravelerTracking = typeof travelerTracking.$inferSelect;
export type InsertTravelerTracking = z.infer<typeof insertTravelerTrackingSchema>;
export type TravelRiskAssessment = typeof travelRiskAssessments.$inferSelect;
export type InsertTravelRiskAssessment = z.infer<typeof insertTravelRiskAssessmentSchema>;
export type CorporateCardPolicy = typeof corporateCardPolicies.$inferSelect;
export type InsertCorporateCardPolicy = z.infer<typeof insertCorporateCardPolicySchema>;
export type AccountingIntegration = typeof accountingIntegrations.$inferSelect;
export type InsertAccountingIntegration = z.infer<typeof insertAccountingIntegrationSchema>;

// User roles constants
export const USER_ROLES = {
  SUPERADMIN_OWNER: 'superadmin_owner',
  SUPERADMIN_STAFF: 'superadmin_staff',
  SUPERADMIN_AUDITOR: 'superadmin_auditor',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
} as const;

export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES];
export type TripRole = typeof TRIP_ROLES[keyof typeof TRIP_ROLES];
export type OrganizationPlan = typeof ORGANIZATION_PLANS[keyof typeof ORGANIZATION_PLANS];
