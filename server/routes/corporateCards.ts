import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { auditLogger } from "../auditLogger";
import { 
  createCardholder, 
  createCorporateCard, 
  authorizeTransaction, 
  createTransaction,
  getCardBalance,
  addFundsToCard,
  freezeCard,
  unfreezeCard
} from "../stripe";
import { requireAuth, requireAdminRole } from "../middleware/auth";

const router = Router();

// Validation schemas
const createCardholderSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postal_code: z.string().min(1),
      country: z.string().min(1),
    }),
  }),
});

const createCardSchema = z.object({
  user_id: z.number(),
  spend_limit: z.number().min(0),
  interval: z.string(),
  cardholder_name: z.string(),
  purpose: z.string().optional(),
  department: z.string().optional(),
});

const addFundsSchema = z.object({
  amount: z.number().min(1),
});

const createTransactionSchema = z.object({
  amount: z.number().min(1),
  currency: z.string().default("usd"),
  merchant_data: z.object({
    category: z.string(),
    name: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }),
});

// Create cardholder
router.post("/cardholders", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const validatedData = createCardholderSchema.parse(req.body);
    
    // Create cardholder in Stripe
    const stripeCardholder = await createCardholder(validatedData);
    
    // Store cardholder in database
    const cardholder = await storage.createCardholder({
      stripe_cardholder_id: stripeCardholder.id,
      name: validatedData.name,
      email: validatedData.email,
      phone_number: validatedData.phone_number,
      billing_address: JSON.stringify(validatedData.billing.address),
      organization_id: req.user!.organization_id!,
      created_by: req.user!.id,
    });

    await auditLogger.logAction({
      action: "CREATE_CARDHOLDER",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "cardholder",
      entityId: cardholder.id,
      riskLevel: "medium",
      details: {
        cardholder_id: cardholder.id,
        stripe_cardholder_id: stripeCardholder.id,
        name: validatedData.name,
        email: validatedData.email,
      },
    });

    res.json({ cardholder, stripe_cardholder: stripeCardholder });
  } catch (error: any) {
    console.error("Create cardholder error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create corporate card
router.post("/cards", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const validatedData = createCardSchema.parse(req.body);
    
    // First create a cardholder if needed
    const user = await storage.getUser(validatedData.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create cardholder in Stripe
    const stripeCardholder = await createCardholder({
      name: validatedData.cardholder_name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      billing: {
        address: {
          line1: "123 Main St", // Default address - in production, get from user
          city: "San Francisco",
          state: "CA",
          postal_code: "94102",
          country: "US",
        },
      },
    });

    // Create card in Stripe
    const stripeCard = await createCorporateCard({
      cardholder: stripeCardholder.id,
      currency: "usd",
      type: "virtual",
      spending_controls: {
        spending_limits: [
          {
            amount: validatedData.spend_limit, // Amount is already in cents from frontend
            interval: validatedData.interval === "monthly" ? "monthly" : "all_time",
          },
        ],
      },
      metadata: {
        user_id: validatedData.user_id.toString(),
        organization_id: req.user!.organization_id!.toString(),
        purpose: validatedData.purpose || "",
        department: validatedData.department || "",
      },
    });

    // Store card in database
    const card = await storage.createCorporateCard({
      stripe_card_id: stripeCard.id,
      user_id: validatedData.user_id,
      organization_id: req.user!.organization_id!,
      card_number_masked: stripeCard.last4 ? `****-****-****-${stripeCard.last4}` : "****-****-****-****",
      cardholder_name: validatedData.cardholder_name,
      card_type: "virtual",
      status: "active",
      spending_limit: validatedData.spend_limit,
      available_balance: validatedData.spend_limit,
      currency: "USD",
      purpose: validatedData.purpose,
      department: validatedData.department,
      stripe_cardholder_id: stripeCardholder.id,
      created_by: req.user!.id,
    });

    await auditLogger.logAction({
      action: "CREATE_CORPORATE_CARD",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "corporate_card",
      entityId: card.id,
      riskLevel: "medium",
      details: {
        card_id: card.id,
        stripe_card_id: stripeCard.id,
        user_id: validatedData.user_id,
        cardholder_name: validatedData.cardholder_name,
        spending_limit: validatedData.spend_limit,
      },
    });

    res.json({ card, stripe_card: stripeCard });
  } catch (error: any) {
    console.error("Create card error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add funds to card (admin only)
router.post("/cards/:cardId/add-funds", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { cardId } = req.params;
    const validatedData = addFundsSchema.parse(req.body);
    
    // Get card from database
    const card = await storage.getCorporateCard(parseInt(cardId));
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Verify card belongs to admin's organization
    if (card.organization_id !== req.user!.organization_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Add funds via Stripe
    const updatedStripeCard = await addFundsToCard(card.stripe_card_id, validatedData.amount * 100);
    
    // Update card balance in database
    const updatedCard = await storage.updateCorporateCard(card.id, {
      available_balance: card.available_balance + validatedData.amount,
      spending_limit: card.spending_limit + validatedData.amount,
    });

    await auditLogger.logAction({
      action: "ADD_CARD_FUNDS",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "corporate_card",
      entityId: card.id,
      riskLevel: "medium",
      details: {
        card_id: card.id,
        amount_added: validatedData.amount,
        new_balance: updatedCard.available_balance,
        stripe_card_id: card.stripe_card_id,
      },
    });

    res.json({ card: updatedCard, stripe_card: updatedStripeCard });
  } catch (error: any) {
    console.error("Add funds error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Freeze card
router.post("/cards/:cardId/freeze", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await storage.getCorporateCard(parseInt(cardId));
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.organization_id !== req.user!.organization_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Freeze card in Stripe
    const stripeCard = await freezeCard(card.stripe_card_id);
    
    // Update card status in database
    const updatedCard = await storage.updateCorporateCard(card.id, {
      status: "frozen",
    });

    await auditLogger.logAction({
      action: "FREEZE_CARD",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "corporate_card",
      entityId: card.id,
      riskLevel: "high",
      details: {
        card_id: card.id,
        stripe_card_id: card.stripe_card_id,
      },
    });

    res.json({ card: updatedCard, stripe_card: stripeCard });
  } catch (error: any) {
    console.error("Freeze card error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Unfreeze card
router.post("/cards/:cardId/unfreeze", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await storage.getCorporateCard(parseInt(cardId));
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.organization_id !== req.user!.organization_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Unfreeze card in Stripe
    const stripeCard = await unfreezeCard(card.stripe_card_id);
    
    // Update card status in database
    const updatedCard = await storage.updateCorporateCard(card.id, {
      status: "active",
    });

    await auditLogger.logAction({
      action: "UNFREEZE_CARD",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "corporate_card",
      entityId: card.id,
      riskLevel: "medium",
      details: {
        card_id: card.id,
        stripe_card_id: card.stripe_card_id,
      },
    });

    res.json({ card: updatedCard, stripe_card: stripeCard });
  } catch (error: any) {
    console.error("Unfreeze card error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create transaction
router.post("/cards/:cardId/transactions", requireAuth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const validatedData = createTransactionSchema.parse(req.body);
    
    const card = await storage.getCorporateCard(parseInt(cardId));
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Check if user owns the card or is admin
    if (card.user_id !== req.user!.id && !req.user!.role?.includes('admin')) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check available balance
    if (validatedData.amount > card.available_balance) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // Create transaction in Stripe
    const stripeTransaction = await createTransaction({
      amount: validatedData.amount * 100, // Convert to cents
      currency: validatedData.currency,
      card: card.stripe_card_id,
      merchant_data: validatedData.merchant_data,
      metadata: {
        card_id: cardId,
        user_id: req.user!.id.toString(),
      },
    });

    // Store transaction in database
    const transaction = await storage.createCardTransaction({
      card_id: card.id,
      user_id: req.user!.id,
      stripe_transaction_id: stripeTransaction.id,
      amount: validatedData.amount,
      currency: validatedData.currency,
      merchant_name: validatedData.merchant_data.name,
      merchant_category: validatedData.merchant_data.category,
      status: "completed",
      transaction_type: "purchase",
    });

    // Update card balance
    await storage.updateCorporateCard(card.id, {
      available_balance: card.available_balance - validatedData.amount,
    });

    await auditLogger.logAction({
      action: "CREATE_CARD_TRANSACTION",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "card_transaction",
      entityId: transaction.id,
      riskLevel: "medium",
      details: {
        transaction_id: transaction.id,
        card_id: card.id,
        amount: validatedData.amount,
        merchant: validatedData.merchant_data.name,
        stripe_transaction_id: stripeTransaction.id,
      },
    });

    res.json({ transaction, stripe_transaction: stripeTransaction });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get organization cards (admin only)
router.get("/cards", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const cards = await storage.getOrganizationCorporateCards(req.user!.organization_id!);
    res.json({ cards });
  } catch (error: any) {
    console.error("Get cards error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user cards
router.get("/cards/user/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    // Check if user is requesting their own cards or is admin
    if (targetUserId !== req.user!.id && !req.user!.role?.includes('admin')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const cards = await storage.getUserCorporateCards(targetUserId);
    res.json({ cards });
  } catch (error: any) {
    console.error("Get user cards error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get card transactions
router.get("/cards/:cardId/transactions", requireAuth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await storage.getCorporateCard(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Check if user owns the card or is admin
    if (card.user_id !== req.user!.id && !req.user!.role?.includes('admin')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const transactions = await storage.getCardTransactions(card.id);
    res.json({ transactions });
  } catch (error: any) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get card balance
router.get("/cards/:cardId/balance", requireAuth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await storage.getCorporateCard(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Check if user owns the card or is admin
    if (card.user_id !== req.user!.id && !req.user!.role?.includes('admin')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stripeBalance = await getCardBalance(card.stripe_card_id);
    
    res.json({
      card_id: card.id,
      available_balance: card.available_balance,
      spending_limit: card.spending_limit,
      currency: card.currency,
      stripe_balance: stripeBalance,
    });
  } catch (error: any) {
    console.error("Get balance error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete card
router.delete("/cards/:cardId", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await storage.getCorporateCard(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (card.organization_id !== req.user!.organization_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Cancel card in Stripe first  
    const Stripe = await import('stripe');
    const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY!);
    await stripe.issuing.cards.update(card.stripe_card_id, {
      status: 'canceled',
    });

    // Delete card from database
    const deleted = await storage.deleteCorporateCard(card.id);
    
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete card from database" });
    }

    await auditLogger.logAction({
      action: "DELETE_CORPORATE_CARD",
      userId: req.user!.id,
      organizationId: req.user!.organization_id!,
      entityType: "corporate_card",
      entityId: card.id,
      riskLevel: "high",
      details: {
        card_id: card.id,
        stripe_card_id: card.stripe_card_id,
        cardholder_name: card.cardholder_name,
      },
    });

    res.json({ success: true, message: "Card deleted successfully" });
  } catch (error: any) {
    console.error("Delete card error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;