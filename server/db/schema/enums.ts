import { pgEnum } from 'drizzle-orm/pg-core';

// User roles
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'manager',
  'member',
  'guest'
]);

export type UserRole = typeof userRoleEnum.enumValues[number];

// Organization plans
export const organizationPlanEnum = pgEnum('organization_plan', [
  'free',
  'pro',
  'enterprise'
]);

export type OrganizationPlan = typeof organizationPlanEnum.enumValues[number];

// Trip collaborator roles
export const tripCollaboratorRoleEnum = pgEnum('trip_collaborator_role', [
  'owner',
  'editor',
  'viewer'
]);

export type TripCollaboratorRole = typeof tripCollaboratorRoleEnum.enumValues[number];

// Domain status
export const domainStatusEnum = pgEnum('domain_status', [
  'pending_verification',
  'verified',
  'failed_verification'
]);

export type DomainStatus = typeof domainStatusEnum.enumValues[number];

// Approval status
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled'
]);

export type ApprovalStatus = typeof approvalStatusEnum.enumValues[number];

// Export all enums as a single object for easy importing
export const enums = {
  userRole: userRoleEnum,
  organizationPlan: organizationPlanEnum,
  tripCollaboratorRole: tripCollaboratorRoleEnum,
  domainStatus: domainStatusEnum,
  approvalStatus: approvalStatusEnum
} as const;
