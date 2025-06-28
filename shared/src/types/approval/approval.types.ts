/**
 * Types related to approval workflows and requests
 */

export interface ApprovalRuleConditions {
  /** Budget threshold in dollars */
  budgetThreshold?: number;
  
  /** Trip duration in days */
  tripDuration?: number;
  
  /** List of destination country codes that trigger this rule */
  destinationCountries?: string[];
  
  /** List of department IDs that this rule applies to */
  departmentIds?: string[];
  
  /** List of user roles that this rule applies to */
  userRoles?: string[];
  
  /** List of expense categories that this rule applies to */
  expenseCategories?: string[];
  
  /** List of roles that can approve this request */
  approverRoles?: string[];
  
  /** Additional custom conditions */
  [key: string]: unknown;
}

import type { SharedItemDataType } from '../SharedItemDataType.js';

export interface ApprovalWorkflowData extends Omit<SharedItemDataType, 'type'> {
  /** Unique identifier for the entity */
  id: string | number;
  
  /** Type of the entity (e.g., 'expense', 'trip', 'booking') */
  type: string;
  
  /** Total amount for financial approvals */
  totalAmount?: string | number;
  
  /** Start date for time-based approvals */
  startDate?: string | Date;
  
  /** End date for time-based approvals */
  endDate?: string | Date;
  
  /** Country code for region-based approvals */
  country?: string;
  
  /** Department ID for department-based approvals */
  departmentId?: string | number;
  
  /** Category for categorization-based approvals */
  category?: string;
  
  /** Additional metadata for custom approval rules */
  metadata?: Record<string, unknown>;
}

export interface ApprovalWorkflowConfig {
  /** Organization ID the approval request belongs to */
  organizationId: string;
  
  /** Type of entity being approved (e.g., 'expense', 'timeOff', 'purchaseOrder') */
  entityType: string;
  
  /** Type of request (e.g., 'create', 'update', 'delete', 'approve') */
  requestType: string;
  
  /** Data specific to the approval request */
  data: ApprovalWorkflowData;
  
  /** ID of the user making the request */
  requesterId: string;
  
  /** Reason for the request */
  reason?: string;
  
  /** Business justification for the request */
  businessJustification?: string;
  
  /** Optional due date for the approval */
  dueDate?: Date;
  
  /** Priority level of the approval request */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  /** ID of the entity being approved (if applicable) */
  entityId?: string | number;
}
