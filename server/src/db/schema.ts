import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Import types to avoid circular dependencies

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

// General audit logs (alias to the main auditLogs table)
export const auditLogs = auditLogsTableDefinition;


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

// ======================
// NEW SCHEMA ADDITIONS FOR README FEATURES
// ======================

// Voice Interface Tables
export const voiceSessionStatusEnum = pgEnum('voice_session_status', ['active', 'inactive', 'paused', 'completed']);
export const voiceCommandTypeEnum = pgEnum('voice_command_type', ['query', 'booking', 'expense', 'report', 'navigation', 'help']);

export const voiceSessions = pgTable('voice_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  status: voiceSessionStatusEnum('status').default('active'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  totalCommands: integer('total_commands').default(0),
  successfulCommands: integer('successful_commands').default(0),
  language: text('language').default('en'),
  metadata: jsonb('metadata').$type<{
    deviceInfo?: string;
    browserInfo?: string;
    location?: { lat: number; lng: number };
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('voice_sessions_user_id_idx').on(table.userId),
  sessionTokenIdx: index('voice_sessions_token_idx').on(table.sessionToken),
  statusIdx: index('voice_sessions_status_idx').on(table.status),
}));

export const voiceCommands = pgTable('voice_commands', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => voiceSessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  command: text('command').notNull(), // Raw voice input
  processedCommand: text('processed_command'), // Cleaned/processed command
  commandType: voiceCommandTypeEnum('command_type').notNull(),
  intent: text('intent'), // Detected intent from AI
  confidence: integer('confidence'), // Confidence score (0-100)
  response: text('response'), // AI response
  success: boolean('success').default(false),
  executionTime: integer('execution_time'), // Time in milliseconds
  metadata: jsonb('metadata').$type<{
    entities?: Record<string, any>;
    context?: Record<string, any>;
    audioData?: string;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('voice_commands_session_id_idx').on(table.sessionId),
  userIdIdx: index('voice_commands_user_id_idx').on(table.userId),
  commandTypeIdx: index('voice_commands_type_idx').on(table.commandType),
  successIdx: index('voice_commands_success_idx').on(table.success),
}));

// AI Assistant Tables
export const aiConversationStatusEnum = pgEnum('ai_conversation_status', ['active', 'archived', 'deleted']);
export const aiMessageRoleEnum = pgEnum('ai_message_role', ['user', 'assistant', 'system']);

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title'),
  status: aiConversationStatusEnum('status').default('active'),
  context: jsonb('context').$type<{
    currentTrip?: string;
    currentBooking?: string;
    userPreferences?: Record<string, any>;
    sessionData?: Record<string, any>;
  }>().default(sql`'{}'::jsonb`),
  totalMessages: integer('total_messages').default(0),
  lastMessageAt: timestamp('last_message_at'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
  statusIdx: index('ai_conversations_status_idx').on(table.status),
  lastMessageIdx: index('ai_conversations_last_message_idx').on(table.lastMessageAt),
}));

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }).notNull(),
  role: aiMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  tokenCount: integer('token_count'),
  model: text('model').default('gpt-4'),
  responseTime: integer('response_time'), // Time in milliseconds
  metadata: jsonb('metadata').$type<{
    functionCalls?: Record<string, any>[];
    toolUse?: Record<string, any>[];
    attachments?: string[];
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
  roleIdx: index('ai_messages_role_idx').on(table.role),
  createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
}));

// Smart City Integration Tables
export const smartCityDataTypeEnum = pgEnum('smart_city_data_type', ['weather', 'traffic', 'air_quality', 'public_transport', 'events', 'emergency']);
export const iotDeviceTypeEnum = pgEnum('iot_device_type', ['sensor', 'camera', 'beacon', 'display', 'kiosk']);

export const smartCities = pgTable('smart_cities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  timezone: text('timezone').notNull(),
  isActive: boolean('is_active').default(true),
  apiEndpoints: jsonb('api_endpoints').$type<{
    weather?: string;
    traffic?: string;
    transport?: string;
    events?: string;
  }>().default(sql`'{}'::jsonb`),
  configuration: jsonb('configuration').$type<{
    refreshInterval?: number;
    dataRetention?: number;
    alertThresholds?: Record<string, any>;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('smart_cities_name_idx').on(table.name),
  countryIdx: index('smart_cities_country_idx').on(table.country),
  activeIdx: index('smart_cities_active_idx').on(table.isActive),
}));

export const smartCityData = pgTable('smart_city_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  cityId: uuid('city_id').references(() => smartCities.id, { onDelete: 'cascade' }).notNull(),
  dataType: smartCityDataTypeEnum('data_type').notNull(),
  data: jsonb('data').$type<Record<string, any>>().notNull(),
  location: jsonb('location').$type<{
    lat: number;
    lng: number;
    address?: string;
  }>(),
  quality: integer('quality'), // Data quality score (0-100)
  source: text('source'), // Data source identifier
  expiresAt: timestamp('expires_at'),
  collectedAt: timestamp('collected_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  cityDataTypeIdx: index('smart_city_data_city_type_idx').on(table.cityId, table.dataType),
  collectedAtIdx: index('smart_city_data_collected_at_idx').on(table.collectedAt),
  expiresAtIdx: index('smart_city_data_expires_at_idx').on(table.expiresAt),
}));

export const iotDevices = pgTable('iot_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  cityId: uuid('city_id').references(() => smartCities.id, { onDelete: 'cascade' }).notNull(),
  deviceId: text('device_id').notNull().unique(),
  deviceType: iotDeviceTypeEnum('device_type').notNull(),
  name: text('name').notNull(),
  location: jsonb('location').$type<{
    lat: number;
    lng: number;
    address?: string;
  }>().notNull(),
  isOnline: boolean('is_online').default(true),
  lastSeen: timestamp('last_seen'),
  capabilities: jsonb('capabilities').$type<string[]>().default(sql`'[]'::jsonb`),
  metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  cityIdIdx: index('iot_devices_city_id_idx').on(table.cityId),
  deviceIdIdx: index('iot_devices_device_id_idx').on(table.deviceId),
  typeIdx: index('iot_devices_type_idx').on(table.deviceType),
  onlineIdx: index('iot_devices_online_idx').on(table.isOnline),
}));

// Autonomous Vehicle Integration Tables
export const vehicleTypeEnum = pgEnum('vehicle_type', ['sedan', 'suv', 'van', 'truck', 'bus', 'motorcycle']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'booked', 'in_transit', 'maintenance', 'offline']);
export const autonomyLevelEnum = pgEnum('autonomy_level', ['level_0', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5']);

export const autonomousVehicles = pgTable('autonomous_vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  fleetId: text('fleet_id').notNull(),
  vehicleId: text('vehicle_id').notNull().unique(),
  provider: text('provider').notNull(), // 'waymo', 'uber', 'lyft', 'tesla', etc.
  vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
  autonomyLevel: autonomyLevelEnum('autonomy_level').notNull(),
  status: vehicleStatusEnum('status').default('available'),
  currentLocation: jsonb('current_location').$type<{
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
  }>(),
  capacity: integer('capacity').notNull(),
  batteryLevel: integer('battery_level'), // For electric vehicles (0-100)
  features: jsonb('features').$type<{
    accessibility?: boolean;
    wifi?: boolean;
    entertainment?: boolean;
    climate?: boolean;
  }>().default(sql`'{}'::jsonb`),
  operatingZones: jsonb('operating_zones').$type<Array<{
    name: string;
    bounds: { north: number; south: number; east: number; west: number };
  }>>().default(sql`'[]'::jsonb`),
  lastMaintenance: timestamp('last_maintenance'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('autonomous_vehicles_provider_idx').on(table.provider),
  statusIdx: index('autonomous_vehicles_status_idx').on(table.status),
  vehicleIdIdx: index('autonomous_vehicles_vehicle_id_idx').on(table.vehicleId),
  typeIdx: index('autonomous_vehicles_type_idx').on(table.vehicleType),
}));

export const vehicleBookingStatusEnum = pgEnum('vehicle_booking_status', ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']);

export const vehicleBookings = pgTable('vehicle_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
  vehicleId: uuid('vehicle_id').references(() => autonomousVehicles.id, { onDelete: 'cascade' }).notNull(),
  status: vehicleBookingStatusEnum('status').default('pending'),
  pickupLocation: jsonb('pickup_location').$type<{
    lat: number;
    lng: number;
    address: string;
  }>().notNull(),
  dropoffLocation: jsonb('dropoff_location').$type<{
    lat: number;
    lng: number;
    address: string;
  }>().notNull(),
  scheduledPickup: timestamp('scheduled_pickup').notNull(),
  actualPickup: timestamp('actual_pickup'),
  actualDropoff: timestamp('actual_dropoff'),
  estimatedDuration: integer('estimated_duration'), // in minutes
  actualDuration: integer('actual_duration'), // in minutes
  estimatedCost: integer('estimated_cost'), // in cents
  actualCost: integer('actual_cost'), // in cents
  passengerCount: integer('passenger_count').default(1),
  specialRequirements: jsonb('special_requirements').$type<{
    accessibility?: boolean;
    childSeat?: boolean;
    pet?: boolean;
    luggage?: number;
  }>(),
  routeData: jsonb('route_data').$type<{
    distance?: number;
    waypoints?: Array<{ lat: number; lng: number }>;
    trafficConditions?: string;
  }>(),
  providerBookingId: text('provider_booking_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('vehicle_bookings_user_id_idx').on(table.userId),
  tripIdIdx: index('vehicle_bookings_trip_id_idx').on(table.tripId),
  vehicleIdIdx: index('vehicle_bookings_vehicle_id_idx').on(table.vehicleId),
  statusIdx: index('vehicle_bookings_status_idx').on(table.status),
  scheduledPickupIdx: index('vehicle_bookings_scheduled_pickup_idx').on(table.scheduledPickup),
}));

// Platform Marketplace Tables
export const appCategoryEnum = pgEnum('app_category', ['travel', 'expense', 'productivity', 'communication', 'analytics', 'automation', 'other']);
export const appStatusEnum = pgEnum('app_status', ['active', 'inactive', 'pending_review', 'suspended', 'deprecated']);
export const installationStatusEnum = pgEnum('installation_status', ['installed', 'uninstalled', 'updating', 'failed']);

export const marketplaceApps = pgTable('marketplace_apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: appCategoryEnum('category').notNull(),
  status: appStatusEnum('status').default('pending_review'),
  developerId: uuid('developer_id').references(() => users.id, { onDelete: 'set null' }),
  description: text('description'),
  longDescription: text('long_description'),
  version: text('version').notNull(),
  iconUrl: text('icon_url'),
  screenshotUrls: jsonb('screenshot_urls').$type<string[]>().default(sql`'[]'::jsonb`),
  pricing: jsonb('pricing').$type<{
    type: 'free' | 'paid' | 'freemium';
    monthlyPrice?: number;
    yearlyPrice?: number;
    oneTimePrice?: number;
  }>().notNull(),
  permissions: jsonb('permissions').$type<string[]>().default(sql`'[]'::jsonb`),
  apiEndpoints: jsonb('api_endpoints').$type<{
    webhook?: string;
    oauth?: string;
    settings?: string;
  }>(),
  configuration: jsonb('configuration').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  installCount: integer('install_count').default(0),
  rating: integer('rating'), // Average rating (1-5 stars * 100)
  reviewCount: integer('review_count').default(0),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('marketplace_apps_slug_idx').on(table.slug),
  categoryIdx: index('marketplace_apps_category_idx').on(table.category),
  statusIdx: index('marketplace_apps_status_idx').on(table.status),
  ratingIdx: index('marketplace_apps_rating_idx').on(table.rating),
}));

export const appInstallations = pgTable('app_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => marketplaceApps.id, { onDelete: 'cascade' }).notNull(),
  installedBy: uuid('installed_by').references(() => users.id, { onDelete: 'set null' }),
  status: installationStatusEnum('status').default('installed'),
  version: text('version').notNull(),
  configuration: jsonb('configuration').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  permissions: jsonb('permissions').$type<string[]>().default(sql`'[]'::jsonb`),
  apiKey: text('api_key'),
  webhookUrl: text('webhook_url'),
  lastUsed: timestamp('last_used'),
  usageCount: integer('usage_count').default(0),
  installedAt: timestamp('installed_at').notNull().defaultNow(),
  uninstalledAt: timestamp('uninstalled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgAppIdx: index('app_installations_org_app_idx').on(table.organizationId, table.appId),
  statusIdx: index('app_installations_status_idx').on(table.status),
  lastUsedIdx: index('app_installations_last_used_idx').on(table.lastUsed),
}));

export const appReviews = pgTable('app_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => marketplaceApps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  title: text('title'),
  review: text('review'),
  isVerified: boolean('is_verified').default(false),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  appIdIdx: index('app_reviews_app_id_idx').on(table.appId),
  userIdIdx: index('app_reviews_user_id_idx').on(table.userId),
  ratingIdx: index('app_reviews_rating_idx').on(table.rating),
}));

// Advanced Automation Workflows Tables
export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'active', 'inactive', 'archived']);
export const workflowTriggerTypeEnum = pgEnum('workflow_trigger_type', ['manual', 'schedule', 'event', 'webhook', 'condition']);
export const workflowActionTypeEnum = pgEnum('workflow_action_type', ['email', 'sms', 'api_call', 'approval', 'delay', 'condition', 'notification']);

export const automationWorkflows = pgTable('automation_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: workflowStatusEnum('status').default('draft'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config').$type<{
    schedule?: string; // cron expression
    event?: string; // event name
    webhook?: string; // webhook URL
    conditions?: Record<string, any>[];
  }>().notNull(),
  actions: jsonb('actions').$type<Array<{
    id: string;
    type: string;
    config: Record<string, any>;
    order: number;
  }>>().default(sql`'[]'::jsonb`),
  isTemplate: boolean('is_template').default(false),
  executionCount: integer('execution_count').default(0),
  lastExecuted: timestamp('last_executed'),
  nextExecution: timestamp('next_execution'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('automation_workflows_org_id_idx').on(table.organizationId),
  statusIdx: index('automation_workflows_status_idx').on(table.status),
  triggerTypeIdx: index('automation_workflows_trigger_type_idx').on(table.triggerType),
  nextExecutionIdx: index('automation_workflows_next_execution_idx').on(table.nextExecution),
}));

export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', ['pending', 'running', 'completed', 'failed', 'cancelled']);

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => automationWorkflows.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  triggeredBy: uuid('triggered_by').references(() => users.id, { onDelete: 'set null' }),
  status: workflowExecutionStatusEnum('status').default('pending'),
  triggerData: jsonb('trigger_data').$type<Record<string, any>>(),
  executionData: jsonb('execution_data').$type<{
    actions: Array<{
      id: string;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      startTime?: string;
      endTime?: string;
      result?: any;
      error?: string;
    }>;
  }>().default(sql`'{"actions": []}'::jsonb`),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // in milliseconds
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  workflowIdIdx: index('workflow_executions_workflow_id_idx').on(table.workflowId),
  statusIdx: index('workflow_executions_status_idx').on(table.status),
  startedAtIdx: index('workflow_executions_started_at_idx').on(table.startedAt),
}));

// Carbon Footprint Tracking Tables
export const emissionSourceEnum = pgEnum('emission_source', ['flight', 'hotel', 'car', 'train', 'taxi', 'food', 'other']);
export const offsetStatusEnum = pgEnum('offset_status', ['none', 'pending', 'purchased', 'verified', 'retired']);

export const carbonFootprints = pgTable('carbon_footprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  source: emissionSourceEnum('source').notNull(),
  sourceDetails: jsonb('source_details').$type<{
    distance?: number;
    duration?: number;
    vehicleType?: string;
    fuelType?: string;
    occupancy?: number;
  }>(),
  co2Emissions: integer('co2_emissions').notNull(), // in grams
  ch4Emissions: integer('ch4_emissions'), // in grams
  n2oEmissions: integer('n2o_emissions'), // in grams
  totalCo2Equivalent: integer('total_co2_equivalent').notNull(), // in grams
  calculationMethod: text('calculation_method').notNull(),
  calculationDate: timestamp('calculation_date').notNull().defaultNow(),
  offsetStatus: offsetStatusEnum('offset_status').default('none'),
  offsetCost: integer('offset_cost'), // in cents
  offsetProvider: text('offset_provider'),
  offsetCertificate: text('offset_certificate'),
  metadata: jsonb('metadata').$type<{
    coordinates?: { from: { lat: number; lng: number }; to: { lat: number; lng: number } };
    emissionFactors?: Record<string, number>;
    calculationNotes?: string;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('carbon_footprints_user_id_idx').on(table.userId),
  tripIdIdx: index('carbon_footprints_trip_id_idx').on(table.tripId),
  sourceIdx: index('carbon_footprints_source_idx').on(table.source),
  calculationDateIdx: index('carbon_footprints_calculation_date_idx').on(table.calculationDate),
}));

export const carbonOffsets = pgTable('carbon_offsets', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  footprintIds: jsonb('footprint_ids').$type<string[]>().notNull(),
  totalCo2Offset: integer('total_co2_offset').notNull(), // in grams
  cost: integer('cost').notNull(), // in cents
  provider: text('provider').notNull(),
  projectType: text('project_type'), // 'reforestation', 'renewable_energy', etc.
  certificateNumber: text('certificate_number'),
  verificationStandard: text('verification_standard'), // 'VCS', 'Gold Standard', etc.
  purchaseDate: timestamp('purchase_date').notNull(),
  retirementDate: timestamp('retirement_date'),
  status: offsetStatusEnum('status').default('pending'),
  metadata: jsonb('metadata').$type<{
    projectLocation?: string;
    projectDescription?: string;
    vintageYear?: number;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('carbon_offsets_org_id_idx').on(table.organizationId),
  userIdIdx: index('carbon_offsets_user_id_idx').on(table.userId),
  statusIdx: index('carbon_offsets_status_idx').on(table.status),
  purchaseDateIdx: index('carbon_offsets_purchase_date_idx').on(table.purchaseDate),
}));

// Predictive Analytics Tables
export const modelTypeEnum = pgEnum('model_type', ['demand_forecasting', 'cost_optimization', 'disruption_prediction', 'behavior_analysis', 'recommendation']);
export const modelStatusEnum = pgEnum('model_status', ['training', 'active', 'inactive', 'deprecated', 'failed']);
export const predictionStatusEnum = pgEnum('prediction_status', ['pending', 'completed', 'failed', 'expired']);

export const analyticsModels = pgTable('analytics_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  modelType: modelTypeEnum('model_type').notNull(),
  status: modelStatusEnum('status').default('training'),
  version: text('version').notNull(),
  description: text('description'),
  algorithm: text('algorithm').notNull(), // 'linear_regression', 'random_forest', etc.
  parameters: jsonb('parameters').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  trainingData: jsonb('training_data').$type<{
    dataSource: string;
    features: string[];
    target: string;
    dataRange: { start: string; end: string };
  }>(),
  accuracy: integer('accuracy'), // percentage (0-100)
  lastTraining: timestamp('last_training'),
  nextTraining: timestamp('next_training'),
  predictionCount: integer('prediction_count').default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('analytics_models_org_id_idx').on(table.organizationId),
  typeIdx: index('analytics_models_type_idx').on(table.modelType),
  statusIdx: index('analytics_models_status_idx').on(table.status),
}));

export const predictions = pgTable('predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id').references(() => analyticsModels.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: text('entity_type'), // 'trip', 'expense', 'booking', etc.
  entityId: uuid('entity_id'),
  inputData: jsonb('input_data').$type<Record<string, any>>().notNull(),
  prediction: jsonb('prediction').$type<{
    value: any;
    confidence: number;
    alternatives?: Array<{ value: any; confidence: number }>;
  }>().notNull(),
  status: predictionStatusEnum('status').default('pending'),
  accuracy: integer('accuracy'), // actual vs predicted accuracy (0-100)
  feedback: jsonb('feedback').$type<{
    actualValue?: any;
    userRating?: number;
    comments?: string;
  }>(),
  expiresAt: timestamp('expires_at'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  modelIdIdx: index('predictions_model_id_idx').on(table.modelId),
  entityIdx: index('predictions_entity_idx').on(table.entityType, table.entityId),
  statusIdx: index('predictions_status_idx').on(table.status),
  createdAtIdx: index('predictions_created_at_idx').on(table.createdAt),
}));

export const analyticsReports = pgTable('analytics_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  reportType: text('report_type').notNull(), // 'dashboard', 'scheduled', 'ad_hoc'
  configuration: jsonb('configuration').$type<{
    metrics: string[];
    filters: Record<string, any>;
    dateRange: { start: string; end: string };
    visualizations: Array<{ type: string; config: Record<string, any> }>;
  }>().notNull(),
  data: jsonb('data').$type<Record<string, any>>(),
  schedule: text('schedule'), // cron expression for scheduled reports
  lastGenerated: timestamp('last_generated'),
  nextGeneration: timestamp('next_generation'),
  isPublic: boolean('is_public').default(false),
  shareToken: text('share_token').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('analytics_reports_org_id_idx').on(table.organizationId),
  userIdIdx: index('analytics_reports_user_id_idx').on(table.userId),
  typeIdx: index('analytics_reports_type_idx').on(table.reportType),
  shareTokenIdx: index('analytics_reports_share_token_idx').on(table.shareToken),
}));

// Zod schemas for new tables
export const insertVoiceSessionSchema = createInsertSchema(voiceSessions);
export const selectVoiceSessionSchema = createSelectSchema(voiceSessions);

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands);
export const selectVoiceCommandSchema = createSelectSchema(voiceCommands);

export const insertAiConversationSchema = createInsertSchema(aiConversations);
export const selectAiConversationSchema = createSelectSchema(aiConversations);

export const insertAiMessageSchema = createInsertSchema(aiMessages);
export const selectAiMessageSchema = createSelectSchema(aiMessages);

export const insertSmartCitySchema = createInsertSchema(smartCities);
export const selectSmartCitySchema = createSelectSchema(smartCities);

export const insertSmartCityDataSchema = createInsertSchema(smartCityData);
export const selectSmartCityDataSchema = createSelectSchema(smartCityData);

export const insertIotDeviceSchema = createInsertSchema(iotDevices);
export const selectIotDeviceSchema = createSelectSchema(iotDevices);

export const insertAutonomousVehicleSchema = createInsertSchema(autonomousVehicles);
export const selectAutonomousVehicleSchema = createSelectSchema(autonomousVehicles);

export const insertVehicleBookingSchema = createInsertSchema(vehicleBookings);
export const selectVehicleBookingSchema = createSelectSchema(vehicleBookings);

export const insertMarketplaceAppSchema = createInsertSchema(marketplaceApps);
export const selectMarketplaceAppSchema = createSelectSchema(marketplaceApps);

export const insertAppInstallationSchema = createInsertSchema(appInstallations);
export const selectAppInstallationSchema = createSelectSchema(appInstallations);

export const insertAppReviewSchema = createInsertSchema(appReviews);
export const selectAppReviewSchema = createSelectSchema(appReviews);

export const insertAutomationWorkflowSchema = createInsertSchema(automationWorkflows);
export const selectAutomationWorkflowSchema = createSelectSchema(automationWorkflows);

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);
export const selectWorkflowExecutionSchema = createSelectSchema(workflowExecutions);

export const insertCarbonFootprintSchema = createInsertSchema(carbonFootprints);
export const selectCarbonFootprintSchema = createSelectSchema(carbonFootprints);

export const insertCarbonOffsetSchema = createInsertSchema(carbonOffsets);
export const selectCarbonOffsetSchema = createSelectSchema(carbonOffsets);

export const insertAnalyticsModelSchema = createInsertSchema(analyticsModels);
export const selectAnalyticsModelSchema = createSelectSchema(analyticsModels);

export const insertPredictionSchema = createInsertSchema(predictions);
export const selectPredictionSchema = createSelectSchema(predictions);

export const insertAnalyticsReportSchema = createInsertSchema(analyticsReports);
export const selectAnalyticsReportSchema = createSelectSchema(analyticsReports);

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

// Types for new tables - Voice Interface
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type NewVoiceSession = typeof voiceSessions.$inferInsert;
export type VoiceCommand = typeof voiceCommands.$inferSelect;
export type NewVoiceCommand = typeof voiceCommands.$inferInsert;

// Types for AI Assistant
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

// Types for Smart City Integration
export type SmartCity = typeof smartCities.$inferSelect;
export type NewSmartCity = typeof smartCities.$inferInsert;
export type SmartCityData = typeof smartCityData.$inferSelect;
export type NewSmartCityData = typeof smartCityData.$inferInsert;
export type IotDevice = typeof iotDevices.$inferSelect;
export type NewIotDevice = typeof iotDevices.$inferInsert;

// Types for Autonomous Vehicle Integration
export type AutonomousVehicle = typeof autonomousVehicles.$inferSelect;
export type NewAutonomousVehicle = typeof autonomousVehicles.$inferInsert;
export type VehicleBooking = typeof vehicleBookings.$inferSelect;
export type NewVehicleBooking = typeof vehicleBookings.$inferInsert;

// Types for Platform Marketplace
export type MarketplaceApp = typeof marketplaceApps.$inferSelect;
export type NewMarketplaceApp = typeof marketplaceApps.$inferInsert;
export type AppInstallation = typeof appInstallations.$inferSelect;
export type NewAppInstallation = typeof appInstallations.$inferInsert;
export type AppReview = typeof appReviews.$inferSelect;
export type NewAppReview = typeof appReviews.$inferInsert;

// Types for Advanced Automation
export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type NewAutomationWorkflow = typeof automationWorkflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;

// Types for Carbon Footprint Tracking
export type CarbonFootprint = typeof carbonFootprints.$inferSelect;
export type NewCarbonFootprint = typeof carbonFootprints.$inferInsert;
export type CarbonOffset = typeof carbonOffsets.$inferSelect;
export type NewCarbonOffset = typeof carbonOffsets.$inferInsert;

// Types for Predictive Analytics
export type AnalyticsModel = typeof analyticsModels.$inferSelect;
export type NewAnalyticsModel = typeof analyticsModels.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type AnalyticsReport = typeof analyticsReports.$inferSelect;
export type NewAnalyticsReport = typeof analyticsReports.$inferInsert;
