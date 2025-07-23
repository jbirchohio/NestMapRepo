import { Router } from 'express';
import { db } from './db-connection';
import { users, trips, activities } from './src/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { auditLogger } from './auditLogger';
import { policyEngine } from './policyEngine';
import { notificationService } from './notificationService';

export interface ApprovalRequest {
  id: string;
  organizationId: number;
  requesterId: number;
  entityType: 'trip' | 'expense' | 'booking' | 'policy_exception';
  entityId: number;
  requestType: 'create' | 'modify' | 'delete' | 'exception';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Approval details
  requiredApprovers: ApprovalLevel[];
  currentLevel: number;
  approvals: ApprovalAction[];
  
  // Request data
  title: string;
  description: string;
  businessJustification?: string;
  requestData: any;
  policyViolations?: string[];
  
  // Timing
  requestedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  
  // Metadata
  tags?: string[];
  attachments?: string[];
  comments?: ApprovalComment[];
}

export interface ApprovalLevel {
  level: number;
  name: string;
  approverRoles: string[];
  approverIds?: number[];
  requiresAll: boolean; // true = all approvers must approve, false = any one approver
  isOptional: boolean;
  timeoutHours?: number;
}

export interface ApprovalAction {
  id: string;
  requestId: string;
  level: number;
  approverId: number;
  action: 'approved' | 'rejected' | 'delegated' | 'escalated';
  timestamp: Date;
  comments?: string;
  delegatedTo?: number;
  escalatedTo?: number;
}

export interface ApprovalComment {
  id: string;
  requestId: string;
  userId: number;
  comment: string;
  timestamp: Date;
  isInternal: boolean;
}

export interface WorkflowTemplate {
  id: string;
  organizationId: number;
  name: string;
  description: string;
  entityType: 'trip' | 'expense' | 'booking' | 'policy_exception';
  conditions: WorkflowCondition[];
  approvalLevels: ApprovalLevel[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export class EnhancedApprovalWorkflow {
  private static instance: EnhancedApprovalWorkflow;
  private requests: Map<string, ApprovalRequest> = new Map();
  private templates: Map<number, WorkflowTemplate[]> = new Map();

  static getInstance(): EnhancedApprovalWorkflow {
    if (!EnhancedApprovalWorkflow.instance) {
      EnhancedApprovalWorkflow.instance = new EnhancedApprovalWorkflow();
    }
    return EnhancedApprovalWorkflow.instance;
  }

  async initializeDefaultTemplates(organizationId: number): Promise<void> {
    const defaultTemplates: WorkflowTemplate[] = [
      {
        id: 'trip-budget-approval',
        organizationId,
        name: 'Trip Budget Approval',
        description: 'Approval workflow for trips exceeding budget limits',
        entityType: 'trip',
        conditions: [
          { field: 'totalBudget', operator: 'greater_than', value: 500 }
        ],
        approvalLevels: [
          {
            level: 1,
            name: 'Manager Approval',
            approverRoles: ['manager'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 24
          },
          {
            level: 2,
            name: 'Executive Approval',
            approverRoles: ['admin'],
            requiresAll: false,
            isOptional: true,
            timeoutHours: 48
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'international-travel-approval',
        organizationId,
        name: 'International Travel Approval',
        description: 'Approval workflow for international travel',
        entityType: 'trip',
        conditions: [
          { field: 'isInternational', operator: 'equals', value: true }
        ],
        approvalLevels: [
          {
            level: 1,
            name: 'Manager Approval',
            approverRoles: ['manager'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 24
          },
          {
            level: 2,
            name: 'Executive Approval',
            approverRoles: ['admin'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 48
          },
          {
            level: 3,
            name: 'HR Approval',
            approverRoles: ['hr'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 72
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'expense-approval',
        organizationId,
        name: 'Expense Approval',
        description: 'Approval workflow for high-value expenses',
        entityType: 'expense',
        conditions: [
          { field: 'amount', operator: 'greater_than', value: 100 }
        ],
        approvalLevels: [
          {
            level: 1,
            name: 'Manager Approval',
            approverRoles: ['manager'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 24
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'policy-exception-approval',
        organizationId,
        name: 'Policy Exception Approval',
        description: 'Approval workflow for policy violations',
        entityType: 'policy_exception',
        conditions: [
          { field: 'severity', operator: 'in', value: ['error', 'warning'] }
        ],
        approvalLevels: [
          {
            level: 1,
            name: 'Manager Approval',
            approverRoles: ['manager'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 12
          },
          {
            level: 2,
            name: 'Compliance Approval',
            approverRoles: ['compliance', 'admin'],
            requiresAll: false,
            isOptional: false,
            timeoutHours: 24
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.templates.set(organizationId, defaultTemplates);
  }

  async createApprovalRequest(
    organizationId: number,
    requesterId: number,
    entityType: 'trip' | 'expense' | 'booking' | 'policy_exception',
    entityId: number,
    requestData: any,
    options: {
      title?: string;
      description?: string;
      businessJustification?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      dueDate?: Date;
    } = {}
  ): Promise<ApprovalRequest> {
    
    // Check policy compliance first
    let policyViolations: string[] = [];
    if (entityType === 'trip') {
      const complianceCheck = await policyEngine.checkTripCompliance(requestData, requesterId, organizationId);
      if (!complianceCheck.passed) {
        policyViolations = complianceCheck.violations.map(v => v.message);
      }
    }

    // Find applicable workflow template
    const orgTemplates = this.templates.get(organizationId) || [];
    const applicableTemplate = orgTemplates.find(template => 
      template.entityType === entityType && 
      template.isActive && 
      this.evaluateWorkflowConditions(template.conditions, requestData)
    );

    if (!applicableTemplate) {
      throw new Error(`No workflow template found for ${entityType} in organization ${organizationId}`);
    }

    // Create approval request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const request: ApprovalRequest = {
      id: requestId,
      organizationId,
      requesterId,
      entityType,
      entityId,
      requestType: 'create',
      status: 'pending',
      priority: options.priority || 'normal',
      
      requiredApprovers: applicableTemplate.approvalLevels,
      currentLevel: 1,
      approvals: [],
      
      title: options.title || `${entityType} approval request`,
      description: options.description || `Approval required for ${entityType}`,
      businessJustification: options.businessJustification,
      requestData,
      policyViolations,
      
      requestedAt: new Date(),
      dueDate: options.dueDate,
      
      tags: [],
      attachments: [],
      comments: []
    };

    this.requests.set(requestId, request);

    // Send notifications to first level approvers
    await this.notifyApprovers(request, 1);

    // Log the request creation
    await auditLogger.log({
      userId: requesterId,
      organizationId,
      action: 'approval_request_created',
      entityType,
      entityId,
      details: {
        requestId,
        templateId: applicableTemplate.id,
        priority: request.priority,
        policyViolations: policyViolations.length
      }
    });

    return request;
  }

  async processApproval(
    requestId: string,
    approverId: number,
    action: 'approved' | 'rejected' | 'delegated',
    options: {
      comments?: string;
      delegatedTo?: number;
    } = {}
  ): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot process approval for request with status ${request.status}`);
    }

    // Verify approver has permission for current level
    const currentLevelConfig = request.requiredApprovers.find(level => level.level === request.currentLevel);
    if (!currentLevelConfig) {
      throw new Error(`Invalid approval level ${request.currentLevel}`);
    }

    const approverUser = await db.select().from(users).where(eq(users.id, approverId)).limit(1);
    if (!approverUser.length) {
      throw new Error(`Approver ${approverId} not found`);
    }

    // Check if approver has required role
    const hasRequiredRole = currentLevelConfig.approverRoles.includes(approverUser[0].role) ||
                           currentLevelConfig.approverIds?.includes(approverId);

    if (!hasRequiredRole) {
      throw new Error(`Approver does not have required role for this approval level`);
    }

    // Create approval action
    const approvalAction: ApprovalAction = {
      id: `action-${Date.now()}`,
      requestId,
      level: request.currentLevel,
      approverId,
      action,
      timestamp: new Date(),
      comments: options.comments,
      delegatedTo: options.delegatedTo
    };

    request.approvals.push(approvalAction);

    // Handle different actions
    if (action === 'rejected') {
      request.status = 'rejected';
      request.completedAt = new Date();
      
      // Notify requester of rejection
      await notificationService.sendNotification({
        userId: request.requesterId,
        type: 'approval_rejected',
        title: 'Approval Request Rejected',
        message: `Your ${request.entityType} request has been rejected`,
        data: { requestId, comments: options.comments }
      });

    } else if (action === 'approved') {
      // Check if this level is complete
      const levelApprovals = request.approvals.filter(a => a.level === request.currentLevel && a.action === 'approved');
      const levelComplete = currentLevelConfig.requiresAll 
        ? levelApprovals.length >= (currentLevelConfig.approverIds?.length || 1)
        : levelApprovals.length >= 1;

      if (levelComplete) {
        // Move to next level or complete
        const nextLevel = request.requiredApprovers.find(level => level.level > request.currentLevel);
        
        if (nextLevel) {
          request.currentLevel = nextLevel.level;
          await this.notifyApprovers(request, nextLevel.level);
        } else {
          // All levels complete
          request.status = 'approved';
          request.completedAt = new Date();
          
          // Execute the approved action
          await this.executeApprovedAction(request);
          
          // Notify requester of approval
          await notificationService.sendNotification({
            userId: request.requesterId,
            type: 'approval_approved',
            title: 'Approval Request Approved',
            message: `Your ${request.entityType} request has been approved`,
            data: { requestId }
          });
        }
      }

    } else if (action === 'delegated' && options.delegatedTo) {
      // Notify delegated approver
      await notificationService.sendNotification({
        userId: options.delegatedTo,
        type: 'approval_delegated',
        title: 'Approval Request Delegated',
        message: `An approval request has been delegated to you`,
        data: { requestId, delegatedBy: approverId }
      });
    }

    // Log the approval action
    await auditLogger.log({
      userId: approverId,
      organizationId: request.organizationId,
      action: `approval_${action}`,
      entityType: request.entityType,
      entityId: request.entityId,
      details: {
        requestId,
        level: request.currentLevel,
        comments: options.comments
      }
    });

    return request;
  }

  async addComment(requestId: string, userId: number, comment: string, isInternal: boolean = false): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    const commentObj: ApprovalComment = {
      id: `comment-${Date.now()}`,
      requestId,
      userId,
      comment,
      timestamp: new Date(),
      isInternal
    };

    request.comments = request.comments || [];
    request.comments.push(commentObj);

    // Notify relevant parties about the comment
    const notifyUserIds = [request.requesterId];
    request.approvals.forEach(approval => {
      if (!notifyUserIds.includes(approval.approverId)) {
        notifyUserIds.push(approval.approverId);
      }
    });

    for (const notifyUserId of notifyUserIds.filter(id => id !== userId)) {
      await notificationService.sendNotification({
        userId: notifyUserId,
        type: 'approval_comment',
        title: 'New Comment on Approval Request',
        message: `A new comment has been added to approval request`,
        data: { requestId, comment: comment.substring(0, 100) }
      });
    }
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.requests.get(requestId) || null;
  }

  async getApprovalRequestsForUser(userId: number, status?: string): Promise<ApprovalRequest[]> {
    const userRequests = Array.from(this.requests.values()).filter(request => {
      // User is requester or approver
      const isRequester = request.requesterId === userId;
      const isApprover = request.requiredApprovers.some(level => 
        level.approverIds?.includes(userId) || 
        level.approverRoles.length > 0 // Would need to check user roles
      );
      
      const matchesStatus = !status || request.status === status;
      
      return (isRequester || isApprover) && matchesStatus;
    });

    return userRequests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async getApprovalRequestsForOrganization(organizationId: number, status?: string): Promise<ApprovalRequest[]> {
    const orgRequests = Array.from(this.requests.values()).filter(request => {
      const matchesOrg = request.organizationId === organizationId;
      const matchesStatus = !status || request.status === status;
      return matchesOrg && matchesStatus;
    });

    return orgRequests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  private async notifyApprovers(request: ApprovalRequest, level: number): Promise<void> {
    const levelConfig = request.requiredApprovers.find(l => l.level === level);
    if (!levelConfig) return;

    // Get users with required roles
    const approverUsers = await db.select()
      .from(users)
      .where(
        and(
          inArray(users.role, levelConfig.approverRoles as any[]),
          eq(users.organization_id, request.organizationId)
        )
      );

    // Add specific approver IDs if configured
    if (levelConfig.approverIds?.length) {
      const specificApprovers = await db.select()
        .from(users)
        .where(inArray(users.id, levelConfig.approverIds));
      
      approverUsers.push(...specificApprovers);
    }

    // Send notifications
    for (const approver of approverUsers) {
      await notificationService.sendNotification({
        userId: approver.id,
        type: 'approval_required',
        title: 'Approval Required',
        message: `${request.title} requires your approval`,
        data: {
          requestId: request.id,
          entityType: request.entityType,
          priority: request.priority,
          dueDate: request.dueDate
        }
      });
    }
  }

  private async executeApprovedAction(request: ApprovalRequest): Promise<void> {
    // Execute the approved action based on entity type
    switch (request.entityType) {
      case 'trip':
        // Update trip status or perform approved action
        await this.executeTripApproval(request);
        break;
      case 'expense':
        // Process expense approval
        await this.executeExpenseApproval(request);
        break;
      case 'booking':
        // Process booking approval
        await this.executeBookingApproval(request);
        break;
      case 'policy_exception':
        // Handle policy exception approval
        await this.executePolicyExceptionApproval(request);
        break;
    }
  }

  private async executeTripApproval(request: ApprovalRequest): Promise<void> {
    // Update trip status to approved
    try {
      await db.update(trips)
        .set({ 
          status: 'approved',
          approved_at: new Date(),
          approved_by: request.approvals[request.approvals.length - 1].approverId
        })
        .where(eq(trips.id, request.entityId));
    } catch (error) {
      console.error('Error executing trip approval:', error);
    }
  }

  private async executeExpenseApproval(request: ApprovalRequest): Promise<void> {
    // Process expense approval logic
    console.log(`Executing expense approval for request ${request.id}`);
  }

  private async executeBookingApproval(request: ApprovalRequest): Promise<void> {
    // Process booking approval logic
    console.log(`Executing booking approval for request ${request.id}`);
  }

  private async executePolicyExceptionApproval(request: ApprovalRequest): Promise<void> {
    // Handle policy exception approval
    console.log(`Executing policy exception approval for request ${request.id}`);
  }

  private evaluateWorkflowConditions(conditions: WorkflowCondition[], data: any): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateCondition(conditions[0], data);
    
    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);
      
      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: WorkflowCondition, data: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, data);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    const fields = field.split('.');
    let value = data;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }
}

export const enhancedApprovalWorkflow = EnhancedApprovalWorkflow.getInstance();
