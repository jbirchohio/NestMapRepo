// Re-export all approval-related schemas with explicit exports to avoid duplicates

// From approval-rules
export {
  approvalRules,
  approvalRuleSchema,
  selectApprovalRuleSchema,
  insertApprovalRuleSchema,
  type ApprovalRule,
  type NewApprovalRule,
  approvalStatusEnum,
  approvalPriorityEnum,
  type ApprovalStatus,
  type ApprovalPriority
} from './approval-rules.js';

// From approval-requests
export {
  approvalRequests,
  approvalRequestSchema,
  selectApprovalRequestSchema,
  insertApprovalRequestSchema,
  type ApprovalRequest,
  type NewApprovalRequest
} from './approval-requests.js';

// From approval-logs
export {
  approvalLogs,
  approvalLogSchema,
  selectApprovalLogSchema,
  insertApprovalLogSchema,
  type ApprovalLog,
  type NewApprovalLog
} from './approval-logs.js';
