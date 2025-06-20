import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Import types to avoid circular dependencies
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

declare global {
  // This allows us to use the types before they're defined
  // by declaring them in the global scope
  // eslint-disable-next-line no-var
  var __dbSchemaInitialized: boolean | undefined;
}

// Export base table types to avoid circular dependencies
export type BaseTable = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// ======================
// Enums
// ======================

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'manager', 'member', 'guest']);
export const organizationPlanEnum = pgEnum('organization_plan', ['free', 'pro', 'enterprise']);

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';

// ======================
// Constants
// ======================

export const USER_ROLES = {
  SUPERADMIN_OWNER: 'super_admin',
  SUPERADMIN_STAFF: 'admin',
  SUPERADMIN_AUDITOR: 'admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  GUEST: 'guest'
} as const;

export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES];

// ======================
// Table Definitions
// ======================

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  passwordHash: text('password_hash').notNull(),
  passwordChangedAt: timestamp('password_changed_at'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  mfaSecret: text('mfa_secret'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  role: userRoleEnum('role').notNull().default('member'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  emailVerified: boolean('email_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  lockedUntilIdx: index('users_locked_until_idx').on(table.lockedUntil),
  isActiveIdx: index('users_is_active_idx').on(table.isActive),
  userActiveIdx: index('users_active_composite_idx').on(
    table.isActive, 
    table.lockedUntil, 
    table.emailVerified
  ),
  orgUserIdx: index('users_org_composite_idx').on(
    table.organizationId, 
    table.isActive, 
    table.role
  )
}));

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: organizationPlanEnum('plan').notNull().default('free'),
  settings: jsonb('settings').$type<{
    timezone?: string;
    locale?: string;
    whiteLabel?: {
      enabled: boolean;
      logoUrl?: string;
      primaryColor?: string;
    };
  }>(),
  // Stripe fields
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  stripeCurrentPeriodEnd: timestamp('stripe_current_period_end'),
  stripeCancelAtPeriodEnd: boolean('stripe_cancel_at_period_end').default(false),
  // Stripe Connect fields
  stripeConnectAccountId: text('stripe_connect_account_id').unique(),
  stripeExternalAccountId: text('stripe_external_account_id'),
  stripePayoutId: text('stripe_payout_id'),
  stripePayoutStatus: text('stripe_payout_status').$type<'pending' | 'paid' | 'failed' | null>(),
  stripePayoutFailureReason: text('stripe_payout_failure_reason'),
  // Billing details
  billingEmail: text('billing_email'),
  billingAddress: jsonb('billing_address').$type<{
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  }>(),
  // Subscription status
  subscriptionStatus: text('subscription_status').$type<
    'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | null
  >(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});



// Trip Travelers junction table
export const tripTravelers = pgTable('trip_travelers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const corporateCards = pgTable('corporate_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  lastFourDigits: text('last_four_digits').notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cardholders = pgTable('cardholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  cardId: uuid('card_id').references(() => corporateCards.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});



// Password history table
export const passwordHistory = pgTable('password_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
});



// Refresh tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent')
}, (table) => ({
  // Single column indexes
  tokenIdx: index('refresh_tokens_token_idx').on(table.token),
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  revokedIdx: index('refresh_tokens_revoked_idx').on(table.revoked),
  
  // Composite index for token validation (most common query)
  tokenValidationIdx: index('refresh_tokens_validation_idx').on(
    table.token,
    table.revoked,
    table.expiresAt
  ),
  
  // Composite index for user token management
  userTokensIdx: index('refresh_tokens_user_tokens_idx').on(
    table.userId,
    table.revoked,
    table.expiresAt
  ),
  
  // Index for cleanup of expired tokens
  cleanupIdx: index('refresh_tokens_cleanup_idx').on(
    table.expiresAt,
    table.revoked
  )
}));


// Additional Enums for new tables
export const cardTransactionTypeEnum = pgEnum('card_transaction_type', ['purchase', 'refund', 'fee', 'withdrawal', 'adjustment']);
export const cardTransactionStatusEnum = pgEnum('card_transaction_status', ['pending', 'posted', 'declined', 'disputed', 'settled', 'cancelled']);
export const cardTransactionCategoryEnum = pgEnum('card_transaction_category', ['travel', 'meals', 'software', 'office_supplies', 'utilities', 'professional_services', 'advertising', 'equipment', 'other']);

export const tripCollaboratorRoleEnum = pgEnum('trip_collaborator_role', ['admin', 'editor', 'viewer', 'commenter']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);
export const organizationMemberRoleEnum = pgEnum('organization_member_role', ['admin', 'manager', 'member', 'viewer', 'billing']); // Added billing as a common role
export const organizationMemberStatusEnum = pgEnum('organization_member_status', ['active', 'invited', 'suspended', 'inactive']);
export const tripTypeEnum = pgEnum('trip_type', ['personal', 'business']);
export const sharePermissionEnum = pgEnum('share_permission', ['read-only', 'edit']);

// Trips Table
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }), // Nullable, set null if org deleted
  collaborators: jsonb('collaborators').$type<Array<{ userId: string; role: string }>>().default(sql`'[]'::jsonb`), // e.g., [{ userId: 'uuid', role: 'editor' }]
  isPublic: boolean('is_public').default(false),
  shareCode: text('share_code').unique(),
  sharingEnabled: boolean('sharing_enabled').default(false),
  sharePermission: sharePermissionEnum('share_permission').default('read-only'),
  city: text('city'),
  country: text('country'),
  location: text('location'), // Could be more structured, e.g., GeoJSON
  cityLatitude: text('city_latitude'),
  cityLongitude: text('city_longitude'),
  hotel: text('hotel'),
  hotelLatitude: text('hotel_latitude'),
  hotelLongitude: text('hotel_longitude'),
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),
  tripType: tripTypeEnum('trip_type').default('personal'),
  clientName: text('client_name'), // Relevant for business trips
  projectType: text('project_type'), // Relevant for business trips
  budget: integer('budget'), // Store in cents
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Activities Table
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }), // Nullable, set null if org deleted
  title: text('title').notNull(),
  date: timestamp('date').notNull(),
  time: text('time'), // Consider timestamp with timezone if time is critical across zones
  locationName: text('location_name'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  notes: text('notes'),
  tag: text('tag'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }), // Assign to a user
  order: integer('order').default(0),
  travelMode: text('travel_mode'),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Todos Table
export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  task: text('task').notNull(),
  completed: boolean('completed').default(false),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notes Table
export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }), // Can be null if note is general
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }), // Can be null
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Author of the note
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  title: text('title'),
  category: text('category'), // e.g., 'General', 'Flight', 'Hotel'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Trip Collaborators Table
export const tripCollaborators = pgTable('trip_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: tripCollaboratorRoleEnum('role').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  status: invitationStatusEnum('status').default('pending'), // Using invitationStatusEnum for consistency
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tripUserUnique: index('trip_collaborators_trip_user_unique_idx').on(table.tripId, table.userId), // Ensure a user has only one role per trip
}));

// Organization Roles Table (Custom roles within an organization)
export const organizationRoles = pgTable('organization_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., 'Trip Planner', 'Finance Approver'
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default(sql`'[]'::jsonb`), // List of permission keys
  isDefault: boolean('is_default').default(false), // Is this a default role for new members?
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Organization Members Table (Link users to organizations with specific roles)
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: organizationMemberRoleEnum('role').notNull().default('member'), // Role within the organization
  // customRoleId: uuid('custom_role_id').references(() => organizationRoles.id, { onDelete: 'set null' }), // Optional: for more granular custom roles
  permissionsOverride: jsonb('permissions_override').$type<string[]>().default(sql`'[]'::jsonb`), // Specific permissions that override the role
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at'),
  status: organizationMemberStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgUserUnique: index('organization_members_org_user_unique_idx').on(table.organizationId, table.userId), // Ensure a user is only listed once per org
}));

// Invitations Table (For inviting users to organizations or specific resources)
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(), // Email of the invitee
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }), // Invitation to an organization
  // tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }), // Optional: invitation to a specific trip
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }), // User who sent the invitation
  roleToAssign: organizationMemberRoleEnum('role_to_assign'), // Role to assign upon accepting org invitation
  // tripRoleToAssign: tripCollaboratorRoleEnum('trip_role_to_assign'), // Role to assign for trip invitation
  token: text('token').notNull().unique(), // Secure, unique token for the invitation link
  status: invitationStatusEnum('status').default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Card Transactions Table
export const cardTransactions = pgTable('card_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // User who made/is associated with the transaction
  corporateCardId: uuid('corporate_card_id'), // Placeholder for FK to a future 'corporate_cards' table
  amount: integer('amount').notNull(), // In cents
  currency: text('currency').notNull().default('usd'),
  merchantName: text('merchant_name'),
  transactionDate: timestamp('transaction_date').notNull(),
  postedDate: timestamp('posted_date'),
  category: cardTransactionCategoryEnum('category').default('other'),
  type: cardTransactionTypeEnum('type').notNull().default('purchase'),
  status: cardTransactionStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Expenses Table
export const expenseCategoryEnum = pgEnum('expense_category', ['travel', 'meals', 'accommodation', 'software', 'office_supplies', 'other']);
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'approved', 'rejected', 'reimbursed']);
export const calendarProviderEnum = pgEnum('calendar_provider', ['google', 'outlook', 'apple', 'other']);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: 'set null' }), // Expense might not be tied to a trip
  transactionId: uuid("transaction_id").references(() => cardTransactions.id, { onDelete: 'set null' }), // Link to a corporate card transaction
  amount: integer("amount").notNull(), // In cents
  currency: text("currency").default("usd").notNull(),
  description: text("description").notNull(),
  category: expenseCategoryEnum("category").default('other'),
  status: expenseStatusEnum("status").default('pending'),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  expenseDate: timestamp("expense_date").notNull().defaultNow(),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  reimbursedAt: timestamp("reimbursed_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Budgets Table
export const budgetCategoryEnum = pgEnum('budget_category', ['project', 'department', 'trip_type', 'general']);
export const budgetStatusEnum = pgEnum('budget_status', ['active', 'archived', 'planned']);

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // Total budget amount in cents
  currency: text("currency").default("usd").notNull(),
  category: budgetCategoryEnum("category").default('general'),
  status: budgetStatusEnum("status").default('active'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: 'set null' }), // User responsible for the budget
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom Domains Table
export const domainStatusEnum = pgEnum('domain_status', ['pending_verification', 'active', 'failed', 'disabled']);

export const customDomains = pgTable("custom_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull().unique(), // One custom domain per org
  domainName: text("domain_name").notNull().unique(),
  status: domainStatusEnum("status").default('pending_verification'),
  verificationRecordName: text("verification_record_name"), // e.g., TXT record name
  verificationRecordValue: text("verification_record_value"), // e.g., TXT record value
  sslEnabled: boolean("ssl_enabled").default(false),
  sslCertificateArn: text("ssl_certificate_arn"), // If using AWS ACM or similar
  dnsRecords: jsonb("dns_records").$type<Array<{ type: string; name: string; value: string; ttl?: number }>>(), // Required DNS records for setup
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Spend Policies Table
export const spendPolicies = pgTable("spend_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  appliesTo: text("applies_to").default("all"),
  targetDepartments: jsonb("target_departments").$type<Record<string, any>>(),
  targetUsers: jsonb("target_users").$type<Record<string, any>>(),
  targetRoles: jsonb("target_roles").$type<Record<string, any>>(),
  dailyLimit: integer("daily_limit"),
  weeklyLimit: integer("weekly_limit"),
  monthlyLimit: integer("monthly_limit"),
  annualLimit: integer("annual_limit"),
  categoryLimits: jsonb("category_limits").$type<Record<string, any>>(),
  merchantRestrictions: jsonb("merchant_restrictions").$type<Record<string, any>>(),
  requiresApprovalOver: integer("requires_approval_over"),
  autoApproveUnder: integer("auto_approve_under"),
  approvalChain: jsonb("approval_chain").$type<Record<string, any>>(),
  receiptRequiredOver: integer("receipt_required_over"),
  businessPurposeRequired: boolean("business_purpose_required").default(false),
  allowedDays: jsonb("allowed_days").$type<Record<string, any>>(),
  allowedHours: jsonb("allowed_hours").$type<Record<string, any>>(),
  allowedCountries: jsonb("allowed_countries").$type<Record<string, any>>(),
  blockedCountries: jsonb("blocked_countries").$type<Record<string, any>>(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenseApprovals = pgTable("expense_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id").references(() => expenses.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  approverId: uuid("approver_id").references(() => users.id).notNull(),
  approvalLevel: integer("approval_level").default(1),
  status: text("status").default("pending"),
  comments: text("comments"),
  approvedAmount: integer("approved_amount"),
  policyOverride: boolean("policy_override").default(false),
  overrideReason: text("override_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reimbursements = pgTable("reimbursements", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  batchId: text("batch_id"),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("USD"),
  expenseIds: jsonb("expense_ids").$type<string[]>(),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  paymentReference: text("payment_reference"),
  paymentDate: timestamp("payment_date"),
  bankAccountId: text("bank_account_id"),
  routingNumber: text("routing_number"),
  accountNumberMasked: text("account_number_masked"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval Rules Table

export const whiteLabelSettings = pgTable("white_label_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo"),
  tagline: text("tagline"),
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#64748B"),
  accentColor: text("accent_color").default("#10B981"),
  customDomain: text("custom_domain"),
  supportEmail: text("support_email"),
  helpUrl: text("help_url"),
  footerText: text("footer_text"),
  status: text("status").default("draft"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const whiteLabelRequests = pgTable("white_label_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  requestedBy: uuid("requested_by").references(() => users.id).notNull(),
  requestType: text("request_type").notNull(),
  requestData: jsonb("request_data").$type<Record<string, any>>(),
  status: text("status").default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings Table
export const bookingTypeEnum = pgEnum('booking_type', ['flight', 'hotel', 'car', 'train', 'activity', 'other']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed', 'failed']);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
  type: bookingTypeEnum("type").notNull(),
  provider: text("provider").notNull(), // e.g., 'duffel', 'amadeus', 'expedia'
  providerBookingId: text("provider_booking_id"),
  status: bookingStatusEnum("status").default('pending'),
  bookingData: jsonb("booking_data").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  totalAmount: integer("total_amount"), // in cents
  currency: text("currency").default('USD'),
  passengerDetails: jsonb("passenger_details").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  bookingReference: text("booking_reference"),
  cancellationPolicy: jsonb("cancellation_policy").$type<Record<string, any>>(),
  departureDate: timestamp("departure_date"),
  returnDate: timestamp("return_date"),
  checkInDate: timestamp("check_in_date"),
  checkOutDate: timestamp("check_out_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tripIdIdx: index('bookings_trip_id_idx').on(table.tripId),
  userIdIdx: index('bookings_user_id_idx').on(table.userId),
  orgIdIdx: index('bookings_org_id_idx').on(table.organizationId),
  statusIdx: index('bookings_status_idx').on(table.status),
  typeIdx: index('bookings_type_idx').on(table.type),
  bookingRefIdx: index('bookings_reference_idx').on(table.bookingReference),
}));

// Calendar Integrations Table
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  provider: calendarProviderEnum("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  settings: jsonb("settings").$type<{
    defaultReminders?: boolean;
    reminderMinutes?: number[];
    syncHistorical?: boolean;
    syncFuture?: boolean;
    syncDays?: number;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: index('calendar_integrations_user_provider_idx').on(table.userId, table.provider),
  orgUserIdx: index('calendar_integrations_org_user_idx').on(table.organizationId, table.userId),
}));

export const whiteLabelFeatures = pgTable("white_label_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  plan: text("plan").notNull(),
  customLogo: boolean("custom_logo").default(false),
  customColors: boolean("custom_colors").default(false),
  customDomain: boolean("custom_domain").default(false),
  removeBranding: boolean("remove_branding").default(false),
  customEmailTemplates: boolean("custom_email_templates").default(false),
  apiAccess: boolean("api_access").default(false),
  maxUsers: integer("max_users").default(5),
  monthlyPrice: integer("monthly_price").default(0),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feature Flags Table
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").default(false),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  scope: text("scope").default('global'), // global, organization, user
  conditions: jsonb("conditions").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  expiresAt: timestamp("expires_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index('feature_flags_name_idx').on(table.name),
  orgIdx: index('feature_flags_org_idx').on(table.organizationId),
  enabledIdx: index('feature_flags_enabled_idx').on(table.enabled),
}));

export const userActivityLogs = pgTable("user_activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_activity_logs_user_id_idx').on(table.userId),
  orgIdIdx: index('user_activity_logs_organization_id_idx').on(table.organizationId),
  createdAtIdx: index('user_activity_logs_created_at_idx').on(table.createdAt),
}));

// Notifications Table
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organization_id: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'trip_update', 'expense_approval', 'mention', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  action_url: text("action_url"),
  entity_type: text("entity_type"), // 'trip', 'expense', 'comment', etc.
  entity_id: uuid("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.user_id),
  orgIdIdx: index('notifications_org_id_idx').on(table.organization_id),
  readIdx: index('notifications_read_idx').on(table.read),
  createdAtIdx: index('notifications_created_at_idx').on(table.created_at),
}));

// Trip Comments Table
export const tripComments = pgTable("trip_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // Author of the comment
  parentId: uuid("parent_id").references((): AnyPgColumn => tripComments.id, { onDelete: 'cascade' }), // For threaded comments
  content: text("content").notNull(),
  mentionedUserIds: uuid("mentioned_user_ids").array(), // Store as array of UUIDs
  reactions: jsonb("reactions").$type<Record<string, number>>(), // e.g., { '👍': 10, '❤️': 5 }
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false), // Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Approval Rules and Requests Tables
export const approvalRequestTypeEnum = pgEnum('approval_request_type', ['create', 'modify', 'delete', 'approve', 'other']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const approvalRules = pgTable("approval_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entity_type").notNull(), // 'trip', 'expense', 'budget', 'booking', etc.
  conditions: jsonb("conditions").$type<{
    budgetThreshold?: number;
    tripDuration?: number;
    destinationCountries?: string[];
    expenseCategories?: string[];
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  priority: integer("priority").default(10),
  autoApprove: boolean("auto_approve").default(false),
  approverRoles: jsonb("approver_roles").$type<string[]>().default(sql`'["manager"]'::jsonb`),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgEntityTypeIdx: index('approval_rules_org_entity_idx').on(table.organizationId, table.entityType),
  activeIdx: index('approval_rules_active_idx').on(table.active),
}));

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  entityType: text("entity_type").notNull(), // 'trip', 'expense', 'budget', etc.
  entityId: uuid("entity_id"),
  requestType: approvalRequestTypeEnum("request_type").notNull(),
  requesterId: uuid("requester_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  approverId: uuid("approver_id").references(() => users.id, { onDelete: 'set null' }),
  ruleId: uuid("rule_id").references(() => approvalRules.id, { onDelete: 'set null' }),
  proposedData: jsonb("proposed_data").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  reason: text("reason"),
  businessJustification: text("business_justification"),
  status: approvalStatusEnum("status").default('pending'),
  priority: text("priority").default('normal'),
  dueDate: timestamp("due_date"),
  escalationLevel: integer("escalation_level").default(0),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgStatusIdx: index('approval_requests_org_status_idx').on(table.organizationId, table.status),
  requesterIdx: index('approval_requests_requester_idx').on(table.requesterId),
  approverIdx: index('approval_requests_approver_idx').on(table.approverId),
  entityIdx: index('approval_requests_entity_idx').on(table.entityType, table.entityId),
}));

// Audit Logs Table
export const auditLogsTableDefinition = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  orgIdx: index('audit_logs_organization_id_idx').on(table.organizationId),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Admin Audit Log (alias to the main auditLogs table)
export const adminAuditLog = auditLogsTableDefinition;

// Superadmin Audit Log (alias to the main auditLogs table)
export const superadminAuditLogs = auditLogsTableDefinition;


// Base schemas without validation
export const baseUserSchema = createInsertSchema(users);
export const baseOrganizationSchema = createInsertSchema(organizations);

// Extended schemas with validation
export const insertUserSchema = baseUserSchema.extend({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  passwordHash: z.string().min(8, 'Password must be at least 8 characters long')
});

// ... (rest of the code remains the same)

export const insertOrganizationSchema = baseOrganizationSchema.extend({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

export const selectOrganizationSchema = createSelectSchema(organizations);

// Zod schemas for new tables
export const insertTripSchema = createInsertSchema(trips, {
  // Customize Zod validation for specific fields if needed
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.number().int().positive().optional().nullable(), // Assuming budget is in cents
  collaborators: z.array(z.any()).optional(), // Add more specific validation if collaborator structure is known
});
export const selectTripSchema = createSelectSchema(trips);

export const insertActivitySchema = createInsertSchema(activities, {
  date: z.coerce.date(),
});
export const selectActivitySchema = createSelectSchema(activities);

export const insertApprovalRuleSchema = createInsertSchema(approvalRules, {
  conditions: z.record(z.any()).optional(),
  approverRoles: z.array(z.string()).optional(),
});
export const selectApprovalRuleSchema = createSelectSchema(approvalRules);

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests, {
  proposedData: z.record(z.any()).optional(),
});
export const selectApprovalRequestSchema = createSelectSchema(approvalRequests);

export const insertTodoSchema = createInsertSchema(todos, {
  dueDate: z.coerce.date().optional().nullable(),
});
export const selectTodoSchema = createSelectSchema(todos);

export const insertNoteSchema = createInsertSchema(notes);
export const selectNoteSchema = createSelectSchema(notes);

export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators);
export const selectTripCollaboratorSchema = createSelectSchema(tripCollaborators);

export const insertOrganizationRoleSchema = createInsertSchema(organizationRoles, {
  permissions: z.array(z.string()).optional(),
});
export const selectOrganizationRoleSchema = createSelectSchema(organizationRoles);

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers, {
  permissionsOverride: z.array(z.string()).optional(),
});
export const selectOrganizationMemberSchema = createSelectSchema(organizationMembers);

export const insertInvitationSchema = createInsertSchema(invitations, {
  email: z.string().email(),
  expiresAt: z.coerce.date(),
});
export const selectInvitationSchema = createSelectSchema(invitations);

// Zod schemas for TripTravelers, CorporateCards, Cardholders, CardTransactions
export const insertTripTravelerSchema = createInsertSchema(tripTravelers);
export const selectTripTravelerSchema = createSelectSchema(tripTravelers);

export const insertCorporateCardSchema = createInsertSchema(corporateCards, {
});
export const selectCorporateCardSchema = createSelectSchema(corporateCards);

export const insertCardholderSchema = createInsertSchema(cardholders);
export const selectCardholderSchema = createSelectSchema(cardholders);


// Zod schemas for Expenses, Budgets, CustomDomains
export const insertExpenseSchema = createInsertSchema(expenses, {
  amount: z.number().int(), // Amount is required and should be an integer (cents)
  expenseDate: z.coerce.date(),
});
export const selectExpenseSchema = createSelectSchema(expenses);

export const insertBudgetSchema = createInsertSchema(budgets, {
  amount: z.number().int(), // Amount is required and should be an integer (cents)
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
});
export const selectBudgetSchema = createSelectSchema(budgets);

export const insertCustomDomainSchema = createInsertSchema(customDomains, {
  dnsRecords: z.array(z.object({
    type: z.string(),
    name: z.string(),
    value: z.string(),
    ttl: z.number().optional()
  })).optional().nullable()
});
export const selectCustomDomainSchema = createSelectSchema(customDomains);

export const insertSpendPolicySchema = createInsertSchema(spendPolicies);
export const selectSpendPolicySchema = createSelectSchema(spendPolicies);

export const insertExpenseApprovalSchema = createInsertSchema(expenseApprovals);
export const selectExpenseApprovalSchema = createSelectSchema(expenseApprovals);

export const insertReimbursementSchema = createInsertSchema(reimbursements);
export const selectReimbursementSchema = createSelectSchema(reimbursements);

export const insertWhiteLabelSettingsSchema = createInsertSchema(whiteLabelSettings);
export const selectWhiteLabelSettingsSchema = createSelectSchema(whiteLabelSettings);

export const insertWhiteLabelRequestSchema = createInsertSchema(whiteLabelRequests);
export const selectWhiteLabelRequestSchema = createSelectSchema(whiteLabelRequests);

export const insertWhiteLabelFeatureSchema = createInsertSchema(whiteLabelFeatures);
export const selectWhiteLabelFeatureSchema = createSelectSchema(whiteLabelFeatures);

export const insertUserSessionSchema = createInsertSchema(userSessions);
export const selectUserSessionSchema = createSelectSchema(userSessions);

export const insertAdminSettingSchema = createInsertSchema(adminSettings);
export const selectAdminSettingSchema = createSelectSchema(adminSettings);

export const insertCardTransactionSchema = createInsertSchema(cardTransactions);
export const selectCardTransactionSchema = createSelectSchema(cardTransactions);

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs);
export const selectUserActivityLogSchema = createSelectSchema(userActivityLogs);

// Zod schemas for TripComments, ApprovalRequests
export const insertTripCommentSchema = createInsertSchema(tripComments, {
  mentionedUserIds: z.array(z.string().uuid()).optional().nullable(),
  reactions: z.record(z.number()).optional().nullable(),
});
export const selectTripCommentSchema = createSelectSchema(tripComments);

// Approval request schemas are defined earlier in the file

// Zod schemas for aliased audit logs (reuse existing auditLog schemas if compatible or define specific ones if needed)
// Assuming the structure of adminAuditLog and superadminAuditLogs is identical to the main auditLogs table
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog);
export const selectAdminAuditLogSchema = createSelectSchema(adminAuditLog);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type NewPasswordHistory = typeof passwordHistory.$inferInsert;

// Types for new tables
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type NewCalendarIntegration = typeof calendarIntegrations.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type NewTripCollaborator = typeof tripCollaborators.$inferInsert;
export type OrganizationRole = typeof organizationRoles.$inferSelect;
export type NewOrganizationRole = typeof organizationRoles.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

// Types for CardTransactions
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;

// Types for TripTravelers, CorporateCards, Cardholders
export type TripTraveler = typeof tripTravelers.$inferSelect;
export type NewTripTraveler = typeof tripTravelers.$inferInsert;
export type CorporateCard = typeof corporateCards.$inferSelect;
export type NewCorporateCard = typeof corporateCards.$inferInsert;
export type Cardholder = typeof cardholders.$inferSelect;
export type NewCardholder = typeof cardholders.$inferInsert;

// Types for Expenses, Budgets, CustomDomains
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type CustomDomain = typeof customDomains.$inferSelect;
export type NewCustomDomain = typeof customDomains.$inferInsert;
export type SpendPolicy = typeof spendPolicies.$inferSelect;
export type NewSpendPolicy = typeof spendPolicies.$inferInsert;
export type ExpenseApproval = typeof expenseApprovals.$inferSelect;
export type NewExpenseApproval = typeof expenseApprovals.$inferInsert;
export type Reimbursement = typeof reimbursements.$inferSelect;
export type NewReimbursement = typeof reimbursements.$inferInsert;
export type WhiteLabelSetting = typeof whiteLabelSettings.$inferSelect;
export type NewWhiteLabelSetting = typeof whiteLabelSettings.$inferInsert;
export type WhiteLabelRequest = typeof whiteLabelRequests.$inferSelect;
export type NewWhiteLabelRequest = typeof whiteLabelRequests.$inferInsert;
export type WhiteLabelFeature = typeof whiteLabelFeatures.$inferSelect;
export type NewWhiteLabelFeature = typeof whiteLabelFeatures.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type NewAdminSetting = typeof adminSettings.$inferInsert;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type NewUserActivityLog = typeof userActivityLogs.$inferInsert;

// Types for TripComments, ApprovalRequests
export type TripComment = typeof tripComments.$inferSelect;
export type NewTripComment = typeof tripComments.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type ApprovalRule = typeof approvalRules.$inferSelect;
export type NewApprovalRule = typeof approvalRules.$inferInsert;

// Types for aliased audit logs
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
