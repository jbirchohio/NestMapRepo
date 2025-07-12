import { db } from './db.js';
import { approvalRequests, approvalRules, users, organizations } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

interface ApprovalWorkflowConfig {
  organizationId: string;
  entityType: string;
  requestType: string;
  data: Record<string, any>;
  requesterId: string;
  reason?: string;
  businessJustification?: string;
}

interface ApprovalResult {
  requiresApproval: boolean;
  autoApproved?: boolean;
  requestId?: string;
  assignedApproverId?: string;
  dueDate?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export class ApprovalEngine {
  
  /**
   * Process approval workflow for any entity
   */
  async processApprovalWorkflow(config: ApprovalWorkflowConfig): Promise<ApprovalResult> {
    const rules = await this.getApplicableRules(config.organizationId, config.entityType);
    
    // Check each rule in priority order
    for (const rule of rules) {
      if (await this.evaluateRule(rule, config)) {
        if (rule.autoApprove) {
          // Auto-approve based on rule
          return {
            requiresApproval: false,
            autoApproved: true,
            priority: 'normal'
          };
        } else {
          // Requires manual approval
          return await this.createApprovalRequest(config, rule);
        }
      }
    }
    
    // No rules matched, default behavior
    return {
      requiresApproval: false,
      autoApproved: true,
      priority: 'normal'
    };
  }

  /**
   * Get applicable approval rules for organization and entity type
   */
  private async getApplicableRules(organizationId: string, entityType: string) {
    return await db
      .select()
      .from(approvalRules)
      .where(and(
        eq(approvalRules.organizationId, organizationId),
        eq(approvalRules.entityType, entityType),
        eq(approvalRules.active, true)
      ))
      .orderBy(approvalRules.priority);
  }

  /**
   * Evaluate if a rule applies to the current request
   */
  private async evaluateRule(rule: any, config: ApprovalWorkflowConfig): Promise<boolean> {
    const conditions = rule.conditions;
    const data = config.data;

    // Budget threshold check
    if (conditions.budgetThreshold && data.totalAmount) {
      const amountInDollars = data.totalAmount / 100; // Convert from cents
      if (amountInDollars >= conditions.budgetThreshold) {
        return true;
      }
    }

    // Trip duration check
    if (conditions.tripDuration && data.startDate && data.endDate) {
      const duration = this.calculateTripDuration(data.startDate, data.endDate);
      if (duration >= conditions.tripDuration) {
        return true;
      }
    }

    // Destination country check
    if (conditions.destinationCountries && data.country) {
      if (conditions.destinationCountries.includes(data.country)) {
        return true;
      }
    }

    // Department check
    if (conditions.departmentIds && data.departmentId) {
      if (conditions.departmentIds.includes(data.departmentId)) {
        return true;
      }
    }

    // User role check
    if (conditions.userRoles) {
      const requester = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, config.requesterId))
        .limit(1);
      
      if (requester[0] && conditions.userRoles.includes(requester[0].role)) {
        return true;
      }
    }

    // Expense category check
    if (conditions.expenseCategories && data.category) {
      if (conditions.expenseCategories.includes(data.category)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create approval request in database
   */
  private async createApprovalRequest(
    config: ApprovalWorkflowConfig, 
    rule: any
  ): Promise<ApprovalResult> {
    const approver = await this.findApprover(config.organizationId, rule.approverRoles);
    const priority = this.calculatePriority(config.data, rule);
    const dueDate = new Date(Date.now() + (rule.escalationDays || 3) * 24 * 60 * 60 * 1000);

    const [request] = await db
      .insert(approvalRequests)
      .values({
        organizationId: config.organizationId,
        requesterId: config.requesterId,
        approverId: approver?.id,
        entityType: config.entityType,
        entityId: config.data.id || 0,
        requestType: config.requestType,
        proposedData: config.data,
        reason: config.reason,
        businessJustification: config.businessJustification,
        priority,
        dueDate,
        autoApprovalRule: rule.name
      })
      .returning();

    return {
      requiresApproval: true,
      requestId: request.id,
      assignedApproverId: approver?.id,
      dueDate,
      priority
    };
  }

  /**
   * Find appropriate approver based on roles
   */
  private async findApprover(organizationId: string, approverRoles: string[]) {
    const approvers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, approverRoles[0] || 'manager') // Use first role or default to manager
      ))
      .limit(1);

    return approvers[0] || null;
  }

  /**
   * Calculate priority based on data and rule
   */
  private calculatePriority(data: Record<string, any>, rule: any): 'low' | 'normal' | 'high' | 'urgent' {
    if (data.totalAmount) {
      const amountInDollars = data.totalAmount / 100;
      const threshold = rule.conditions.budgetThreshold || 1000;

      if (amountInDollars >= threshold * 5) return 'urgent';
      if (amountInDollars >= threshold * 3) return 'high';
      if (amountInDollars >= threshold * 1.5) return 'normal';
    }

    return 'normal';
  }

  /**
   * Calculate trip duration in days
   */
  private calculateTripDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user can approve requests
   */
  async canUserApprove(userId: string, organizationId: string): Promise<boolean> {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId)
      ));

    return user ? ['admin', 'manager'].includes(user.role) : false;
  }

  /**
   * Get approval dashboard data for managers
   */
  async getApprovalDashboard(userId: string, organizationId: string) {
    const canApprove = await this.canUserApprove(userId, organizationId);
    
    if (!canApprove) {
      throw new Error('User does not have approval permissions');
    }

    const pending = await db
      .select()
      .from(approvalRequests)
      .where(and(
        eq(approvalRequests.organizationId, organizationId),
        eq(approvalRequests.status, 'pending')
      ));

    return {
      pendingCount: pending.length,
      urgent: pending.filter(r => r.priority === 'urgent').length,
      high: pending.filter(r => r.priority === 'high').length,
      overdue: pending.filter(r => r.dueDate && r.dueDate < new Date()).length,
      requests: pending
    };
  }

  /**
   * Process escalation for overdue requests
   */
  async processEscalations(): Promise<void> {
    const overdueRequests = await db
      .select()
      .from(approvalRequests)
      .where(and(
        eq(approvalRequests.status, 'pending'),
        // Add condition for overdue requests
      ));

    for (const request of overdueRequests) {
      // Escalate to higher authority or send notifications
      await this.escalateRequest(request);
    }
  }

  /**
   * Escalate request to higher authority
   */
  private async escalateRequest(request: any): Promise<void> {
    // Find admin if current approver is manager
    const escalatedApprover = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.organizationId, request.organizationId),
        eq(users.role, 'admin')
      ))
      .limit(1);

    if (escalatedApprover[0]) {
      await db
        .update(approvalRequests)
        .set({
          approverId: escalatedApprover[0].id,
          escalationLevel: request.escalationLevel + 1,
          priority: request.priority === 'urgent' ? 'urgent' : 'high',
          updatedAt: new Date()
        })
        .where(eq(approvalRequests.id, request.id));
    }
  }
}

export const approvalEngine = new ApprovalEngine();