import type { Express } from "express";
import { stripeIssuingService } from "../services/stripeIssuingService";
import { storage } from "../storage";
import { fieldTransformMiddleware } from "../middleware/fieldTransform";
// Using unified auth from existing middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const checkPermissions = (permissions: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user?.permissions?.some((p: string) => permissions.includes(p))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
import { z } from "zod";
import Stripe from "stripe";

const issueCardSchema = z.object({
  user_email: z.string().email(),
  spend_limit: z.number().min(10), // Minimum $10 (stored in dollars)
  interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  cardholder_name: z.string().min(1),
  purpose: z.string().optional(),
  department: z.string().optional(),
  allowed_categories: z.array(z.string()).optional(),
  blocked_categories: z.array(z.string()).optional(),
});

const updateCardSchema = z.object({
  spend_limit: z.number().min(10).optional(), // Minimum $10 (stored in dollars)
  status: z.enum(['active', 'inactive', 'canceled']).optional(),
  allowed_categories: z.array(z.string()).optional(),
  blocked_categories: z.array(z.string()).optional(),
});

const createExpenseSchema = z.object({
  card_id: z.number().optional(),
  trip_id: z.number().optional(),
  merchant_name: z.string().min(1),
  amount: z.number().min(1),
  currency: z.string().default('USD'),
  transaction_date: z.string(),
  expense_category: z.string(),
  description: z.string().optional(),
  business_purpose: z.string().optional(),
  receipt_url: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  mileage: z.number().optional(),
  billable_to_client: z.boolean().default(false),
  client_id: z.number().optional(),
  project_code: z.string().optional(),
});

const approveExpenseSchema = z.object({
  expense_id: z.number(),
  status: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
  approved_amount: z.number().optional(),
  policy_override: z.boolean().default(false),
  override_reason: z.string().optional(),
});

export function registerCorporateCardRoutes(app: Express): void {
  // Issue new corporate card
  app.post("/api/corporate-card/issue", 
    requireAuth, 
    checkPermissions(['MANAGE_ORGANIZATION', 'ADMIN_ACCESS']),
    async (req, res) => {
      try {
        const validatedData = issueCardSchema.parse(req.body);
        
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        // Look up user by email
        const targetUser = await storage.getUserByEmail(validatedData.user_email);
        if (!targetUser) {
          return res.status(404).json({ error: 'User not found with that email address' });
        }

        // Verify user belongs to same organization
        if (targetUser.organization_id !== req.user.organization_id) {
          return res.status(403).json({ error: 'User does not belong to your organization' });
        }

        const { user_email, ...cardData } = validatedData;
        const result = await stripeIssuingService.issueCard({
          ...cardData,
          user_id: targetUser.id,
          organization_id: req.user.organization_id,
        });

        res.json({
          success: true,
          card: result.card,
          stripe_details: result.stripe_card,
        });
      } catch (error) {
        console.error('Error issuing card:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to issue card' 
        });
      }
    }
  );

  // Get corporate cards for organization
  app.get("/api/corporate-card/cards", 
    requireAuth,
    fieldTransformMiddleware,
    async (req, res) => {
      try {
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const cards = await storage.getCorporateCardsByOrganization(req.user.organization_id);
        
        // Mask sensitive information
        const maskedCards = cards.map(card => ({
          ...card,
          card_token: undefined, // Remove sensitive token
        }));

        res.json({ cards: maskedCards });
      } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).json({ error: 'Failed to fetch cards' });
      }
    }
  );

  // Get cards for specific user
  app.get("/api/corporate-card/user/:user_id", 
    requireAuth,
    fieldTransformMiddleware,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.user_id);
        const cards = await storage.getCorporateCardsByUser(userId);
        
        // Check if user can access these cards
        const canAccess = req.user?.id === userId || 
                         req.user?.permissions?.includes('MANAGE_ORGANIZATION');
        
        if (!canAccess) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const maskedCards = cards.map(card => ({
          ...card,
          card_token: undefined,
        }));

        res.json(maskedCards);
      } catch (error) {
        console.error('Error fetching user cards:', error);
        res.status(500).json({ error: 'Failed to fetch user cards' });
      }
    }
  );

  // Update card controls
  app.put("/api/corporate-card/:card_id", 
    requireAuth,
    checkPermissions(['MANAGE_ORGANIZATION', 'ADMIN_ACCESS']),
    async (req, res) => {
      try {
        const cardId = parseInt(req.params.card_id);
        const validatedData = updateCardSchema.parse(req.body);

        const result = await stripeIssuingService.updateCardControls({
          card_id: cardId,
          ...validatedData,
        });

        res.json({
          success: true,
          card: result.card,
        });
      } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to update card' 
        });
      }
    }
  );

  // Freeze/unfreeze card
  app.post("/api/corporate-card/:card_id/freeze", 
    requireAuth,
    checkPermissions(['MANAGE_ORGANIZATION', 'ADMIN_ACCESS']),
    async (req, res) => {
      try {
        const cardId = parseInt(req.params.card_id);
        const { freeze } = req.body;

        const result = await stripeIssuingService.freezeCard(cardId, freeze);

        res.json({
          success: true,
          status: result.status,
        });
      } catch (error) {
        console.error('Error freezing/unfreezing card:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to update card status' 
        });
      }
    }
  );

  // Delete card
  app.delete("/api/corporate-card/:card_id", 
    requireAuth,
    checkPermissions(['MANAGE_ORGANIZATION', 'ADMIN_ACCESS']),
    async (req, res) => {
      try {
        const cardId = parseInt(req.params.card_id);
        
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const result = await stripeIssuingService.deleteCard(cardId, req.user.organization_id);

        res.json({
          success: true,
          message: 'Card deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to delete card' 
        });
      }
    }
  );

  // Get card transactions
  app.get("/api/corporate-card/:card_id/transactions", 
    requireAuth,
    async (req, res) => {
      try {
        const cardId = parseInt(req.params.card_id);
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await storage.getCardTransactions(cardId, limit, offset);
        res.json(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
      }
    }
  );

  // Create manual expense
  app.post("/api/expenses", 
    requireAuth,
    async (req, res) => {
      try {
        const validatedData = createExpenseSchema.parse(req.body);
        
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const expense = await storage.createExpense({
          ...validatedData,
          organization_id: req.user.organization_id,
          user_id: req.user.id,
          transaction_date: new Date(validatedData.transaction_date),
          status: 'pending',
          approval_status: validatedData.amount > 10000 ? 'pending' : 'auto_approved',
        });

        res.json({
          success: true,
          expense,
        });
      } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to create expense' 
        });
      }
    }
  );

  // Get expenses for user/organization
  app.get("/api/expenses", 
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : req.user?.id;
        const organizationId = req.user?.organization_id;
        const status = req.query.status as string;
        const category = req.query.category as string;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const expenses = await storage.getExpenses({
          user_id: userId,
          organization_id: organizationId,
          status,
          category,
          limit,
          offset,
        });

        res.json(expenses);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
      }
    }
  );

  // Approve/reject expense
  app.post("/api/expenses/approve", 
    requireAuth,
    checkPermissions(['MANAGE_ORGANIZATION', 'ADMIN_ACCESS']),
    async (req, res) => {
      try {
        const validatedData = approveExpenseSchema.parse(req.body);
        
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const approval = await storage.createExpenseApproval({
          expense_id: validatedData.expense_id,
          organization_id: req.user.organization_id,
          approver_id: req.user.id,
          status: validatedData.status,
          comments: validatedData.comments,
          approved_amount: validatedData.approved_amount,
          policy_override: validatedData.policy_override,
          override_reason: validatedData.override_reason,
          processed_at: new Date(),
        });

        // Update expense status
        await storage.updateExpense(validatedData.expense_id, {
          approval_status: validatedData.status,
          approved_by: req.user.id,
          approved_at: new Date(),
          rejection_reason: validatedData.status === 'rejected' ? validatedData.comments : undefined,
        });

        res.json({
          success: true,
          approval,
        });
      } catch (error) {
        console.error('Error processing expense approval:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to process approval' 
        });
      }
    }
  );

  // Get spending analytics
  app.get("/api/corporate-card/analytics", 
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user?.organization_id) {
          return res.status(400).json({ error: 'Organization ID required' });
        }

        const startDate = req.query.start_date as string;
        const endDate = req.query.end_date as string;

        const analytics = await storage.getSpendingAnalytics({
          organization_id: req.user.organization_id,
          start_date: startDate ? new Date(startDate) : undefined,
          end_date: endDate ? new Date(endDate) : undefined,
        });

        res.json(analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    }
  );

  // Stripe Issuing webhook endpoint
  app.post("/api/webhooks/stripe-issuing", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.ISSUING_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Missing ISSUING_WEBHOOK_SECRET environment variable');
      return res.status(400).send('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      if (!sig) {
        throw new Error('Missing stripe-signature header');
      }
      
      event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      await stripeIssuingService.processWebhookEvent(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
}