import { BaseModel, PaginationParams, PaginatedResponse } from './base';

export type OrganizationPlan = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
export type OrganizationStatus = 'active' | 'suspended' | 'deleted' | 'pending';

export interface Organization extends BaseModel {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: number | null;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  billingEmail?: string | null;
  billingName?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  taxId?: string | null;
  timezone: string;
  locale: string;
  metadata?: Record<string, unknown>;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  features: {
    advancedAnalytics: boolean;
    whiteLabeling: boolean;
    customDomain: boolean;
    sso: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  limits: {
    users: number;
    storage: number; // in MB
    trips: number;
    apiRequests: number;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    session: {
      timeout: number; // in minutes
      maxConcurrentSessions: number;
    };
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    webhookUrl?: string | null;
  };
}

export interface OrganizationMember extends BaseModel {
  userId: number | string;
  organizationId: number | string;
  role: OrganizationRole;
  title?: string | null;
  department?: string | null;
  joinDate: Date | string;
  permissions: string[];
  metadata?: Record<string, unknown>;
  user?: User;
}

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface OrganizationInvitation extends BaseModel {
  email: string;
  organizationId: number | string;
  role: OrganizationRole;
  invitedBy: number | string;
  expiresAt: Date | string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  token: string;
  metadata?: Record<string, unknown>;
}

export interface OrganizationListParams extends PaginationParams {
  search?: string;
  plan?: OrganizationPlan | OrganizationPlan[];
  status?: OrganizationStatus | OrganizationStatus[];
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'plan' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export type OrganizationListResponse = PaginatedResponse<Organization>;
