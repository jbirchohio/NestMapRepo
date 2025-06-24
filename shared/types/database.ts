/**
 * Database schema types that align with the database structure.
 * These types are used across both client and server for type safety.
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum OrganizationPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface BaseEntity {
  id: string; // UUID
  created_at: Date;
  updated_at: Date;
}

export interface User extends BaseEntity {
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  password_hash: string;
  password_changed_at: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  mfa_secret: string | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  role: UserRole;
  organization_id: string | null; // UUID
  email_verified: boolean;
  is_active: boolean;
  token_version: number;
  metadata?: Record<string, any>;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  plan: OrganizationPlan;
  status: string;
  billing_email: string | null;
  billing_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  tax_id: string | null;
  timezone: string;
  locale: string;
  settings: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Trip extends BaseEntity {
  title: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  status: string;
  user_id: string; // UUID
  organization_id: string; // UUID
  is_public: boolean;
  destination: string | null;
  budget: number | null;
  currency: string;
  metadata: Record<string, any>;
}

export interface Activity extends BaseEntity {
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  location: string | null;
  trip_id: string; // UUID
  user_id: string; // UUID
  type: string;
  cost: number | null;
  currency: string;
  status: string;
  metadata: Record<string, any>;
}

export interface Booking extends BaseEntity {
  reference: string;
  status: string;
  user_id: string; // UUID
  trip_id: string; // UUID
  activity_id: string | null; // UUID
  provider: string;
  provider_booking_id: string;
  start_date: Date;
  end_date: Date;
  amount: number;
  currency: string;
  details: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CorporateCard extends BaseEntity {
  last_four: string;
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  status: string;
  organization_id: string; // UUID
  user_id: string | null; // UUID (assigned user)
  spending_limit: number | null;
  spending_limit_duration: string | null;
  metadata: Record<string, any>;
}

export interface CardTransaction extends BaseEntity {
  transaction_id: string;
  corporate_card_id: string; // UUID
  user_id: string; // UUID
  organization_id: string; // UUID
  amount: number;
  currency: string;
  description: string;
  merchant_name: string;
  merchant_category: string | null;
  transaction_date: Date;
  status: string;
  is_expense: boolean;
  expense_id: string | null; // UUID
  metadata: Record<string, any>;
}

// Type guards
export function isUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isOrganizationPlan(plan: string): plan is OrganizationPlan {
  return Object.values(OrganizationPlan).includes(plan as OrganizationPlan);
}

// Utility types for database operations
export type EntityKeys<T extends BaseEntity> = keyof T;
export type EntityWithoutId<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type EntityUpdate<T extends BaseEntity> = Partial<EntityWithoutId<T>> & { id: string };
