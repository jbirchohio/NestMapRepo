// Export base schema types and tables
export * from './schema.js';

// Export approval schema types and tables
export * from './approvalSchema.js';

// Export specific types from superadmin schema to avoid conflicts
export type {
  SuperadminAuditLog,
  NewSuperadminAuditLog,
  ActiveSession,
  NewActiveSession,
  AiUsageLog,
  NewAiUsageLog,
  SuperadminFeatureFlag,
  NewSuperadminFeatureFlag,
  OrganizationFeatureFlag,
  NewOrganizationFeatureFlag,
  SuperadminBackgroundJob,
  NewSuperadminBackgroundJob,
  BillingEvent,
  NewBillingEvent,
  SystemActivitySummary,
  NewSystemActivitySummary
} from './superadminSchema.js';

// Re-export common types for convenience
export type {
  User, NewUser,
  Organization, NewOrganization,
  Trip, NewTrip,
  Activity, NewActivity,
  Todo, NewTodo,
  Note, NewNote,
  // Add other commonly used types as needed
} from './schema.js';

// Export approval types
export type {
  ApprovalRule, NewApprovalRule,
  ApprovalRequest, NewApprovalRequest,
  ApprovalLog, NewApprovalLog
} from './approvalSchema.js';

// Export enums and constants
export { 
  userRoleEnum,
  USER_ROLES 
} from './schema.js';

export { 
  approvalStatusEnum,
  approvalPriorityEnum
} from './approvalSchema.js';

export {
  organizationPlanEnum
} from './schema.js';

// Export schema instances for validation
export {
  insertUserSchema,
  selectUserSchema,
  // Add other schema validators as needed
} from './schema.js';

// Export approval schema instances
export {
  approvalRules,
  approvalRequests,
  approvalLogs,
  approvalRequestsRelations,
  approvalRulesRelations
} from './approvalSchema.js';

// Export superadmin schema instances
export {
  superadminAuditLogs,
  activeSessions,
  aiUsageLogs,
  superadminFeatureFlags,
  organizationFeatureFlags,
  superadminBackgroundJobs,
  billingEvents,
  systemActivitySummary
} from './superadminSchema.js';
