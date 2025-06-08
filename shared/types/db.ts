import { BaseModel } from './base';

/**
 * Database schema types for TypeScript type safety
 */

// User table
export interface UserTable extends BaseModel {
  email: string;
  username: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  organization_id: number | null;
  email_verified: boolean;
  verification_token: string | null;
  reset_password_token: string | null;
  reset_password_expires: Date | null;
  last_login: Date | null;
  timezone: string;
  locale: string;
  settings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

// Organization table
export interface OrganizationTable extends BaseModel {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: number | null;
  plan: string;
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
  metadata: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

// Organization member table
export interface OrganizationMemberTable extends BaseModel {
  user_id: number;
  organization_id: number;
  role: string;
  title: string | null;
  department: string | null;
  join_date: Date;
  permissions: string[];
  metadata: Record<string, unknown> | null;
}

// Trip table
export interface TripTable extends BaseModel {
  title: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  status: string;
  visibility: string;
  user_id: number;
  organization_id: number;
  destination: string | null;
  cover_image_url: string | null;
  tags: string[];
  budget: number | null;
  currency: string;
  timezone: string;
  is_business: boolean;
  is_international: boolean;
  metadata: Record<string, unknown> | null;
}

// Activity table
export interface ActivityTable extends BaseModel {
  trip_id: number;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  type_id: number | null;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  is_flexible: boolean;
  is_booked: boolean;
  booking_id: string | null;
  metadata: Record<string, unknown> | null;
}

// Booking table
export interface BookingTable extends BaseModel {
  reference: string;
  type: string;
  status: string;
  booking_date: Date;
  check_in_date: Date | null;
  check_out_date: Date | null;
  amount: number;
  currency: string;
  provider: string;
  provider_booking_id: string;
  user_id: number;
  organization_id: number;
  trip_id: number | null;
  activity_id: number | null;
  notes: string | null;
  cancellation_policy: string | null;
  cancellation_deadline: Date | null;
  metadata: Record<string, unknown> | null;
}

// Activity type table
export interface ActivityTypeTable extends BaseModel {
  name: string;
  icon: string | null;
  color: string | null;
  is_custom: boolean;
  user_id: number | null;
  organization_id: number | null;
}

// Organization invitation table
export interface OrganizationInvitationTable extends BaseModel {
  email: string;
  organization_id: number;
  role: string;
  invited_by: number;
  expires_at: Date;
  status: string;
  token: string;
  metadata: Record<string, unknown> | null;
}

// API key table
export interface ApiKeyTable extends BaseModel {
  user_id: number;
  organization_id: number | null;
  name: string;
  key: string;
  secret: string;
  scopes: string[];
  expires_at: Date | null;
  last_used_at: Date | null;
  metadata: Record<string, unknown> | null;
}

// Audit log table
export interface AuditLogTable extends BaseModel {
  user_id: number | null;
  organization_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | number;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
}

// File upload table
export interface FileUploadTable extends BaseModel {
  user_id: number;
  organization_id: number | null;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  thumbnail_url: string | null;
  metadata: Record<string, unknown> | null;
}

// Database schema type
export interface DatabaseSchema {
  users: UserTable;
  organizations: OrganizationTable;
  organization_members: OrganizationMemberTable;
  trips: TripTable;
  activities: ActivityTable;
  activity_types: ActivityTypeTable;
  bookings: BookingTable;
  organization_invitations: OrganizationInvitationTable;
  api_keys: ApiKeyTable;
  audit_logs: AuditLogTable;
  file_uploads: FileUploadTable;
}
