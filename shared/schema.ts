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

  // Location data
  city: text("city"),
  country: text("country"),
  location: text("location"),
  city_latitude: decimal("city_latitude", { precision: 11, scale: 8 }),
  city_longitude: decimal("city_longitude", { precision: 11, scale: 8 }),
  hotel: text("hotel"),
  hotel_latitude: decimal("hotel_latitude", { precision: 11, scale: 8 }),
  hotel_longitude: decimal("hotel_longitude", { precision: 11, scale: 8 }),

  // Sharing
  share_code: text("share_code").unique(),
  sharing_enabled: boolean("sharing_enabled").default(false),
  share_permission: text("share_permission").default("read-only"),
  is_public: boolean("is_public").default(false),
  
  // Collaborative Mode
  collaborative_mode: boolean("collaborative_mode").default(false),
  allow_anonymous_suggestions: boolean("allow_anonymous_suggestions").default(true),
  
  // Group Trip RSVP
  is_group_trip: boolean("is_group_trip").default(false),
  rsvp_deadline: date("rsvp_deadline"),
  max_attendees: integer("max_attendees"),
  
  // Template source
  source_template_id: integer("source_template_id"),

  // Trip metadata
  trip_type: text("trip_type").default("personal"), // Always personal for consumers
  
  // Family travel
  traveling_with_kids: boolean("traveling_with_kids").default(false),
  kids_ages: jsonb("kids_ages").$type<number[]>(), // Array of kids' ages
  age_ranges: jsonb("age_ranges").$type<{
    toddlers: boolean; // Ages 2-5
    kids: boolean; // Ages 6-12
    teens: boolean; // Ages 13-17
  }>(), // Age range filters
  
  // Budget tracking
  budget: decimal("budget", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  budget_categories: jsonb("budget_categories").$type<{
    accommodation?: number;
    transportation?: number;
    food?: number;
    activities?: number;
    shopping?: number;
    emergency?: number;
  }>(),
  total_spent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  budget_alert_threshold: integer("budget_alert_threshold").default(80), // Percentage
  collaborators: jsonb("collaborators").$type<any[]>().default([]),
  status: text("status").default("active"), // active, completed, cancelled, revoked, frozen
  revoked_reason: text("revoked_reason"),
  revoked_at: timestamp("revoked_at"),
  frozen_reason: text("frozen_reason"),
  frozen_at: timestamp("frozen_at"),
  
  // AI generation tracking
  ai_regenerations_used: integer("ai_regenerations_used").default(0),
  ai_regenerations_limit: integer("ai_regenerations_limit").default(5),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Activities within trips
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  title: text("title").notNull(),
  date: date("date"),
  time: text("time"),
  location_name: text("location_name"),
  latitude: decimal("latitude", { precision: 11, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  notes: text("notes"),
  tag: text("tag"),
  assigned_to: integer("assigned_to"),
  order: integer("order").default(0),
  travel_mode: text("travel_mode"),
  booking_url: text("booking_url"),
  booking_reference: text("booking_reference"),
  
  // Cost tracking
  price: decimal("price", { precision: 10, scale: 2 }), // Estimated cost
  actual_cost: decimal("actual_cost", { precision: 10, scale: 2 }), // What was actually paid
  currency: text("currency").default("USD"),
  cost_category: text("cost_category"), // accommodation, transportation, food, activities, shopping
  split_between: integer("split_between").default(1), // Number of people splitting cost
  is_paid: boolean("is_paid").default(false),
  paid_by: integer("paid_by"), // User ID who paid
  provider: text("provider"),
  
  // Family-friendly fields
  kid_friendly: boolean("kid_friendly").default(false),
  min_age: integer("min_age"), // Minimum recommended age
  max_age: integer("max_age"), // Maximum recommended age  
  stroller_accessible: boolean("stroller_accessible").default(false),
  category: text("category"), // dining, culture, outdoor, shopping, entertainment, etc.
  
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

// Group expense tracking for trip budget splits
export const groupExpenses = pgTable("group_expenses", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  activity_id: integer("activity_id"), // Optional link to activity
  description: text("description").notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  paid_by: integer("paid_by").notNull(), // User who paid
  split_type: text("split_type").default("equal"), // equal, custom, percentage
  split_details: jsonb("split_details").$type<Array<{
    user_id: number;
    amount: number;
    percentage?: number;
    is_settled: boolean;
  }>>().notNull(),
  category: text("category"), // food, transportation, accommodation, activities, shopping
  receipt_url: text("receipt_url"),
  notes: text("notes"),
  is_settled: boolean("is_settled").default(false),
  settled_at: timestamp("settled_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User invitations
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  invitation_code: text("invitation_code").notNull().unique(),
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
  quality_score: integer("quality_score"),
  moderation_status: text("moderation_status").default("pending"), // pending, approved, rejected
  auto_checks_passed: boolean("auto_checks_passed").default(false),
  rejection_reason: text("rejection_reason"),
  moderation_notes: text("moderation_notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Template Bundles
export const templateBundles = pgTable("template_bundles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  creator_id: integer("creator_id").notNull(), // User who created the bundle
  template_ids: jsonb("template_ids").$type<number[]>().notNull(), // Array of template IDs
  
  // Pricing
  bundle_price: decimal("bundle_price", { precision: 10, scale: 2 }).notNull(),
  original_price: decimal("original_price", { precision: 10, scale: 2 }).notNull(), // Sum of individual prices
  discount_percentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  currency: text("currency").default("USD"),
  
  // Bundle metadata
  type: text("type").default("creator"), // 'creator', 'admin', 'seasonal', 'featured'
  tags: jsonb("tags").$type<string[]>().default([]),
  cover_image: text("cover_image"),
  status: text("status").default("draft"), // draft, published, archived
  featured: boolean("featured").default(false),
  
  // Stats
  sales_count: integer("sales_count").default(0),
  view_count: integer("view_count").default(0),
  
  // Special flags
  is_remvana_bundle: boolean("is_remvana_bundle").default(false), // True for admin-created bundles
  valid_from: timestamp("valid_from"),
  valid_until: timestamp("valid_until"),
  max_sales: integer("max_sales"), // Optional limit on bundle sales
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Bundle Purchases
export const bundlePurchases = pgTable("bundle_purchases", {
  id: serial("id").primaryKey(),
  bundle_id: integer("bundle_id").notNull().references(() => templateBundles.id),
  buyer_id: integer("buyer_id").notNull().references(() => users.id),
  
  // Pricing at time of purchase
  purchase_price: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  platform_fee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  creator_earnings: decimal("creator_earnings", { precision: 10, scale: 2 }).notNull(),
  stripe_fee: decimal("stripe_fee", { precision: 10, scale: 2 }),
  
  // Purchase details
  payment_intent_id: text("payment_intent_id"),
  status: text("status").default("pending"), // pending, completed, refunded
  
  // Track which templates were included (in case bundle changes later)
  purchased_template_ids: jsonb("purchased_template_ids").$type<number[]>().notNull(),
  
  purchased_at: timestamp("purchased_at").defaultNow(),
  refunded_at: timestamp("refunded_at"),
});

// Template purchases
export const templatePurchases = pgTable("template_purchases", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").notNull(),
  buyer_id: integer("buyer_id").notNull(),
  seller_id: integer("seller_id").notNull(),
  trip_id: integer("trip_id"), // Trip created from template
  bundle_purchase_id: integer("bundle_purchase_id"), // If purchased as part of a bundle
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
  payout_initiated_at: timestamp("payout_initiated_at"),
  payout_completed_at: timestamp("payout_completed_at"),
  payout_method: text("payout_method"),
  payout_transaction_id: text("payout_transaction_id"),
  payout_notes: text("payout_notes"),
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
  lifetime_earnings: decimal("lifetime_earnings", { precision: 10, scale: 2 }).default("0"),
  lifetime_payouts: decimal("lifetime_payouts", { precision: 10, scale: 2 }).default("0"),
  total_sales: integer("total_sales").default(0),
  currency: text("currency").default("USD"),
  stripe_account_id: text("stripe_account_id"),
  stripe_account_status: text("stripe_account_status"),
  bank_account_last4: text("bank_account_last4"),
  bank_account_status: text("bank_account_status"),
  payout_method: text("payout_method").default("paypal"),
  w9_on_file: boolean("w9_on_file").default(false),
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


// Collaborative Mode - Activity Suggestions
export const activitySuggestions = pgTable("activity_suggestions", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  suggested_by_user_id: integer("suggested_by_user_id"), // null for anonymous suggestions
  suggested_by_name: text("suggested_by_name"), // Name for anonymous users
  title: text("title").notNull(),
  description: text("description"),
  location_name: text("location_name"),
  date: date("date"),
  time: text("time"),
  estimated_cost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: text("status").default("pending"), // pending, accepted, rejected
  votes_up: integer("votes_up").default(0),
  votes_down: integer("votes_down").default(0),
  created_at: timestamp("created_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
  accepted_as_activity_id: integer("accepted_as_activity_id"), // Reference to created activity
});

// Comments on activities and suggestions
export const tripComments = pgTable("trip_comments", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  activity_id: integer("activity_id"), // null if commenting on trip
  suggestion_id: integer("suggestion_id"), // null if not commenting on suggestion
  user_id: integer("user_id"), // null for anonymous
  commenter_name: text("commenter_name"), // Name for anonymous users
  comment: text("comment").notNull(),
  parent_comment_id: integer("parent_comment_id"), // For threaded comments
  created_at: timestamp("created_at").defaultNow(),
});

// Votes on suggestions
export const suggestionVotes = pgTable("suggestion_votes", {
  id: serial("id").primaryKey(),
  suggestion_id: integer("suggestion_id").notNull(),
  user_id: integer("user_id"), // null for anonymous
  voter_identifier: text("voter_identifier"), // IP hash or session ID for anonymous
  vote: text("vote").notNull(), // up or down
  created_at: timestamp("created_at").defaultNow(),
});

// Group Trip RSVPs
export const tripRsvps = pgTable("trip_rsvps", {
  id: serial("id").primaryKey(),
  trip_id: integer("trip_id").notNull(),
  user_id: integer("user_id"), // null for anonymous RSVPs
  email: text("email").notNull(), // For notifications
  name: text("name").notNull(),
  status: text("status").default("pending"), // pending, yes, no, maybe
  attending_count: integer("attending_count").default(1), // Number of people in party
  dietary_restrictions: text("dietary_restrictions"),
  notes: text("notes"),
  responded_at: timestamp("responded_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Promo Codes for template purchases
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // The actual promo code (e.g., "WELCOME20")
  stripe_coupon_id: text("stripe_coupon_id"), // Stripe's coupon ID for checkout
  description: text("description"),
  discount_type: text("discount_type").notNull(), // "percentage" or "fixed"
  discount_amount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(), // 20 for 20% or 5.00 for $5 off
  minimum_purchase: decimal("minimum_purchase", { precision: 10, scale: 2 }), // Minimum order amount
  max_uses: integer("max_uses"), // Total number of times code can be used (null = unlimited)
  max_uses_per_user: integer("max_uses_per_user").default(1), // How many times each user can use it
  used_count: integer("used_count").default(0), // Track total usage
  valid_from: timestamp("valid_from").defaultNow(),
  valid_until: timestamp("valid_until"), // Expiration date
  template_id: integer("template_id"), // Specific template only
  creator_id: integer("creator_id"), // Codes from specific creators
  is_active: boolean("is_active").default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow(),
  created_by: integer("created_by"), // Admin who created the code
});

// Track promo code usage per user
export const promoCodeUses = pgTable("promo_code_uses", {
  id: serial("id").primaryKey(),
  promo_code_id: integer("promo_code_id").notNull().references(() => promoCodes.id),
  user_id: integer("user_id").notNull().references(() => users.id),
  template_purchase_id: integer("template_purchase_id").references(() => templatePurchases.id),
  discount_applied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  used_at: timestamp("used_at").defaultNow(),
});

// Year in Travel Analytics
export const travelAnalytics = pgTable("travel_analytics", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  year: integer("year").notNull(),
  total_trips: integer("total_trips").default(0),
  total_days_traveled: integer("total_days_traveled").default(0),
  countries_visited: jsonb("countries_visited").$type<string[]>().default([]),
  cities_visited: jsonb("cities_visited").$type<string[]>().default([]),
  total_activities: integer("total_activities").default(0),
  favorite_destination: text("favorite_destination"),
  travel_style: text("travel_style"), // adventurer, relaxer, foodie, culture-seeker, family-focused
  total_distance_km: integer("total_distance_km").default(0),
  busiest_month: text("busiest_month"),
  longest_trip_days: integer("longest_trip_days").default(0),
  most_visited_city: text("most_visited_city"),
  travel_personality: text("travel_personality"),
  fun_stats: jsonb("fun_stats").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
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
export const insertActivitySuggestionSchema = createInsertSchema(activitySuggestions);
export const insertTripCommentSchema = createInsertSchema(tripComments);
export const insertSuggestionVoteSchema = createInsertSchema(suggestionVotes);
export const insertTripRsvpSchema = createInsertSchema(tripRsvps);
export const insertTravelAnalyticsSchema = createInsertSchema(travelAnalytics);
export const insertTemplateBundleSchema = createInsertSchema(templateBundles);
export const insertBundlePurchaseSchema = createInsertSchema(bundlePurchases);
export const insertPromoCodeSchema = createInsertSchema(promoCodes);
export const insertPromoCodeUseSchema = createInsertSchema(promoCodeUses);

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
export type ActivitySuggestion = typeof activitySuggestions.$inferSelect;
export type TripComment = typeof tripComments.$inferSelect;
export type SuggestionVote = typeof suggestionVotes.$inferSelect;
export type TripRsvp = typeof tripRsvps.$inferSelect;
export type TravelAnalytics = typeof travelAnalytics.$inferSelect;
export type TemplateBundle = typeof templateBundles.$inferSelect;
export type BundlePurchase = typeof bundlePurchases.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type PromoCodeUse = typeof promoCodeUses.$inferSelect;
