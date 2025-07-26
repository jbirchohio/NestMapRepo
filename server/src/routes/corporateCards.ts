import type { Express } from "express";
import { db } from "../db";
import { corporateCards, cardTransactions, users } from "../db/schema";
import { eq } from '../utils/drizzle-shim';
import { and, or } from '../utils/drizzle-shim';
import { desc } from '../utils/drizzle-shim';
import { authenticate as validateJWT } from '../../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../../middleware/organizationContext';

export function registerCorporateCardRoutes(app: Express) {
  // Apply middleware to all corporate card routes
  app.use('/api/corporate-cards', validateJWT);
  app.use('/api/corporate-cards', injectOrganizationContext);
  app.use('/api/corporate-cards', validateOrganizationAccess);
  
  // Get all corporate cards for organization
  app.get("/api/corporate-cards/cards", async (req, res) => {
    const organizationId = req.organization?.id;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const cards = await db
        .select({
          id: corporateCards.id,
          stripe_card_id: corporateCards.stripe_card_id,
          organization_id: corporateCards.organization_id,
          user_id: corporateCards.user_id,
          cardholder_name: corporateCards.cardholder_name,
          card_number_masked: corporateCards.card_number_masked,
          card_type: corporateCards.card_type,
          status: corporateCards.status,
          spending_limit: corporateCards.spending_limit,
          available_balance: corporateCards.available_balance,
          currency: corporateCards.currency,
          purpose: corporateCards.purpose,
          department: corporateCards.department,
          created_at: corporateCards.created_at,
          updated_at: corporateCards.updated_at
        })
        .from(corporateCards)
        .leftJoin(users, eq(corporateCards.user_id, users.id))
        .where(eq(corporateCards.organization_id, organizationId))
        .orderBy(desc(corporateCards.created_at));

      return res.json({ cards });
    } catch (error) {
      console.error("Error fetching corporate cards:", error);
      return res.status(500).json({ error: "Failed to fetch corporate cards" });
    }
  });

  // Create new corporate card
  app.post("/api/corporate-cards/cards", async (req, res) => {
    const organizationId = req.organization?.id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const { user_id, spend_limit, cardholder_name, purpose, department } = req.body;

      // Generate mock card data for demo
      const cardNumber = "1234" + Math.random().toString().slice(2, 8);
      const stripeCardId = "ic_" + Math.random().toString(36).substring(2, 15);

      const [newCard] = await db
        .insert(corporateCards)
        .values({
          organization_id: organizationId,
          user_id,
          stripe_card_id: stripeCardId,
          card_number_masked: `**** **** **** ${cardNumber.slice(-4)}`,
          card_token: "encrypted_token_" + Math.random().toString(36),
          card_provider: "stripe",
          card_type: "virtual",
          status: "active",
          spending_limit: spend_limit * 100, // Convert to cents
          available_balance: spend_limit * 100,
          currency: "USD",
          cardholder_name,
          purpose,
          department,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();

      return res.json(newCard);
    } catch (error) {
      console.error("Error creating corporate card:", error);
      return res.status(500).json({ error: "Failed to create corporate card" });
    }
  });

  // Freeze/unfreeze card
  app.post("/api/corporate-cards/cards/:cardId/freeze", validateJWT, injectOrganizationContext, validateOrganizationAccess, async (req, res) => {
    const organizationId = req.organization?.id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const cardId = parseInt(req.params.cardId);
      const { freeze } = req.body;

      // Verify card belongs to organization
      const [card] = await db
        .select()
        .from(corporateCards)
        .where(and(
          eq(corporateCards.id, cardId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      const [updatedCard] = await db
        .update(corporateCards)
        .set({
          status: freeze ? 'inactive' : 'active',
          updated_at: new Date()
        })
        .where(eq(corporateCards.id, cardId))
        .returning();

      return res.json(updatedCard);
    } catch (error) {
      console.error("Error updating card status:", error);
      return res.status(500).json({ error: "Failed to update card status" });
    }
  });

  // Update card
  app.put("/api/corporate-cards/cards/:cardId", validateJWT, injectOrganizationContext, validateOrganizationAccess, async (req, res) => {
    const organizationId = req.organization?.id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const cardId = parseInt(req.params.cardId);
      const updates = req.body;

      // Verify card belongs to organization
      const [card] = await db
        .select()
        .from(corporateCards)
        .where(and(
          eq(corporateCards.id, cardId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Convert spend_limit to cents if provided
      if (updates.spend_limit) {
        updates.spending_limit = updates.spend_limit * 100;
        delete updates.spend_limit;
      }

      const [updatedCard] = await db
        .update(corporateCards)
        .set({
          ...updates,
          updated_at: new Date()
        })
        .where(eq(corporateCards.id, cardId))
        .returning();

      return res.json(updatedCard);
    } catch (error) {
      console.error("Error updating card:", error);
      return res.status(500).json({ error: "Failed to update card" });
    }
  });

  // Add funds to card
  app.post("/api/corporate-cards/cards/:cardId/add-funds", validateJWT, injectOrganizationContext, validateOrganizationAccess, async (req, res) => {
    const organizationId = req.organization?.id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }
    
    try {
      const cardId = parseInt(req.params.cardId);
      const { amount } = req.body;

      // Verify card belongs to organization
      const [card] = await db
        .select()
        .from(corporateCards)
        .where(and(
          eq(corporateCards.id, cardId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      const amountInCents = amount * 100;
      const [updatedCard] = await db
        .update(corporateCards)
        .set({
          available_balance: (card.available_balance || 0) + amountInCents,
          spending_limit: (card.spending_limit || 0) + amountInCents,
          updated_at: new Date()
        })
        .where(eq(corporateCards.id, cardId))
        .returning();

      return res.json(updatedCard);
    } catch (error) {
      console.error("Error adding funds to card:", error);
      return res.status(500).json({ error: "Failed to add funds to card" });
    }
  });

  // Delete card
  app.delete("/api/corporate-cards/cards/:cardId", validateJWT, async (req, res) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const cardId = parseInt(req.params.cardId);

      // Verify card belongs to organization before deleting
      const [card] = await db
        .select()
        .from(corporateCards)
        .where(and(
          eq(corporateCards.id, cardId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      await db.delete(corporateCards).where(eq(corporateCards.id, cardId));

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting card:", error);
      return res.status(500).json({ error: "Failed to delete card" });
    }
  });

  // Get all transactions for organization
  app.get("/api/corporate-cards/transactions", validateJWT, async (req, res) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const transactions = await db
        .select()
        .from(cardTransactions)
        .leftJoin(corporateCards, eq(cardTransactions.card_id, corporateCards.id))
        .where(eq(corporateCards.organization_id, organizationId))
        .orderBy(desc(cardTransactions.transaction_date));

      return res.json({ transactions });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Get a single transaction
  app.get("/api/corporate-cards/transactions/:transactionId", validateJWT, async (req, res) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const transactionId = parseInt(req.params.transactionId);

      const [transaction] = await db
        .select()
        .from(cardTransactions)
        .leftJoin(corporateCards, eq(cardTransactions.card_id, corporateCards.id))
        .where(and(
          eq(cardTransactions.id, transactionId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      return res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  // Get users for corporate card assignment
  app.get("/api/corporate-cards/users", validateJWT, async (req, res) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is missing" });
    }

    try {
      const orgUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.organization_id, organizationId));

      return res.json({ users: orgUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get card transactions
  app.get("/api/corporate-cards/cards/:cardId/transactions", validateJWT, async (req, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
            const organizationId = req.user!.organizationId;

      // Verify card belongs to organization
      const [card] = await db
        .select()
        .from(corporateCards)
        .where(and(
          eq(corporateCards.id, cardId),
          eq(corporateCards.organization_id, organizationId)
        ));

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      const transactions = await db
        .select()
        .from(cardTransactions)
        .where(eq(cardTransactions.card_id, cardId))
        .orderBy(desc(cardTransactions.created_at));

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching card transactions:", error);
      res.status(500).json({ error: "Failed to fetch card transactions" });
    }
  });

  // Get corporate card analytics
  app.get("/api/corporate-card/analytics", validateJWT, async (req, res) => {
    try {
            const organizationId = req.user!.organizationId;

      // Get basic analytics for demo
      const cards = await db
        .select()
        .from(corporateCards)
        .where(eq(corporateCards.organization_id, organizationId));

      const analytics = {
        totalCards: cards.length,
        activeCards: cards.filter(c => c.status === 'active').length,
        totalSpending: cards.reduce((sum, card) => sum + (card.spending_limit || 0), 0) / 100,
        availableBalance: cards.reduce((sum, card) => sum + (card.available_balance || 0), 0) / 100
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching corporate card analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get expenses (placeholder for corporate card expenses)
  app.get("/api/expenses", validateJWT, async (req, res) => {
    try {
      // Return empty array for now - this would integrate with expense tracking
      res.json([]);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Approve expense
  app.post("/api/expenses/approve", validateJWT, async (req, res) => {
    try {
      // Placeholder for expense approval
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving expense:", error);
      res.status(500).json({ error: "Failed to approve expense" });
    }
  });

  // Get organization users for dropdown
  app.get("/api/organizations/users", validateJWT, async (req, res) => {
    try {
            const organizationId = req.user!.organizationId;

      const organizationUsers = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email
        })
        .from(users)
        .where(eq(users.organization_id, organizationId));

      res.json(organizationUsers);
    } catch (error) {
      console.error("Error fetching organization users:", error);
      res.status(500).json({ error: "Failed to fetch organization users" });
    }
  });
}



