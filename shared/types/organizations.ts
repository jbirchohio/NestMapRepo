import { BaseModel, PaginationParams, PaginatedResponse } from './base.js';
import { User } from './users.js';

/**
 * Organization subscription plans
 */
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';

/**
 * Organization status
 */
export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'deleted' | 'pending_verification';

/**
 * Organization entity representing a tenant in the system
 */
export interface Organization extends BaseModel {
  /** Organization name */
  name: string;
  
  /** URL-friendly identifier */
  slug: string;
  
  /** Organization logo URL */
  logoUrl?: string | null;
  
  /** Subscription plan */
  plan: OrganizationPlan;
  
  /** Organization status */
  status: OrganizationStatus;
  
  /** Billing contact email */
  billingEmail?: string | null;
  
  /** Stripe customer ID */
  stripeCustomerId?: string | null;
  
  /** Subscription status */
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | null;
  
  /** Subscription ID */
  subscriptionId?: string | null;
  
  /** When the trial period ends */
  trialEndsAt?: Date | string | null;
  
  /** When the organization was soft deleted */
  deletedAt?: Date | string | null;
  
  /** Organization settings */
  settings: OrganizationSettings;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Organization settings with defaults
 */
export interface OrganizationSettings {
  features: {
    /** Enable advanced analytics */
    advancedAnalytics: boolean;
    
    /** Enable white labeling */
    whiteLabeling: boolean;
    
    /** Allow custom domains */
    customDomain: boolean;
    
    /** Enable SSO */
    sso: boolean;
    
    /** Enable API access */
    apiAccess: boolean;
    
    /** Priority support */
    prioritySupport: boolean;
  };
  
  limits: {
    /** Max number of users */
    users: number;
    
    /** Storage limit in MB */
    storage: number;
    
    /** Max number of trips */
    trips: number;
    
    /** Max API requests per month */
    apiRequests: number;
  };
  
  security: {
    /** Password policy */
    passwordPolicy: {
      /** Minimum password length */
      minLength: number;
      
      /** Require uppercase letters */
      requireUppercase: boolean;
      
      /** Require numbers */
      requireNumbers: boolean;
      
      /** Require special characters */
      requireSpecialChars: boolean;
    };
    
    /** Session settings */
    session: {
      /** Session timeout in minutes */
      timeout: number;
      
      /** Max concurrent sessions */
      maxConcurrentSessions: number;
    };
  };
  
  notifications: {
    /** Email notifications */
    email: boolean;
    
    /** In-app notifications */
    inApp: boolean;
    
    /** Webhook URL for notifications */
    webhookUrl?: string | null;
  };
}

/**
 * Default organization settings
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  features: {
    advancedAnalytics: false,
    whiteLabeling: false,
    customDomain: false,
    sso: false,
    apiAccess: false,
    prioritySupport: false,
  },
  limits: {
    users: 1,
    storage: 1024, // 1GB
    trips: 10,
    apiRequests: 1000,
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    session: {
      timeout: 30, // minutes
      maxConcurrentSessions: 5,
    },
  },
  notifications: {
    email: true,
    inApp: true,
    webhookUrl: null,
  },
};

/**
 * Data needed to create a new organization
 */
export type CreateOrganizationData = {
  /** Organization name */
  name: string;
  
  /** URL-friendly identifier */
  slug: string;
  
  /** Subscription plan */
  plan: OrganizationPlan;
  
  /** Billing email */
  billingEmail?: string | null;
  
  /** Organization status (defaults to 'pending_verification') */
  status?: OrganizationStatus;
  
  /** Initial settings (will be merged with defaults) */
  settings?: Partial<OrganizationSettings>;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Data for updating an organization
 */
export type UpdateOrganizationData = {
  /** Organization name */
  name?: string;
  
  /** URL-friendly identifier */
  slug?: string;
  
  /** Organization logo URL */
  logoUrl?: string | null;
  
  /** Subscription plan */
  plan?: OrganizationPlan;
  
  /** Organization status */
  status?: OrganizationStatus;
  
  /** Billing contact email */
  billingEmail?: string | null;
  
  /** Stripe customer ID */
  stripeCustomerId?: string | null;
  
  /** Subscription status */
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | null;
  
  /** Subscription ID */
  subscriptionId?: string | null;
  
  /** When the trial period ends */
  trialEndsAt?: Date | string | null;
  
  /** Organization settings (shallow merge with existing) */
  settings?: Partial<OrganizationSettings>;
  
  /** Custom metadata (shallow merge with existing) */
  metadata?: Record<string, unknown>;
};

/**
 * Organization member with role and permissions
 */
export interface OrganizationMember extends BaseModel {
  /** User ID */
  userId: string;
  
  /** Organization ID */
  organizationId: string;
  
  /** Member role */
  role: OrganizationRole;
  
  /** When the user joined the organization */
  joinDate: Date | string;
  
  /** Computed permissions based on role */
  permissions: string[];
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  
  /** Populated user data */
  user?: User;
}

/**
 * Organization member roles
 * - admin: Full access to all organization settings and members
 * - manager: Can manage members and organization content
 * - member: Standard member with basic access
 * - viewer: Read-only access
 * - billing: Can manage billing information only
 */
export type OrganizationRole = 'admin' | 'manager' | 'member' | 'viewer' | 'billing';

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
