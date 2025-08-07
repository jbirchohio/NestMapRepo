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
  
  // Creator fields
  creator_status: text("creator_status").default("none"), // none, pending, approved, verified, suspended
  creator_tier: text("creator_tier").default("new"), // new, trusted, verified, partner
  creator_score: integer("creator_score").default(0), // Overall creator quality score
  templates_published: integer("templates_published").default(0),
  total_template_sales: integer("total_template_sales").default(0),
  creator_verified_at: timestamp("creator_verified_at"),
  creator_bio: text("creator_bio"),
  
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
  reference_number: text("reference_number"), // For tracking
  confirmation_number: text("confirmation_number"), // Actual confirmation
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  booking_data: jsonb("booking_data"), // Full booking details
  details: jsonb("details"), // Additional details
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Subscription management
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().unique(),
  tier: text("tier").default("free"), // free, explorer, adventurer
  status: text("status").default("active"), // active, cancelling, cancelled, past_due
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Track feature usage for limits
export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  feature: text("feature").notNull(), // ai_suggestion, trip_created, etc
  count: integer("count").default(1),
  metadata: jsonb("metadata"),
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

// ======================================
// CREATOR ECONOMY TABLES
// ======================================

// Trip templates marketplace
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  cover_image: text("cover_image"),
  destinations: jsonb("destinations").$type<string[]>().default([]), // ["Paris", "London"]
  duration: integer("duration"), // days
  trip_data: jsonb("trip_data"), // Full itinerary JSON
  tags: jsonb("tags").$type<string[]>().default([]), // ["romantic", "budget", "foodie"]
  sales_count: integer("sales_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  review_count: integer("review_count").default(0),
  status: text("status").default("draft"), // draft, published, archived
  featured: boolean("featured").default(false),
  view_count: integer("view_count").default(0),
  
  // Quality & Moderation fields
  quality_score: integer("quality_score").default(0), // 0-100
  moderation_status: text("moderation_status").default("pending"), // pending, approved, rejected, flagged
  moderation_notes: text("moderation_notes"),
  auto_checks_passed: boolean("auto_checks_passed").default(false),
  rejection_reason: text("rejection_reason"),
  verified_at: timestamp("verified_at"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Template purchases tracking
export const templatePurchases = pgTable("template_purchases", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => templates.id).notNull(),
  buyer_id: integer("buyer_id").references(() => users.id).notNull(), // keep buyer_id for now
  user_id: integer("user_id").references(() => users.id), // alias for buyer_id
  seller_id: integer("seller_id").references(() => users.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  platform_fee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  seller_earnings: decimal("seller_earnings", { precision: 10, scale: 2 }).notNull(),
  creator_payout: decimal("creator_payout", { precision: 10, scale: 2 }), // alias for seller_earnings
  stripe_payment_id: text("stripe_payment_id"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  status: text("status").default("pending"), // pending, completed, refunded
  payout_status: text("payout_status").default("pending"), // pending, processing, completed
  payout_initiated_at: timestamp("payout_initiated_at"),
  payout_completed_at: timestamp("payout_completed_at"),
  payout_method: text("payout_method"), // paypal, stripe, manual
  payout_transaction_id: text("payout_transaction_id"),
  payout_notes: text("payout_notes"),
  refunded_at: timestamp("refunded_at"),
  purchased_at: timestamp("purchased_at").defaultNow()
});

// Creator payouts management
export const creatorPayouts = pgTable("creator_payouts", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(), // paypal, amazon, credits, bank
  status: text("status").default("pending"), // pending, processing, completed, failed
  processed_at: timestamp("processed_at"),
  paypal_batch_id: text("paypal_batch_id"),
  paypal_payout_id: text("paypal_payout_id"),
  gift_card_code: text("gift_card_code"),
  notes: text("notes"),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow()
});

// Creator balance tracking
export const creatorBalances = pgTable("creator_balances", {
  user_id: integer("user_id").references(() => users.id).primaryKey(),
  available_balance: decimal("available_balance", { precision: 10, scale: 2 }).default("0"),
  pending_balance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0"),
  lifetime_earnings: decimal("lifetime_earnings", { precision: 10, scale: 2 }).default("0"),
  lifetime_payouts: decimal("lifetime_payouts", { precision: 10, scale: 2 }).default("0"),
  total_sales: integer("total_sales").default(0),
  last_payout_at: timestamp("last_payout_at"),
  payout_method: text("payout_method"), // preferred payout method
  payout_email: text("payout_email"), // PayPal email
  tax_info_submitted: boolean("tax_info_submitted").default(false),
  w9_on_file: boolean("w9_on_file").default(false),
  updated_at: timestamp("updated_at").defaultNow()
});

// Template reviews and ratings
export const templateReviews = pgTable("template_reviews", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => templates.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  purchase_id: integer("purchase_id").references(() => templatePurchases.id),
  rating: integer("rating").notNull(), // 1-5
  review: text("review"),
  helpful_count: integer("helpful_count").default(0),
  verified_purchase: boolean("verified_purchase").default(false),
  creator_response: text("creator_response"),
  creator_responded_at: timestamp("creator_responded_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Track template sharing for viral growth
export const templateShares = pgTable("template_shares", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => templates.id).notNull(),
  shared_by: integer("shared_by").references(() => users.id),
  platform: text("platform").notNull(), // twitter, facebook, whatsapp, email, link
  share_code: text("share_code").unique(),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue_generated: decimal("revenue_generated", { precision: 10, scale: 2 }).default("0"),
  created_at: timestamp("created_at").defaultNow()
});

// Creator profiles for marketplace
export const creatorProfiles = pgTable("creator_profiles", {
  user_id: integer("user_id").references(() => users.id).primaryKey(),
  bio: text("bio"),
  specialties: jsonb("specialties").$type<string[]>().default([]), // ["Europe", "Budget Travel", "Food Tours"]
  social_twitter: text("social_twitter"),
  social_instagram: text("social_instagram"),
  social_youtube: text("social_youtube"),
  website_url: text("website_url"),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  follower_count: integer("follower_count").default(0),
  total_templates: integer("total_templates").default(0),
  total_sales: integer("total_sales").default(0),
  average_rating: decimal("average_rating", { precision: 3, scale: 2 }),
  stripe_connect_account_id: text("stripe_connect_account_id"),
  stripe_connect_onboarded: boolean("stripe_connect_onboarded").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Viator commission tracking from template-generated bookings
export const viatorCommissions = pgTable("viator_commissions", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => templates.id),
  creator_id: integer("creator_id").references(() => users.id).notNull(),
  buyer_id: integer("buyer_id").references(() => users.id).notNull(),
  activity_id: integer("activity_id").references(() => activities.id),
  booking_id: integer("booking_id").references(() => bookings.id),
  viator_product_id: text("viator_product_id"),
  booking_amount: decimal("booking_amount", { precision: 10, scale: 2 }).notNull(),
  commission_rate: decimal("commission_rate", { precision: 5, scale: 2 }).default("8"), // 8% default
  commission_amount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  creator_share_rate: decimal("creator_share_rate", { precision: 5, scale: 2 }).default("50"), // Creator gets 50% of commission
  creator_earnings: decimal("creator_earnings", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, confirmed, paid
  confirmed_at: timestamp("confirmed_at"),
  paid_at: timestamp("paid_at"),
  created_at: timestamp("created_at").defaultNow()
});

// Template collections for bundling
export const templateCollections = pgTable("template_collections", {
  id: serial("id").primaryKey(),
  creator_id: integer("creator_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  cover_image: text("cover_image"),
  template_ids: jsonb("template_ids").$type<number[]>().default([]),
  price: decimal("price", { precision: 10, scale: 2 }),
  discount_percentage: integer("discount_percentage"),
  sales_count: integer("sales_count").default(0),
  status: text("status").default("draft"), // draft, published, archived
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
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

// Creator economy types
export type Template = typeof templates.$inferSelect;
export type TemplatePurchase = typeof templatePurchases.$inferSelect;
export type CreatorPayout = typeof creatorPayouts.$inferSelect;
export type CreatorBalance = typeof creatorBalances.$inferSelect;
export type TemplateReview = typeof templateReviews.$inferSelect;
export type TemplateShare = typeof templateShares.$inferSelect;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type ViatorCommission = typeof viatorCommissions.$inferSelect;
export type TemplateCollection = typeof templateCollections.$inferSelect;