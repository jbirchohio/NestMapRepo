// Export all schemas from subdirectories
import * as activitiesSchema from './schema/activities/index.js';
import * as approvalsSchema from './schema/approvals/index.js';
import * as auditSchema from './schema/audit/index.js';
import * as billingSchema from './schema/billing/index.js';
import * as bookingsSchema from './schema/bookings/index.js';
import * as expensesSchema from './schema/expenses/index.js';
import * as filesSchema from './schema/files/index.js';
import * as notificationsSchema from './schema/notifications/index.js';
import * as organizationsSchema from './schema/organizations/index.js';
import * as proposalsSchema from './schema/proposals/index.js';
import * as superadminSchema from './schema/superadmin/index.js';
import * as tripsSchema from './schema/trips/index.js';
import * as usersSchema from './schema/users/index.js';
import * as baseSchema from './schema/base.js';
import * as enumsSchema from './schema/enums.js';

// Re-export all schemas under a single `dbSchema` object
export const dbSchema = {
  ...activitiesSchema,
  ...approvalsSchema,
  ...auditSchema,
  ...billingSchema,
  ...bookingsSchema,
  ...expensesSchema,
  ...filesSchema,
  ...notificationsSchema,
  ...organizationsSchema,
  ...proposalsSchema,
  ...superadminSchema,
  ...tripsSchema,
  ...usersSchema,
  ...baseSchema,
  ...enumsSchema,
};

// Re-export common types and enums from the combined schema
export type { User, NewUser } from './schema/users/users.js';
export type { Organization, NewOrganization } from './schema/organizations/organizations.js';
export type { Trip, NewTrip } from './schema/trips/trips.js';
export type { Activity, NewActivity } from './schema/activities/activities.js';
export type { Todo, NewTodo } from './schema/todos/todos.js';
export { todos, insertTodoSchema, selectTodoSchema } from './schema/todos/todos.js';
export type { Note, NewNote } from './schema/notes/notes.js';
export { notes, insertNoteSchema, selectNoteSchema } from './schema/notes/notes.js';

export type { InvoiceLineItem } from './schema/billing/invoices.js';

export type { ApprovalRule, NewApprovalRule, ApprovalStatus, ApprovalPriority } from './schema/approvals/approval-rules.js';
export type { ApprovalRequest, NewApprovalRequest } from './schema/approvals/approval-requests.js';
export type { ApprovalLog, NewApprovalLog } from './schema/approvals/approval-logs.js';

export type {
  SuperadminAuditLog, NewSuperadminAuditLog,
  ActiveSession, NewActiveSession,
  AiUsageLog, NewAiUsageLog,
  SuperadminFeatureFlag, NewSuperadminFeatureFlag,
  OrganizationFeatureFlag, NewOrganizationFeatureFlag,
  SuperadminBackgroundJob, NewSuperadminBackgroundJob,
  BillingEvent, NewBillingEvent,
  SystemActivitySummary, NewSystemActivitySummary
} from './schema/superadmin/index.js';

export { userRoleEnum, UserRole } from './schema/enums.js';
export { organizationPlanEnum } from './schema/enums.js';

export { insertUserSchema, selectUserSchema } from './schema/users/users.js';

export {
  approvalRules,
  approvalRequests,
  approvalLogs,
} from './schema/approvals/index.js';

export {
  superadminAuditLogs,
  activeSessions,
  aiUsageLogs,
  superadminFeatureFlags,
  organizationFeatureFlags,
  superadminBackgroundJobs,
  billingEvents,
  systemActivitySummary
} from './schema/superadmin/index.js';

// Re-export drizzle-orm for convenience
export {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
export { sql } from 'drizzle-orm';

export { createInsertSchema, createSelectSchema } from 'drizzle-zod';
export { z } from 'zod';