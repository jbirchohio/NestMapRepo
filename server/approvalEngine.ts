import prisma from './prisma';
import { Prisma, ApprovalRequest, ApprovalRule, ApprovalLog, User, Organization, OrganizationMember, ApprovalStatus, ApprovalPriority, UserRole } from '@prisma/client';
import type { ApprovalWorkflowData, ApprovalWorkflowConfig, ApprovalRuleConditions } from '@shared/schema/types/approval/approval.types.js';

// Helper type for a user with organization context and approver role
type UserWithOrg = Omit<User, 'role'> & {
    organizationId: string;
    role: 'admin' | 'super_admin';
};

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
        const rules = await prisma.approvalRule.findMany({
            where: {
                organizationId,
                entityType,
                isActive: true,
            },
            orderBy: {
                priority: 'asc',
            },
        });

        // Ensure all rules have required properties
        return rules.map(rule => ({
            ...rule,
            active: rule.isActive,
            conditions: {
                ...rule.conditions as Prisma.JsonObject,
                approverRoles: (rule.conditions as any)?.approverRoles || ['admin'] // Default to admin if not specified
            },
            createdAt: rule.createdAt || new Date(),
            updatedAt: rule.updatedAt || new Date()
        }));
    }
    /**
     * Evaluate if a rule applies to the current request
     */
    private async evaluateRule(rule: ApprovalRuleType, config: ApprovalWorkflowConfig): Promise<boolean> {
        const conditions: ApprovalRuleConditions = rule.conditions || {};
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
                const requester = await prisma.user.findUnique({
                    where: { id: config.requesterId },
                    select: { role: true },
                });
                if (requester?.role && conditions.userRoles.includes(requester.role as UserRole)) {
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
        const approver = await this.findApprover(
            config.organizationId, 
            rule, 
            config.data
        );
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

        const request = await prisma.approvalRequest.create({
            data: {
                organizationId: config.organizationId,
                requesterId: config.requesterId,
                approverId: approver?.id || null,
                ruleId: rule.id,
                entityType: config.entityType,
                entityId: String(config.data.id || ''),
                status: 'pending',
                priority,
                dueDate,
                proposedData: config.data as Prisma.InputJsonValue,
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
            },
        });

        return {
            requiresApproval: true,
            requestId: request.id,
            assignedApproverId: approver?.id,
            dueDate,
            priority
        };
    }
    /**
     * Find an appropriate approver based on the rule and data
     */
    // Define a type for users who can approve requests
    private isValidApproverRole(role: string): role is 'admin' | 'super_admin' {
        return ['admin', 'super_admin'].includes(role);
    }

    private async findApprover(
        organizationId: string, 
        rule: ApprovalRuleType, 
        _data: ApprovalWorkflowData
    ): Promise<UserWithOrg | null> {
        // Define valid approver roles (only admin and super_admin can approve)
        const validApproverRoles = ['admin', 'super_admin'] as const;
        type ApproverRole = typeof validApproverRoles[number];
        
        // Get requested roles from rule or use default approver roles
        const requestedRoles = rule.conditions?.approverRoles || [...validApproverRoles];
        
        // Filter to only include valid approver roles
        const approverRoles = requestedRoles.filter(
            (role: string): role is ApproverRole => 
                this.isValidApproverRole(role)
        );
        
        if (approverRoles.length === 0) {
            return null;
        }
        
        try {
            // Find users with the required role in the organization
            const approvers = await prisma.organizationMember.findMany({
                where: {
                    organizationId: organizationId,
                    role: {
                        in: approverRoles,
                    },
                    status: 'active', // Assuming 'active' status for active members
                },
                include: {
                    user: true,
                },
                take: 1,
            });
                
            // Return the first approver with the organizationId and role attached
            const approver = approvers[0];
            if (!approver) return null;
            
            // Ensure the role is one of the valid approver roles
            const role = this.isValidApproverRole(approver.role) 
                ? approver.role 
                : 'admin'; // Fallback to admin if somehow an invalid role got through
                
            return {
                ...approver.user,
                organizationId: approver.organizationId,
                role
            };
        } catch (error) {
            console.error('Error finding approver:', error);
            return null;
        }
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
        // Check if user has an active membership in the organization with an approver role
        const membership = await prisma.organizationMember.findFirst({
            where: {
                userId,
                organizationId,
                status: 'active',
                role: {
                    in: ['admin', 'super_admin'], // Assuming these are the approver roles
                },
            },
        });
            
        return !!membership;
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
        const pending = await prisma.approvalRequest.findMany({
            where: {
                organizationId,
                status: 'pending',
            },
        });
            
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
        const overdueRequests = await prisma.approvalRequest.findMany({
            where: {
                status: 'pending',
                dueDate: {
                    lte: now,
                },
            },
        });
            
        for (const request of overdueRequests) {
            await this.escalateRequest(request);
        }
    }
    /**
     * Escalate request to higher authority
     */
    private async escalateRequest(request: ApprovalRequestType): Promise<void> {
        // Find admin in the same organization through organization_members
        const escalatedApprover = await prisma.organizationMember.findFirst({
            where: {
                organizationId: request.organizationId,
                role: 'admin',
                status: 'active',
            },
            include: {
                user: true,
            },
        });
            
        if (escalatedApprover?.user) {
            const now = new Date();
            await prisma.approvalRequest.update({
                where: { id: request.id },
                data: {
                    approverId: escalatedApprover.user.id,
                    priority: (request.priority === 'urgent' ? 'urgent' : 'high'),
                    status: 'escalated',
                    updatedAt: now,
                    comment: (request.comment || 'Escalated to admin'),
                    rejectionReason: request.rejectionReason || null,
                    requestType: request.requestType || 'general',
                    escalationLevel: (request.escalationLevel || 0) + 1,
                },
            });
                
            // Log the escalation
            await prisma.approvalLog.create({
                data: {
                    requestId: request.id,
                    userId: request.requesterId,
                    action: 'escalated',
                    comment: 'Request escalated due to overdue',
                    metadata: {
                        fromApprover: request.approverId,
                        toApprover: escalatedApprover.user.id,
                        timestamp: new Date().toISOString()
                    },
                },
            });
        }
    }
}
export const approvalEngine = new ApprovalEngine();
