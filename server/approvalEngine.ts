import { db } from './db.js';
import { 
  approvalRequests, 
  approvalRules, 
  approvalLogs,
  users, 
  organizations,
  type ApprovalStatus,
  type ApprovalPriority,
  type ApprovalRequest as ApprovalRequestType,
  type ApprovalRule as ApprovalRuleType,
  type ApprovalLog as ApprovalLogType,
  type User,
  approvalStatusEnum,
  approvalPriorityEnum,
  userRoleEnum,
  type UserRole
} from './db/index.js';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel, SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';
interface ApprovalWorkflowConfig {
    organizationId: string;
    entityType: string;
    requestType: string;
    data: Record<string, any> & {
        totalAmount?: string | number;
        startDate?: string | Date;
        endDate?: string | Date;
        country?: string;
        departmentId?: string | number;
        category?: string;
    };
    requesterId: string;
    reason?: string;
    businessJustification?: string;
    dueDate?: Date;
    priority?: ApprovalPriority;
    entityId?: string | number;
}
interface ApprovalResult {
    requiresApproval: boolean;
    autoApproved?: boolean;
    requestId?: string;  // Changed from number to string to match UUID
    assignedApproverId?: string;  // Changed from number to string to match UUID
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
                }
                else {
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
        const rules = await db
            .select()
            .from(approvalRules)
            .where(and(
                eq(approvalRules.organizationId, organizationId), 
                eq(approvalRules.entityType, entityType), 
                eq(approvalRules.isActive, true)
            ))
            .orderBy(approvalRules.priority);
            
        // Ensure all rules have required properties
        return rules.map(rule => ({
            ...rule,
            active: rule.isActive,
            conditions: {
                ...rule.conditions,
                approverRoles: rule.conditions?.approverRoles || ['admin'] // Default to admin if not specified
            },
            createdAt: rule.createdAt || new Date(),
            updatedAt: rule.updatedAt || new Date()
        }));
    }
    /**
     * Evaluate if a rule applies to the current request
     */
    private async evaluateRule(rule: ApprovalRuleType, config: ApprovalWorkflowConfig): Promise<boolean> {
        const conditions: {
            budgetThreshold?: number;
            tripDuration?: number;
            destinationCountries?: string[];
            departmentIds?: string[];
            userRoles?: string[];
            expenseCategories?: string[];
            approverRoles?: string[];
            [key: string]: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
        } = rule.conditions || {};
        const data = config.data;
        
        try {
            // Budget threshold check
            if (conditions.budgetThreshold !== undefined && data.totalAmount) {
                const amount = data.totalAmount ? Number(data.totalAmount) : 0;
                const amountInDollars = amount / 100; // Convert from cents
                if (conditions.budgetThreshold !== undefined && amountInDollars >= conditions.budgetThreshold) {
                    return true;
                }
            }
            // Trip duration check
            if (conditions.tripDuration !== undefined && data.startDate && data.endDate) {
                const startDate = data.startDate ? new Date(data.startDate) : new Date();
                const endDate = data.endDate ? new Date(data.endDate) : new Date();
                const duration = this.calculateTripDuration(
                    startDate.toISOString().split('T')[0], 
                    endDate.toISOString().split('T')[0]
                );
                if (conditions.tripDuration !== undefined && duration >= conditions.tripDuration) {
                    return true;
                }
            }
            // Destination country check
            if (conditions.destinationCountries && conditions.destinationCountries.length && data.country) {
                const country = String(data.country);
                if (conditions.destinationCountries.includes(country)) {
                    return true;
                }
            }
            // Department check
            if (conditions.departmentIds && conditions.departmentIds.length && data.departmentId) {
                const deptId = String(data.departmentId);
                if (conditions.departmentIds.includes(deptId)) {
                    return true;
                }
            }
            // User role check
            if (conditions.userRoles && conditions.userRoles.length) {
                const requester = await db
                    .select({ role: users.role })
                    .from(users)
                    .where(eq(users.id, config.requesterId))
                    .limit(1);
                if (requester[0]?.role && conditions.userRoles.includes(requester[0].role as UserRole)) {
                    return true;
                }
            }
            // Expense category check
            if (conditions.expenseCategories && conditions.expenseCategories.length && data.category) {
                const category = String(data.category);
                if (conditions.expenseCategories.includes(category)) {
                    return true;
                }
            }
        } catch (error) {
            console.error('Error evaluating approval rule:', error);
        }
        return false;
    }

    /**
     * Create approval request in database
     */
    private async createApprovalRequest(config: ApprovalWorkflowConfig, rule: ApprovalRuleType): Promise<ApprovalResult> {
        const approver = await this.findApprover(config.organizationId, rule.conditions?.approverRoles || []);
        const priority = this.calculatePriority(config.data, rule);
        const dueDate = config.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Default 3 days
        const now = new Date();
        
        // Ensure all required fields are included
        const requestData = {
            id: crypto.randomUUID(),
            organizationId: config.organizationId,
            requesterId: config.requesterId,
            approverId: approver?.id || null,
            ruleId: rule.id,
            entityType: config.entityType,
            entityId: String(config.data.id || ''),
            status: 'pending' as const,
            priority,
            dueDate,
            proposedData: config.data,
            reason: config.reason || null,
            comment: null,
            businessJustification: config.businessJustification || null,
            submittedAt: now,
            approvedAt: null,
            rejectedAt: null,
            cancelledAt: null,
            approvedData: null,
            requestType: config.requestType || 'general',
            escalationLevel: 0,
            rejectionReason: null,
            createdAt: now,
            updatedAt: now
        };

        const [request] = await db
            .insert(approvalRequests)
            .values(requestData)
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
        if (!approverRoles.length) {
            approverRoles = ['admin', 'manager'];
        }
        
        // Use Drizzle's inArray for type-safe array membership check
        const approvers = await db
            .select({ 
                id: users.id, 
                role: users.role 
            })
            .from(users)
            .where(and(
                eq(users.organizationId, organizationId),
                inArray(users.role, approverRoles as any[])
            ))
            .orderBy(users.role) // Prefer higher roles first
            .limit(1);
            
        return approvers[0] || null;
    }
    /**
     * Calculate priority based on data and rule
     */
    private calculatePriority(data: Record<string, any>, rule: ApprovalRuleType): ApprovalPriority {
        try {
            if (data.totalAmount) {
                // Ensure we're working with numbers
                const amount = typeof data.totalAmount === 'string' 
                    ? parseFloat(data.totalAmount) 
                    : Number(data.totalAmount);
                const amountInDollars = amount / 100; // Convert from cents if needed
                
                // Get threshold from conditions, default to 1000 if not set
                const conditions = rule.conditions || {};
                const threshold = conditions.maxAmount || 1000;
                
                if (amountInDollars >= threshold * 5) return 'urgent';
                if (amountInDollars >= threshold * 3) return 'high';
                if (amountInDollars >= threshold * 1.5) return 'normal';
            }
        } catch (error) {
            console.error('Error calculating priority:', error);
        }
        return 'normal';
    }
    /**
     * Calculate trip duration in days
     */
    private calculateTripDuration(startDate: string, endDate: string): number {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (error) {
            console.error('Error calculating trip duration:', error);
            return 0;
        }
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
        return user ? ['admin', 'manager'].includes(user.role as UserRole) : false;
    }
    /**
     * Get approval dashboard data for managers
     */
    async getApprovalDashboard(userId: string, organizationId: string) {
        const canApprove = await this.canUserApprove(userId, organizationId);
        if (!canApprove) {
            throw new Error('User does not have approval permissions');
        }
        
        const now = new Date();
        const pending = await db
            .select()
            .from(approvalRequests)
            .where(and(
                eq(approvalRequests.organizationId, organizationId), 
                eq(approvalRequests.status, 'pending' as ApprovalStatus)
            ));
            
        return {
            pendingCount: pending.length,
            urgent: pending.filter(r => r.priority === 'urgent').length,
            high: pending.filter(r => r.priority === 'high').length,
            overdue: pending.filter(r => r.dueDate && r.dueDate < now).length,
            requests: pending
        };
    }
    /**
     * Process escalation for overdue requests
     */
    async processEscalations(): Promise<void> {
        const now = new Date();
        const overdueRequests = await db
            .select()
            .from(approvalRequests)
            .where(and(
                eq(approvalRequests.status, 'pending' as ApprovalStatus),
                lte(approvalRequests.dueDate, now)
            ));
            
        for (const request of overdueRequests) {
            await this.escalateRequest(request);
        }
    }
    /**
     * Escalate request to higher authority
     */
    private async escalateRequest(request: ApprovalRequestType): Promise<void> {
        // Find admin if current approver is manager
        const escalatedApprover = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
                eq(users.organizationId, request.organizationId),
                eq(users.role, 'admin' as const)
            ))
            .limit(1);
            
        if (escalatedApprover[0]) {
            const now = new Date();
            const updateData = {
                ...request, // Include all existing request data
                approverId: escalatedApprover[0].id,
                priority: (request.priority === 'urgent' ? 'urgent' : 'high') as ApprovalPriority,
                status: 'escalated' as const,
                updatedAt: now,
                comment: (request as any).comment || 'Escalated to admin',
                // Ensure all required fields are included
                rejectionReason: (request as any).rejectionReason || null,
                requestType: (request as any).requestType || 'general',
                escalationLevel: ((request as any).escalationLevel || 0) + 1
            };

            await db
                .update(approvalRequests)
                .set(updateData)
                .where(eq(approvalRequests.id, request.id));
                
            // Log the escalation
            await db.insert(approvalLogs).values({
                requestId: request.id,
                userId: request.requesterId,
                action: 'escalated',
                comment: 'Request escalated due to overdue',
                metadata: {
                    fromApprover: request.approverId,
                    toApprover: escalatedApprover[0].id,
                    timestamp: new Date().toISOString()
                },
                createdAt: new Date()
            });
        }
    }
}
export const approvalEngine = new ApprovalEngine();
