import { Router } from 'express';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { db } from '../db/db';
import { 
  approvalRequests, 
  approvalRules, 
  trips, 
  expenses, 
  users,
  insertApprovalRequestSchema,
  insertApprovalRuleSchema 
} from '../db/schema';
import { z } from 'zod';
import { authenticate } from '../middleware/secureAuth';
import { asyncHandler } from '../utils/routeHelpers';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { EnhancedApprovalWorkflow } from '../enhancedApprovalWorkflow';
import { CommunicationIntegrationService } from '../communicationIntegration';
import { auditLogger } from '../auditLogger';

const router = Router();
const enhancedApprovalWorkflow = EnhancedApprovalWorkflow.getInstance();
const communicationService = CommunicationIntegrationService.getInstance();

// Apply middleware to all approval routes
router.use(authenticate);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// Get pending approval requests for manager
router.get('/pending', asyncHandler(async (req, res) => {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only managers and admins can view approval requests
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to view approval requests" });
    }
    
    // Get pending requests assigned to this user or their role
    const pendingRequests = await db
      .select({
        id: approvalRequests.id,
        entityType: approvalRequests.entityType,
        entityId: approvalRequests.entityId,
        requestType: approvalRequests.requestType,
        proposedData: approvalRequests.proposedData,
        reason: approvalRequests.reason,
        businessJustification: approvalRequests.businessJustification,
        status: approvalRequests.status,
        priority: approvalRequests.priority,
        dueDate: approvalRequests.dueDate,
        escalationLevel: approvalRequests.escalationLevel,
        createdAt: approvalRequests.createdAt,
        requester: {
          id: users.id,
          displayName: users.display_name,
          email: users.email
        }
      })
      .from(approvalRequests)
      .leftJoin(users, eq(approvalRequests.requesterId, users.id))
      .where(and(
        eq(approvalRequests.organizationId, organizationId),
        eq(approvalRequests.status, 'pending'),
        or(
          eq(approvalRequests.approverId, userId),
          isNull(approvalRequests.approverId) // Unassigned requests
        )
      ))
      .orderBy(desc(approvalRequests.priority), desc(approvalRequests.createdAt));
    
    res.json(pendingRequests);
}));

// Approve or reject a request
router.patch('/:requestId/decision', asyncHandler(async (req, res) => {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const requestId = parseInt(req.params.requestId);
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { decision, reason } = req.body;
    
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'approve' or 'reject'" });
    }
    
    // Only managers and admins can make approval decisions
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to make approval decisions" });
    }
    
    // Get the approval request
    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(and(
        eq(approvalRequests.id, requestId),
        eq(approvalRequests.organizationId, organizationId)
      ));
    
    if (!request) {
      return res.status(404).json({ error: "Approval request not found" });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request has already been processed" });
    }
    
    // Update the approval request
    const updateData = decision === 'approve' 
      ? {
          status: 'approved' as const,
          approverId: userId,
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      : {
          status: 'rejected' as const,
          approverId: userId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date()
        };
    
    const [updatedRequest] = await db
      .update(approvalRequests)
      .set(updateData)
      .where(eq(approvalRequests.id, requestId))
      .returning();
    
    // If approved, apply the changes to the entity
    if (decision === 'approve') {
      await applyApprovedChanges(request);
    }
    
    res.json(updatedRequest);
}));

// Create approval request
router.post('/', asyncHandler(async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const validatedData = insertApprovalRequestSchema.parse(req.body);
    
    // Check if approval is required based on rules
    const requiresApproval = await checkApprovalRequired(
      organizationId,
      validatedData.entityType,
      validatedData.proposedData
    );
    
    if (!requiresApproval.required) {
      return res.status(200).json({ 
        message: "No approval required",
        autoApproved: true 
      });
    }
    
    // Find appropriate approver
    const approver = await findApprover(organizationId, validatedData.entityType, validatedData.proposedData);
    
    // Create approval request
    const [newRequest] = await db
      .insert(approvalRequests)
      .values({
        ...validatedData,
        organizationId,
        requesterId: userId,
        approverId: approver?.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        priority: requiresApproval.priority || 'normal'
      })
      .returning();
    
    res.status(201).json(newRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.errors
      });
    }
    throw error;
  }
}));

// Get approval rules for organization
router.get('/rules', asyncHandler(async (req, res) => {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only admins can view approval rules
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to view approval rules" });
    }
    
    const rules = await db
      .select()
      .from(approvalRules)
      .where(eq(approvalRules.organizationId, organizationId))
      .orderBy(approvalRules.priority);
    
    res.json(rules);
}));

// Create or update approval rule
router.post('/rules', asyncHandler(async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only admins can manage approval rules
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to manage approval rules" });
    }
    
    const validatedData = insertApprovalRuleSchema.parse(req.body);
    
    const [newRule] = await db
      .insert(approvalRules)
      .values({
        ...validatedData,
        organizationId
      })
      .returning();
    
    res.status(201).json(newRule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.errors
      });
    }
    throw error;
  }
}));

// Helper function to check if approval is required
async function checkApprovalRequired(
  organizationId: number,
  entityType: string,
  proposedData: Record<string, any>
): Promise<{ required: boolean; priority?: string; ruleId?: number }> {
  const rules = await db
    .select()
    .from(approvalRules)
    .where(and(
      eq(approvalRules.organizationId, organizationId),
      eq(approvalRules.entityType, entityType),
      eq(approvalRules.active, true)
    ))
    .orderBy(approvalRules.priority);
  
  for (const rule of rules) {
    if (matchesConditions(rule.conditions, proposedData)) {
      if (rule.autoApprove) {
        return { required: false };
      }
      return { 
        required: true, 
        priority: calculatePriority(rule.conditions, proposedData),
        ruleId: rule.id 
      };
    }
  }
  
  return { required: false };
}

// Helper function to match rule conditions
function matchesConditions(conditions: any, data: Record<string, any>): boolean {
  if (conditions.budgetThreshold && data.totalAmount) {
    if (data.totalAmount >= conditions.budgetThreshold * 100) { // Convert to cents
      return true;
    }
  }
  
  if (conditions.tripDuration && data.startDate && data.endDate) {
    const duration = Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
    if (duration >= conditions.tripDuration) {
      return true;
    }
  }
  
  if (conditions.destinationCountries && data.country) {
    if (conditions.destinationCountries.includes(data.country)) {
      return true;
    }
  }
  
  return false;
}

// Helper function to calculate priority
function calculatePriority(conditions: any, data: Record<string, any>): string {
  if (conditions.budgetThreshold && data.totalAmount) {
    if (data.totalAmount >= conditions.budgetThreshold * 300) { // 3x threshold
      return 'urgent';
    } else if (data.totalAmount >= conditions.budgetThreshold * 200) { // 2x threshold
      return 'high';
    }
  }
  
  return 'normal';
}

// Helper function to find appropriate approver
async function findApprover(
  organizationId: number,
  entityType: string,
  proposedData: Record<string, any>
): Promise<{ id: number } | null> {
  // Find managers in the organization
  const [manager] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.organizationId, organizationId),
      eq(users.role, 'manager')
    ))
    .limit(1);
  
  return manager || null;
}

// Helper function to apply approved changes
async function applyApprovedChanges(request: any): Promise<void> {
  try {
    switch (request.entityType) {
      case 'trip':
        if (request.requestType === 'create') {
          // Create the trip with approved data
          await db.insert(trips).values({
            ...request.proposedData,
            organization_id: request.organization_id,
            user_id: request.requesterId
          });
        } else if (request.requestType === 'modify') {
          // Update existing trip
          await db
            .update(trips)
            .set(request.proposedData)
            .where(eq(trips.id, request.entityId));
        }
        break;
        
      case 'expense':
        if (request.requestType === 'approve') {
          // Approve the expense
          await db
            .update(expenses)
            .set({ 
              status: 'approved',
              approved_by: request.approverId,
              approved_at: new Date()
            })
            .where(eq(expenses.id, request.entityId));
        }
        break;
    }
  } catch (error) {
    console.error('Error applying approved changes:', error);
  }
}

// Get all approval requests (enhanced)
router.get('/requests', asyncHandler(async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { status, entityType, priority } = req.query;
    
    const requests = await enhancedApprovalWorkflow.getApprovalRequests(organizationId, {
      status: status as string,
      entityType: entityType as string,
      priority: priority as string
    });

    await auditLogger.log({
      action: 'approval_requests_viewed',
      userId: req.user.id,
      organizationId,
      details: { 
        filters: { status, entityType, priority },
        requestCount: requests.length 
      }
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
}));

// Process approval request (approve/reject)
router.post('/requests/:requestId/process', asyncHandler(async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comments } = req.body;
    const organizationId = req.user.organization_id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approved or rejected' });
    }

    const result = await enhancedApprovalWorkflow.processApproval(
      requestId,
      req.user.id,
      action,
      comments
    );

    // Send notification about the approval decision
    await communicationService.sendNotification(organizationId, {
      title: `Approval Request ${action}`,
      message: `Your approval request has been ${action}`,
      type: 'approval_decision',
      priority: 'normal',
      recipients: [result.requesterId],
      data: {
        requestId,
        action,
        comments,
        approverId: req.user.id
      }
    });

    await auditLogger.log({
      action: 'approval_request_processed',
      userId: req.user.id,
      organizationId,
      details: { requestId, action, comments }
    });

    res.json(result);
  } catch (error) {
    console.error('Error processing approval request:', error);
    res.status(500).json({ error: 'Failed to process approval request' });
  }
}));

// Add comment to approval request
router.post('/requests/:requestId/comments', asyncHandler(async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const organizationId = req.user.organization_id;

    const commentResult = await enhancedApprovalWorkflow.addComment(
      requestId,
      req.user.id,
      comment
    );

    await auditLogger.log({
      action: 'approval_comment_added',
      userId: req.user.id,
      organizationId,
      details: { requestId, commentId: commentResult.id }
    });

    res.json(commentResult);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}));

// Get comments for approval request
router.get('/requests/:requestId/comments', asyncHandler(async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const comments = await enhancedApprovalWorkflow.getComments(requestId);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}));

// Get approval templates
router.get('/templates', asyncHandler(async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    const templates = await enhancedApprovalWorkflow.getApprovalTemplates(organizationId);
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching approval templates:', error);
    res.status(500).json({ error: 'Failed to fetch approval templates' });
  }
}));

// Create approval template
router.post('/templates', asyncHandler(async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const templateData = req.body;

    // Only admins can create templates
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required to create approval templates' });
    }

    const template = await enhancedApprovalWorkflow.createApprovalTemplate(
      organizationId,
      templateData
    );

    await auditLogger.log({
      action: 'approval_template_created',
      userId: req.user.id,
      organizationId,
      details: { templateId: template.id, templateName: template.name }
    });

    res.json(template);
  } catch (error) {
    console.error('Error creating approval template:', error);
    res.status(500).json({ error: 'Failed to create approval template' });
  }
}));

// Delegate approval
router.post('/requests/:requestId/delegate', asyncHandler(async (req, res) => {
  try {
    const { requestId } = req.params;
    const { delegateToUserId, reason } = req.body;
    const organizationId = req.user.organization_id;

    const result = await enhancedApprovalWorkflow.delegateApproval(
      requestId,
      req.user.id,
      delegateToUserId,
      reason
    );

    // Notify the delegate
    await communicationService.sendNotification(organizationId, {
      title: 'Approval Delegated to You',
      message: `An approval request has been delegated to you`,
      type: 'approval_delegation',
      priority: 'normal',
      recipients: [delegateToUserId],
      data: {
        requestId,
        delegatedBy: req.user.id,
        reason
      }
    });

    await auditLogger.log({
      action: 'approval_delegated',
      userId: req.user.id,
      organizationId,
      details: { requestId, delegateToUserId, reason }
    });

    res.json(result);
  } catch (error) {
    console.error('Error delegating approval:', error);
    res.status(500).json({ error: 'Failed to delegate approval' });
  }
}));

// Get approval statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { startDate, endDate } = req.query;
    
    const stats = await enhancedApprovalWorkflow.getApprovalStatistics(
      organizationId,
      startDate as string,
      endDate as string
    );
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching approval statistics:', error);
    res.status(500).json({ error: 'Failed to fetch approval statistics' });
  }
}));

export default router;
