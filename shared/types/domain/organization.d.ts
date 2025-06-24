/**
 * Organization-related type definitions
 */

import type { ID, ISO8601DateTime, Nullable } from '../core/base';

declare namespace SharedTypes {
  // Organization plans
  type OrganizationPlan = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  
  // Organization settings
  interface OrganizationSettings {
    require_email_verification?: boolean;
    allow_signups?: boolean;
    max_users?: number;
    branding?: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
    };
    features?: {
      [key: string]: boolean | string | number;
    };
  }

  // Organization interface
  interface Organization extends Timestamps {
    id: ID;
    name: string;
    slug: string;
    plan: OrganizationPlan;
    settings: OrganizationSettings;
    is_active: boolean;
    owner_id: ID;
    billing_email: Nullable<string>;
    logo_url: Nullable<string>;
    subscription_id: Nullable<string>;
    trial_ends_at: Nullable<ISO8601DateTime>;
  }

  // Organization member
  interface OrganizationMember extends Timestamps {
    id: ID;
    organization_id: ID;
    user_id: ID;
    role: OrganizationRole;
    status: 'active' | 'invited' | 'suspended';
    permissions: string[];
    user?: User; // Expanded user data
  }

  // Organization roles
  type OrganizationRole = 'owner' | 'admin' | 'member' | 'billing' | 'viewer';

  // Organization creation DTO
  interface CreateOrganizationDto {
    name: string;
    slug: string;
    owner_id: ID;
    plan?: OrganizationPlan;
    settings?: Partial<OrganizationSettings>;
  }

  // Organization update DTO
  interface UpdateOrganizationDto extends Partial<Omit<CreateOrganizationDto, 'owner_id'>> {
    is_active?: boolean;
    billing_email?: string | null;
    logo_url?: string | null;
    subscription_id?: string | null;
  }

  // Organization member DTO
  interface OrganizationMemberDto {
    user_id: ID;
    role: OrganizationRole;
    permissions?: string[];
  }

  // Organization response types
  type OrganizationResponse = Omit<Organization, 'deleted_at'>;
  type OrganizationListResponse = PaginatedResponse<OrganizationResponse>;
  type OrganizationMemberListResponse = PaginatedResponse<OrganizationMember>;
}
