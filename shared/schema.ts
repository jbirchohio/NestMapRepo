import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for consumer trip planning app
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").notNull().unique(), // For auth providers
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"), // JWT auth
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  role: text("role").default("user"), // user or admin
  role_type: text("role_type").default("consumer"), // Always consumer
  organization_id: integer("organization_id"), // DEPRECATED - kept for DB compatibility only
  company: text("company"), // DEPRECATED
  job_title: text("job_title"), // DEPRECATED
  team_size: text("team_size"), // DEPRECATED
  use_case: text("use_case"), // DEPRECATED
  
  // Creator fields for template marketplace
  creator_status: text("creator_status").default("none"), // none, pending, approved, verified, suspended
  creator_tier: text("creator_tier").default("new"), // new, trusted, verified, partner
  creator_score: integer("creator_score").default(0), // Overall creator quality score
  templates_published: integer("templates_published").default(0),
  total_template_sales: integer("total_template_sales").default(0),
  total_template_revenue: decimal("total_template_revenue", { precision: 10, scale: 2 }).default("0"),
  creator_verified_at: timestamp("creator_verified_at"),
  creator_bio: text("creator_bio"),
  
  // Stripe customer ID for purchases
  stripe_customer_id: text("stripe_customer_id"),
  
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
});

// DEPRECATED - Organizations table kept for DB migration compatibility only
// This table is not used in the consumer app
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  plan: text("plan").default("free"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// DEPRECATED - Organization roles kept for DB compatibility only
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

// DEPRECATED - Organization members kept for DB compatibility only
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

// Trip collaborators for sharing trips between users
export const tripCollaborators = pgTable("trip_collaborators", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").notNull().default("viewer"), // viewer, editor, owner
  status: text("status").default("pending"), // pending, accepted, declined
  invited_at: timestamp("invited_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
});

// Trips for consumer itinerary planning
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  user_id: integer("user_id").notNull(),
  organizationId: integer("organization_id"), // DEPRECATED - always null
  
  // Location data
  city: text("city"),
  country: text("country"),
  location: text("location"),
  city_latitude: decimal("city_latitude", { precision: 10, scale: 8 }),
  city_longitude: decimal("city_longitude", { precision: 10, scale: 8 }),
  hotel: text("hotel"),
  hotel_latitude: decimal("hotel_latitude", { precision: 10, scale: 8 }),
  hotel_longitude: decimal("hotel_longitude", { precision: 10, scale: 8 }),
  
  // Sharing
  share_code: text("share_code").unique(),
  sharing_enabled: boolean("sharing_enabled").default(false),
  share_permission: text("share_permission").default("read-only"),
  is_public: boolean("is_public").default(false),
  
  // Template source
  source_template_id: integer("source_template_id"),
  
  // Trip metadata
  trip_type: text("trip_type").default("personal"), // Always personal for consumers
  budget: decimal("budget", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  collaborators: jsonb("collaborators").$type<any[]>().default([]),
  status: text("status").default("active"), // active, completed, cancelled, revoked, frozen
  revoked_reason: text("revoked_reason"),
  revoked_at: timestamp("revoked_at"),
  frozen_reason: text("frozen_reason"),
  frozen_at: timestamp("frozen_at"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Activities within trips
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  organization_id: integer("organization_id"), // DEPRECATED - always null
  title: text("title").notNull(),
  date: date("date"),
  time: text("time"),
  location_name: text("location_name"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 10, scale: 8 }),
  notes: text("notes"),
  tag: text("tag"),
  assigned_to: integer("assigned_to"),
  order: integer("order").default(0),
  travel_mode: text("travel_mode"),
  booking_url: text("booking_url"),
  booking_reference: text("booking_reference"),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  provider: text("provider"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip notes
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  content: text("content").notNull(),
  created_by: integer("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Trip todos
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  content: text("content").notNull(),
  is_completed: boolean("is_completed").default(false),
  assigned_to: integer("assigned_to"),
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  activity_id: integer("activity_id"),
  user_id: integer("user_id").notNull(),
  organization_id: integer("organization_id"), // DEPRECATED - always null
  booking_type: text("booking_type").notNull(),
  provider: text("provider"),
  confirmation_number: text("confirmation_number"),
  booking_date: timestamp("booking_date").notNull(),
  check_in_date: date("check_in_date"),
  check_out_date: date("check_out_date"),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  status: text("status").default("confirmed"),
  cancellation_deadline: timestamp("cancellation_deadline"),
  notes: text("notes"),
  booking_details: jsonb("booking_details"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User invitations
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  invitation_code: text("invitation_code").notNull().unique(),
  organization_id: integer("organization_id"), // DEPRECATED
  invited_by: integer("invited_by").notNull(),
  role: text("role").default("user"),
  status: text("status").default("pending"),
  accepted_at: timestamp("accepted_at"),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Waitlist for app beta
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  referral_source: text("referral_source"),
  created_at: timestamp("created_at").defaultNow(),
});

// Templates for trip planning marketplace
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  user_id: integer("user_id").notNull(), // Creator
  trip_data: jsonb("trip_data").notNull(), // Stored itinerary
  destinations: jsonb("destinations").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  duration: integer("duration"), // Days
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  status: text("status").default("draft"), // draft, published, archived
  sales_count: integer("sales_count").default(0),
  view_count: integer("view_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  review_count: integer("review_count").default(0),
  featured: boolean("featured").default(false),
  cover_image: text("cover_image"),
  images: jsonb("images").$type<string[]>().default([]),
  promo_code: text("promo_code"),
  promo_discount: decimal("promo_discount", { precision: 5, scale: 2 }),
  ai_generated: boolean("ai_generated").default(false),
  last_sale_at: timestamp("last_sale_at"),
  verified_purchase: boolean("verified_purchase").default(false),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Template purchases
export const templatePurchases = pgTable("template_purchases", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").notNull(),
  buyer_id: integer("buyer_id").notNull(),
  user_id: integer("user_id"), // DEPRECATED - use buyer_id
  seller_id: integer("seller_id").notNull(),
  trip_id: integer("trip_id"), // Trip created from template
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  platform_fee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  seller_earnings: decimal("seller_earnings", { precision: 10, scale: 2 }).notNull(),
  creator_payout: decimal("creator_payout", { precision: 10, scale: 2 }),
  stripe_fee: decimal("stripe_fee", { precision: 10, scale: 2 }),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  stripe_payment_id: text("stripe_payment_id"),
  stripe_transfer_id: text("stripe_transfer_id"),
  status: text("status").default("pending"), // pending, completed, refunded, disputed
  payout_status: text("payout_status").default("pending"), // pending, processing, completed, failed
  refunded_at: timestamp("refunded_at"),
  refund_amount: decimal("refund_amount", { precision: 10, scale: 2 }),
  disputed_at: timestamp("disputed_at"),
  purchased_at: timestamp("purchased_at").defaultNow(),
});

// Template reviews
export const templateReviews = pgTable("template_reviews", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").notNull(),
  user_id: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  verified_purchase: boolean("verified_purchase").default(false),
  helpful_count: integer("helpful_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Template shares
export const templateShares = pgTable("template_shares", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").notNull(),
  shared_by: integer("shared_by").notNull(),
  share_code: text("share_code").notNull().unique(),
  share_channel: text("share_channel"), // email, social, link
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue_generated: decimal("revenue_generated", { precision: 10, scale: 2 }).default("0"),
  created_at: timestamp("created_at").defaultNow(),
});

// Creator profiles
export const creatorProfiles = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().unique(),
  bio: text("bio"),
  website: text("website"),
  social_links: jsonb("social_links").$type<Record<string, string>>().default({}),
  specialties: jsonb("specialties").$type<string[]>().default([]),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  follower_count: integer("follower_count").default(0),
  total_templates: integer("total_templates").default(0),
  total_sales: integer("total_sales").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Creator balances
export const creatorBalances = pgTable("creator_balances", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().unique(),
  available_balance: decimal("available_balance", { precision: 10, scale: 2 }).default("0"),
  pending_balance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0"),
  lifetime_earnings: decimal("total_earned", { precision: 10, scale: 2 }).default("0"),
  lifetime_payouts: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0"),
  total_sales: integer("total_sales").default(0),
  currency: text("currency").default("USD"),
  stripe_account_id: text("stripe_account_id"),
  stripe_account_status: text("stripe_account_status"),
  bank_account_last4: text("bank_account_last4"),
  bank_account_status: text("bank_account_status"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Viator commissions
export const viatorCommissions = pgTable("viator_commissions", {
  id: serial("id").primaryKey(),
  booking_reference: text("booking_reference").notNull().unique(),
  activity_id: integer("activity_id").notNull(),
  user_id: integer("user_id").notNull(),
  commission_amount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commission_rate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  paid_at: timestamp("paid_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Template collections
export const templateCollections = pgTable("template_collections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  template_ids: jsonb("template_ids").$type<number[]>().default([]),
  is_public: boolean("is_public").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Destinations for SEO content
export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country"),
  title: text("title"),
  meta_description: text("meta_description"),
  hero_description: text("hero_description"),
  overview: text("overview"),
  best_time_to_visit: text("best_time_to_visit"),
  top_attractions: jsonb("top_attractions").$type<string[]>().default([]),
  local_tips: jsonb("local_tips").$type<string[]>().default([]),
  getting_around: text("getting_around"),
  where_to_stay: text("where_to_stay"),
  food_and_drink: text("food_and_drink"),
  faqs: jsonb("faqs").$type<Array<{question: string; answer: string}>>().default([]),
  seasonal_weather: jsonb("seasonal_weather"),
  cover_image: text("cover_image"),
  thumbnail_image: text("thumbnail_image"),
  image_attribution: text("image_attribution"),
  status: text("status").default("draft"), // draft, published, archived
  ai_generated: boolean("ai_generated").default(false),
  view_count: integer("view_count").default(0),
  activity_count: integer("activity_count").default(0),
  template_count: integer("template_count").default(0),
  popularity_score: decimal("popularity_score", { precision: 5, scale: 2 }).default("0"),
  last_regenerated: timestamp("last_regenerated"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// DEPRECATED TABLES - kept as empty shells for DB compatibility only
// These are not used in the consumer app

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  last_four: text("last_four"),
  brand: text("brand"),
  created_at: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const spendControls = pgTable("spend_controls", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const adminBranding = pgTable("admin_branding", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo_url: text("logo_url"),
  favicon_url: text("favicon_url"),
  primary_color: text("primary_color"),
  secondary_color: text("secondary_color"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id"),
  name: text("name").notNull(),
  key_hash: text("key_hash").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  approver_id: integer("approver_id").notNull(),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertTripSchema = createInsertSchema(trips);
export const insertActivitySchema = createInsertSchema(activities);
export const insertNoteSchema = createInsertSchema(notes);
export const insertTodoSchema = createInsertSchema(todos);
export const insertBookingSchema = createInsertSchema(bookings);
export const insertTemplateSchema = createInsertSchema(templates);
export const insertTemplatePurchaseSchema = createInsertSchema(templatePurchases);
export const insertTemplateReviewSchema = createInsertSchema(templateReviews);
export const insertDestinationSchema = createInsertSchema(destinations);

// Simplified user registration schema for consumers
export const registerUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().optional(),
});

// Export types
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplatePurchase = typeof templatePurchases.$inferSelect;
export type TemplateReview = typeof templateReviews.$inferSelect;
export type TemplateShare = typeof templateShares.$inferSelect;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type CreatorBalance = typeof creatorBalances.$inferSelect;
export type ViatorCommission = typeof viatorCommissions.$inferSelect;
export type TemplateCollection = typeof templateCollections.$inferSelect;
export type Destination = typeof destinations.$inferSelect;

// DEPRECATED types - kept for compatibility
export type Organization = typeof organizations.$inferSelect;
export type OrganizationRole = typeof organizationRoles.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type SpendControl = typeof spendControls.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type Approval = typeof approvals.$inferSelect;

// For compatibility - these can be removed once all references are updated
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertOrganizationRoleSchema = createInsertSchema(organizationRoles);
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);