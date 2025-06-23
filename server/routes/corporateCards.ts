import type { Express, Request, Response, NextFunction } from 'express';
import { db } from '../db/db.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/secureAuth.js';
import type { User } from '../db/schema.js';
import { organizations, users } from '../db/schema.js';
import { 
  corporateCards, 
  cardStatusEnum, 
  cardTypeEnum,
  type CorporateCard,
  type NewCorporateCard,
  type UpdateCorporateCard
} from '../db/corporateCardSchema.js';
import { 
  cardTransactions,
  transactionStatusEnum,
  transactionTypeEnum,
  type CardTransaction,
  type NewCardTransaction,
  type UpdateCardTransaction
} from '../db/cardTransactionSchema.js';
// Extend Express Request type to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: User;
      organization?: {
        id: string;
        name: string;
        slug: string;
        settings?: Record<string, unknown>;
      };
    }
  }
}

// Middleware for organization context injection (simplified for example)
async function injectOrganizationContext(req: Request, _res: Response, next: NextFunction) {
  try {
    // In a real app, you'd get this from JWT or session
    if (req.headers['x-organization-id']) {
      req.organization = { 
        id: req.headers['x-organization-id'] as string,
        name: '',
        slug: '',
        settings: {}
      };
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Middleware for organization access validation
function validateOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.organization?.id) {
    return res.status(403).json({ error: 'Organization context required' });
  }
  return next();
}

export default function corporateCardsRoutes(app: Express) {
    // Apply authentication and organization middleware to all routes
    app.use(authenticate);
    app.use(injectOrganizationContext);
    app.use(validateOrganizationAccess);

    // Get all corporate cards for organization
    app.get("/api/corporate-cards", async (req: Request, res: Response) => {
        const organizationId = req.organization?.id;
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        try {
            const cards = await db.select({
                id: corporateCards.id,
                organizationId: corporateCards.organizationId,
                cardholderId: corporateCards.cardholderId,
                cardNumber: corporateCards.cardNumber,
                lastFour: corporateCards.lastFour,
                cardType: corporateCards.cardType,
                status: corporateCards.status,
                expirationDate: corporateCards.expirationDate,
                spendingLimit: corporateCards.spendingLimit,
                monthlyLimit: corporateCards.monthlyLimit,
                currency: corporateCards.currency,
                isDefault: corporateCards.isDefault,
                lastUsed: corporateCards.lastUsed,
                metadata: corporateCards.metadata,
                createdAt: corporateCards.createdAt,
                updatedAt: corporateCards.updatedAt,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                }
            })
            .from(corporateCards)
            .leftJoin(users, eq(corporateCards.cardholderId, users.id))
            .where(eq(corporateCards.organizationId, organizationId))
            .orderBy(desc(corporateCards.createdAt));

            return res.json({ data: cards });
        } catch (error) {
            console.error("Error fetching corporate cards:", error);
            return res.status(500).json({ error: "Failed to fetch corporate cards" });
        }
    });

    // Get corporate card by ID
    app.get("/api/corporate-cards/cards/:cardId", async (req: Request<{ cardId: string }>, res: Response) => {
        const organizationId = req.organization?.id;
        const { cardId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        try {
            // Ensure we have valid UUID strings
            const cardIdStr = String(cardId);
            const orgIdStr = String(organizationId);

            // Get card with proper type safety using Drizzle's query builder
            const card = await db.query.corporateCards.findFirst({
                where: (cards, { and, eq }) => and(
                    eq(cards.id, cardIdStr),
                    eq(cards.organizationId, orgIdStr)
                )
            });

            if (!card) {
                return res.status(404).json({ error: "Card not found" });
            }

            // Get cardholder details with proper typing if cardholderId exists
            let cardholderData = null;
            if ('cardholderId' in card && card.cardholderId) {
                const user = await db.query.users.findFirst({
                    where: (users, { eq }) => eq(users.id, card.cardholderId as string)
                });
                
                if (user) {
                    cardholderData = {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    };
                }
            }

            // Return the card data with cardholder information
            return res.json({ 
                data: { 
                    ...card, 
                    cardholder: cardholderData 
                } 
            });
        } catch (error) {
            console.error("Error fetching corporate card:", error);
            return res.status(500).json({ error: "Failed to fetch corporate card" });
        }
    });

    // Create new corporate card
    app.post("/api/corporate-cards", async (req: Request<{}, {}, NewCorporateCard>, res: Response) => {
        const organizationId = req.organization?.id;
        const userId = req.user?.id;

        if (!organizationId || !userId) {
            return res.status(400).json({ error: "Organization ID or User ID is missing" });
        }

        try {
            // Ensure all required fields are present with proper types
            const cardData: NewCorporateCard = {
                organizationId,
                cardNumber: req.body.cardNumber,
                lastFour: req.body.lastFour,
                cardType: req.body.cardType || cardTypeEnum.enumValues[0],
                status: req.body.status || cardStatusEnum.enumValues[0],
                expirationDate: req.body.expirationDate,
                cvv: req.body.cvv,
                spendingLimit: req.body.spendingLimit,
                monthlyLimit: req.body.monthlyLimit,
                currency: req.body.currency || 'USD',
                isDefault: false,
                metadata: {},
                cardholderId: req.body.cardholderId || null,
                lastUsed: null
            };

            // Ensure we have a valid organization ID
            if (!req.organization?.id) {
                return res.status(400).json({ error: 'Organization ID is required' });
            }

            // Prepare the card data with proper types
            const cardValues = {
                organizationId: req.organization.id,
                cardNumber: String(cardData.cardNumber || ''),
                lastFour: String(cardData.lastFour || '').slice(-4), // Ensure last four digits only
                cardType: (cardData.cardType === 'virtual' ? 'virtual' : 'physical') as 'physical' | 'virtual',
                status: ([
                    'active', 'suspended', 'cancelled', 'expired', 'lost', 'stolen'
                ].includes(String(cardData.status || '')) ? String(cardData.status) : 'active') as 'active' | 'suspended' | 'cancelled' | 'expired' | 'lost' | 'stolen',
                expirationDate: cardData.expirationDate 
                    ? new Date(cardData.expirationDate as string | number | Date) 
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
                cvv: cardData.cvv ? String(cardData.cvv) : null,
                spendingLimit: cardData.spendingLimit ? String(cardData.spendingLimit) : null,
                monthlyLimit: cardData.monthlyLimit ? String(cardData.monthlyLimit) : null,
                currency: cardData.currency || 'USD',
                isDefault: Boolean(cardData.isDefault),
                metadata: cardData.metadata || {},
                cardholderId: typeof cardData.cardholderId === 'string' ? cardData.cardholderId : null,
                lastUsed: null
            };

            // Create the card using Drizzle's query builder with explicit types
            const insertValues = {
                organizationId: cardValues.organizationId,
                cardNumber: cardValues.cardNumber,
                lastFour: cardValues.lastFour,
                cardType: cardValues.cardType,
                status: cardValues.status,
                expirationDate: cardValues.expirationDate,
                cvv: cardValues.cvv,
                spendingLimit: cardValues.spendingLimit,
                monthlyLimit: cardValues.monthlyLimit,
                currency: cardValues.currency,
                isDefault: cardValues.isDefault,
                metadata: cardValues.metadata,
                cardholderId: cardValues.cardholderId,
                lastUsed: cardValues.lastUsed
            };

            const [newCard] = await db.insert(corporateCards)
                .values(insertValues as any) // Type assertion needed due to Drizzle ORM type complexity
                .returning();

            return res.status(201).json({ data: newCard });
        } catch (error) {
            console.error("Error creating corporate card:", error);
            return res.status(500).json({ error: "Failed to create corporate card" });
        }
    });

    // Get all transactions for a card
    app.get("/api/corporate-cards/:cardId/transactions", async (req: Request<{ cardId: string }>, res: Response) => {
        const organizationId = req.organization?.id;
        const { cardId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        try {
            const transactions = await db.select({
                id: cardTransactions.id,
                organizationId: cardTransactions.organizationId,
                corporateCardId: cardTransactions.corporateCardId,
                userId: cardTransactions.userId,
                transactionId: cardTransactions.transactionId,
                merchantName: cardTransactions.merchantName,
                merchantCategory: cardTransactions.merchantCategory,
                amount: cardTransactions.amount,
                currency: cardTransactions.currency,
                status: cardTransactions.status,
                type: cardTransactions.type,
                description: cardTransactions.description,
                notes: cardTransactions.notes,
                receiptUrl: cardTransactions.receiptUrl,
                isReimbursable: cardTransactions.isReimbursable,
                isBillable: cardTransactions.isBillable,
                isPersonal: cardTransactions.isPersonal,
                isDisputed: cardTransactions.isDisputed,
                isRecurring: cardTransactions.isRecurring,
                transactionDate: cardTransactions.transactionDate,
                postedDate: cardTransactions.postedDate,
                metadata: cardTransactions.metadata,
                createdAt: cardTransactions.createdAt,
                updatedAt: cardTransactions.updatedAt,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                }
            })
            .from(cardTransactions)
            .leftJoin(users, eq(cardTransactions.userId, users.id))
            .where(
                and(
                    eq(sql`${cardTransactions.corporateCardId}::text`, cardId),
                    eq(sql`${cardTransactions.organizationId}::text`, organizationId)
                )
            )
            .orderBy(desc(cardTransactions.transactionDate));

            return res.json({ data: transactions });
        } catch (error) {
            console.error("Error fetching card transactions:", error);
            return res.status(500).json({ error: "Failed to fetch card transactions" });
        }
    });

    // Get a single transaction by ID
    app.get("/api/corporate-cards/transactions/:transactionId", async (req: Request<{ transactionId: string }>, res: Response) => {
        const organizationId = req.organization?.id;
        const { transactionId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        try {
            const [transaction] = await db
                .select()
                .from(cardTransactions)
                .where(
                    and(
                        eq(cardTransactions.id, transactionId),
                        eq(cardTransactions.organizationId, organizationId)
                    )
                )
                .leftJoin(users, eq(cardTransactions.userId, users.id));

            if (!transaction) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            // Update transaction status with proper typing
            const [updated] = await db
                .update(cardTransactions)
                .set({
                    status: 'pending' as 'pending' | 'completed' | 'declined' | 'refunded' | 'disputed',
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(cardTransactions.id, transactionId as string),
                        eq(cardTransactions.organizationId, organizationId)
                    )
                )
                .returning();

            return res.json({ data: updated });
        } catch (error) {
            console.error("Error fetching transaction:", error);
            return res.status(500).json({ error: "Failed to fetch transaction" });
        }
    });

    // Record a new transaction for a corporate card
    app.post("/api/corporate-cards/:cardId/transactions", authenticate, async (req: Request<{ cardId: string }, {}, NewCardTransaction>, res: Response) => {
        const organizationId = req.organization?.id;
        const userId = req.user?.id;
        const { cardId } = req.params;

        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        if (!userId) {
            return res.status(400).json({ error: "User ID is missing" });
        }

        try {
            // Verify the card exists and belongs to the organization
            const [card] = await db
                .select()
                .from(corporateCards)
                .where(
                    and(
                        eq(sql`${corporateCards.id}::text`, sql`${cardId}::text`),
                        eq(sql`${corporateCards.organizationId}::text`, sql`${organizationId}::text`),
                        eq(sql`${corporateCards.status}::text`, sql`'active'::text`)
                    )
                )
                .limit(1);

            if (!card) {
                return res.status(404).json({ error: "Card not found or inactive" });
            }

            // Validate required fields
            if (!req.body.amount) {
                return res.status(400).json({ error: "Amount is required" });
            }

            if (!req.body.merchantName) {
                return res.status(400).json({ error: "Merchant name is required" });
            }

            // Create transaction data with proper types and defaults
            const transactionData = {
                organizationId,
                corporateCardId: cardId,
                userId: userId || null, // Can be null
                amount: String(req.body.amount),
                merchantName: String(req.body.merchantName),
                merchantCategory: typeof req.body.merchantCategory === 'string' ? req.body.merchantCategory : null,
                transactionDate: new Date(),
                transactionId: typeof req.body.transactionId === 'string' 
                    ? req.body.transactionId 
                    : `txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
                description: typeof req.body.description === 'string' ? req.body.description : null,
                status: 'pending' as const,
                type: 'purchase' as const,
                currency: 'USD',
                isReimbursable: true,
                isBillable: true,
                isPersonal: false,
                isDisputed: false,
                isRecurring: false,
                receiptUrl: typeof req.body.receiptUrl === 'string' ? req.body.receiptUrl : null,
                notes: typeof req.body.notes === 'string' ? req.body.notes : null,
                metadata: req.body.metadata && typeof req.body.metadata === 'object' 
                    ? req.body.metadata 
                    : {},
                // Add any missing required fields with default values
                postedDate: null,
                createdAt: new Date(),
                updatedAt: new Date()
            } satisfies NewCardTransaction;

            // Insert the transaction
            const [transaction] = await db.insert(cardTransactions)
                .values(transactionData)
                .returning();

            // Update card's last used timestamp
            await db.update(corporateCards)
                .set({ 
                    lastUsed: new Date(),
                    updatedAt: new Date() 
                })
                .where(eq(corporateCards.id, cardId));

            return res.status(201).json({ 
                success: true,
                data: transaction 
            });
        } catch (error) {
            console.error("Error creating transaction:", error);
            return res.status(500).json({ 
                success: false,
                error: "Failed to create transaction" 
            });
        }
    });

    // Add funds to card
    app.post("/api/corporate-cards/cards/:cardId/add-funds", authenticate, async (req, res) => {
        try {
            const organizationId = req.user?.organizationId;
            const cardId = req.params.cardId;
            const { amount } = req.body;
            
            if (!organizationId) {
                return res.status(400).json({ error: "Organization ID is missing" });
            }
            
            // Convert amount to number safely
            const amountValue = Number(amount) || 0;
            if (isNaN(amountValue)) {
                return res.status(400).json({ error: "Invalid amount provided" });
            }
            
            // First get the current card to ensure it exists and get current values
            const [currentCard] = await db
                .select()
                .from(corporateCards)
                .where(
                    and(
                        // Use direct SQL for UUID comparison to avoid type issues
                        eq(sql`${corporateCards.organizationId}::text`, sql`${String(organizationId)}::text`),
                        eq(sql`${corporateCards.id}::text`, sql`${String(cardId)}::text`)
                    )
                )
                .limit(1);
                
            if (!currentCard) {
                return res.status(404).json({ error: "Card not found or not accessible" });
            }
            
            // Calculate new spending limit by adding the amount to the current spending limit
            // If current spending limit is null, treat it as 0 for the addition
            const currentSpendingLimit = currentCard.spendingLimit ? Number(currentCard.spendingLimit) : 0;
            const newSpendingLimit = currentSpendingLimit + amountValue;
            
            // Update the card with the new spending limit
            // Using Drizzle's update builder for better type safety
            await db.update(corporateCards)
                .set({ 
                    spendingLimit: String(newSpendingLimit),
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(corporateCards.id, cardId),
                        eq(corporateCards.organizationId, organizationId)
                    )
                );
            
            return res.json({ 
                success: true,
                message: "Spending limit updated successfully",
                data: {
                    newSpendingLimit: String(newSpendingLimit),
                    currency: currentCard.currency || 'USD'
                }
            });
        } catch (error) {
            console.error("Error adding funds to card:", error);
            return res.status(500).json({ 
                success: false,
                error: "Failed to add funds to card" 
            });
        }
    });
    // Delete card
    app.delete("/api/corporate-cards/cards/:cardId", authenticate, async (req, res) => {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }
        try {
            const { cardId } = req.params;
            // Verify card exists and belongs to organization
            const [card] = await db
                .select()
                .from(corporateCards)
                .where(and(
                    eq(corporateCards.id, String(cardId)),
                    eq(corporateCards.organizationId, String(organizationId))
                ));

            if (!card) {
                return res.status(404).json({ error: "Card not found" });
            }

            // Delete the card
            await db
                .delete(corporateCards)
                .where(eq(corporateCards.id, String(cardId)));

            return res.status(204).send();
        } catch (error) {
            console.error("Error deleting card:", error);
            return res.status(500).json({ error: "Failed to delete card" });
        }
    });

    // Get all transactions for organization
    app.get("/api/corporate-cards/transactions", authenticate, async (req, res) => {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }
        try {
            const transactions = await db
                .select()
                .from(cardTransactions)
                .leftJoin(
                    corporateCards, 
                    eq(cardTransactions.corporateCardId as any, corporateCards.id as any)
                )
                .where(eq(corporateCards.organizationId as any, String(organizationId) as any))
                .orderBy(desc(cardTransactions.transactionDate));
            return res.json({ transactions });
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return res.status(500).json({ error: "Failed to fetch transactions" });
        }
    });
    // Get a single transaction
    app.get("/api/corporate-cards/transactions/:transactionId", authenticate, async (req, res) => {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }
        try {
            const { transactionId } = req.params;
            const [transaction] = await db
                .select()
                .from(cardTransactions)
                .leftJoin(
                    corporateCards, 
                    eq(cardTransactions.corporateCardId as any, corporateCards.id as any)
                )
                .where(and(
                    eq(cardTransactions.id as any, transactionId as any),
                    eq(corporateCards.organizationId as any, String(organizationId) as any)
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
    app.get("/api/corporate-cards/users", authenticate, async (req, res) => {
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
                .where(eq(users.organizationId, organizationId));
            return res.json({ users: orgUsers });
        } catch (error) {
            console.error("Error fetching users:", error);
            return res.status(500).json({ error: "Failed to fetch users" });
        }
    });
    // Get card transactions
    app.get("/api/corporate-cards/cards/:cardId/transactions", authenticate, async (req, res) => {
        try {
            const { cardId } = req.params;
            const organizationId = req.user?.organizationId;

            if (!organizationId) {
                return res.status(400).json({ error: "Organization ID is missing" });
            }

        // Ensure cardId is a valid UUID string
        const cardIdStr = String(cardId);
        const orgIdStr = String(organizationId);

        const [card] = await db
            .select()
            .from(corporateCards)
            .where(
                and(
                    eq(corporateCards.id as any, cardIdStr as any),
                    eq(corporateCards.organizationId as any, orgIdStr as any)
                )
            )
            .limit(1);

        if (!card) {
            return res.status(404).json({ error: "Card not found" });
        }

        // Get transactions for the card with proper type assertion
        const transactions = await db
            .select()
            .from(cardTransactions)
            .where(
                eq(
                    cardTransactions.corporateCardId as any,
                    String(cardId) as any
                )
            )
            .orderBy(desc(cardTransactions.transactionDate as any));

        return res.json({ 
            success: true,
            data: { 
                card, 
                transactions 
            } 
        });
    } catch (error) {
        console.error("Error fetching card:", error);
        return res.status(500).json({ 
            success: false,
            error: "Failed to retrieve card details"
        });
    }
});

// Endpoint for card analytics
app.get("/api/corporate-cards/analytics/summary", authenticate, async (req: Request, res: Response) => {
    const organizationId = req.organization?.id;
    
    if (!organizationId) {
        return res.status(400).json({ 
            success: false,
            error: "Organization ID is missing" 
        });
    }

    try {
        // Get cards with their transactions for the organization
        const cardsWithSpending = await db
            .select({
                id: corporateCards.id,
                status: corporateCards.status,
                spendingLimit: corporateCards.spendingLimit,
                monthlyLimit: corporateCards.monthlyLimit,
                transactionAmount: sql<number>`COALESCE(SUM(CAST(${cardTransactions.amount} AS DECIMAL)), 0)`
            })
            .from(corporateCards)
            .leftJoin(
                cardTransactions,
                eq(corporateCards.id, cardTransactions.corporateCardId)
            )
            .where(eq(corporateCards.organizationId, organizationId))
            .groupBy(corporateCards.id, corporateCards.status, corporateCards.spendingLimit, corporateCards.monthlyLimit);

        let activeCount = 0;
        let suspendedCount = 0;
        let totalSpending = 0;
        let totalMonthlyLimit = 0;

        for (const card of cardsWithSpending) {
            const spending = Number(card.transactionAmount) || 0;
            const monthlyLimit = Number(card.monthlyLimit) || 0;
            const { status } = card;

            if (status === 'active') activeCount++;
            if (status === 'suspended') suspendedCount++;
            
            totalSpending += spending;
            totalMonthlyLimit += monthlyLimit;
        }

        const remainingBudget = Math.max(0, totalMonthlyLimit - totalSpending);
        const utilizationRate = totalMonthlyLimit > 0 
            ? (totalSpending / totalMonthlyLimit) * 100 
            : 0;

        return res.json({ 
            success: true,
            data: {
                totalCards: cardsWithSpending.length,
                activeCards: activeCount,
                suspendedCards: suspendedCount,
                totalSpending,
                totalMonthlyLimit,
                remainingBudget,
                utilizationRate: parseFloat(utilizationRate.toFixed(2))
            } 
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({ 
            success: false,
            error: "Failed to fetch analytics" 
        });
    }
});
// ...
// Get expenses (placeholder for corporate card expenses)
app.get("/api/expenses", authenticate, async (_req: Request, res: Response) => {
    try {
        // Return empty array for now - this would integrate with expense tracking
        return res.json([]);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

// Export the router for use in the main application
return corporateCardsRoutes;

// Approve expense
app.post("/api/expenses/approve", authenticate, async (req: Request, res: Response) => {
    try {
        const { expenseId, status, notes } = req.body;
        const userId = req.user?.id;
        const organizationId = req.user?.organizationId;
        
        if (!expenseId || !status) {
            return res.status(400).json({ 
                success: false, 
                error: "Expense ID and status are required" 
            });
        }
        
        if (!userId || !organizationId) {
            return res.status(400).json({ 
                success: false, 
                error: "User or organization information is missing" 
            });
        }
        
        // Verify the expense exists and belongs to the organization
        const [expense] = await db
            .select()
            .from(cardTransactions)
            .innerJoin(
                corporateCards, 
                eq(cardTransactions.corporateCardId, corporateCards.id)
            )
            .where(
                and(
                    eq(cardTransactions.id as any, String(expenseId) as any),
                    eq(corporateCards.organizationId as any, String(organizationId) as any)
                )
            )
            .limit(1);
            
        if (!expense) {
            return res.status(404).json({ 
                success: false, 
                error: "Expense not found or not accessible" 
            });
        }
        
        // Update the expense status - using the correct field names from the schema
        const [updatedExpense] = await db
            .update(cardTransactions)
            .set({
                status: status as any,
                // Add any review-related fields that exist in your schema
                // For example, if you track who reviewed the transaction:
                ...(userId && { userId: userId }), // Only include if the schema has this field
                updatedAt: new Date(),
                // Store review notes in the notes field if reviewNotes doesn't exist
                notes: notes || undefined
            })
            .where(eq(cardTransactions.id, String(expenseId)))
            .returning();
            
        return res.json({ 
            success: true, 
            message: "Expense status updated successfully",
            data: updatedExpense 
        });
            
    } catch (error) {
        console.error("Error approving expense:", error);
        return res.status(500).json({ 
            success: false,
            error: "Failed to update expense status" 
        });
    }
});

// Get organization users for dropdown
app.get("/api/organizations/users", authenticate, async (req, res) => {
    try {
        const organizationId = req.user?.organizationId;
        
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is missing" });
        }

        const organizationUsers = await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                role: users.role,
                isActive: users.isActive
            })
            .from(users)
            .where(
                and(
                    eq(users.organizationId as any, String(organizationId) as any),
                    eq(users.isActive, true)
                )
            )
            .orderBy(users.lastName, users.firstName);
            
        return res.json({
            success: true,
            data: organizationUsers,
            count: organizationUsers.length
        });
    } catch (error) {
        console.error("Error fetching organization users:", error);
        return res.status(500).json({ 
            success: false,
            error: "Failed to fetch organization users" 
        });
    }
});}
