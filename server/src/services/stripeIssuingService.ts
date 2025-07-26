import Stripe from 'stripe';
import { storage } from '../storage';

// Stripe will be initialized when API keys are provided
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  });
}

export interface CardIssuanceRequest {
  user_id: number;
  organization_id: number;
  spend_limit: number; // in cents
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  cardholder_name: string;
  purpose?: string;
  department?: string;
  allowed_categories?: string[];
  blocked_categories?: string[];
}

export interface CardControlsUpdate {
  card_id: number;
  spend_limit?: number;
  status?: 'active' | 'inactive' | 'canceled';
  allowed_categories?: string[];
  blocked_categories?: string[];
}

export class StripeIssuingService {
  /**
   * Issue a new virtual corporate card
   */
  async issueCard(request: CardIssuanceRequest) {
    if (!stripe) {
      throw new Error('Stripe not configured. Please provide STRIPE_SECRET_KEY environment variable.');
    }
    
    try {
      // Create cardholder in Stripe
      const cardholder = await stripe.issuing.cardholders.create({
        name: request.cardholder_name,
        email: await this.getUserEmail(request.user_id),
        phone_number: await this.getUserPhone(request.user_id),
        status: 'active',
        type: 'individual',
        billing: {
          address: {
            line1: '123 Corporate Blvd',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94105',
            country: 'US',
          },
        },
      });

      // Create the card with spending controls
      const card = await stripe.issuing.cards.create({
        cardholder: cardholder.id,
        currency: 'usd',
        type: 'virtual',
        status: 'active',
        spending_controls: {
          spending_limits: [
            {
              amount: request.spend_limit * 100, // Convert dollars to cents for Stripe
              interval: request.interval,
            },
          ],
          allowed_categories: request.allowed_categories || [
            'airlines',
            'lodging',
            'car_rental',
            'gas_stations',
            'restaurants',
            'taxi_services',
          ],
          blocked_categories: request.blocked_categories || [],
        },
        metadata: {
          user_id: request.user_id.toString(),
          organization_id: request.organization_id.toString(),
          purpose: request.purpose || 'business_expenses',
          department: request.department || 'general',
        },
      });

      // Store card information in database
      const cardRecord = await storage.createCorporateCard({
        organization_id: request.organization_id,
        user_id: request.user_id,
        stripe_card_id: card.id,
        stripe_cardholder_id: cardholder.id,
        card_number_masked: `****-****-****-${card.last4}`,
        card_token: card.id, // Store Stripe ID as token
        card_provider: 'stripe',
        card_type: 'virtual',
        card_status: 'active',
        spending_limit: request.spend_limit,
        remaining_limit: request.spend_limit,
        cardholder_name: request.cardholder_name,
        expiry_month: card.exp_month.toString(),
        expiry_year: card.exp_year.toString(),
        purpose: request.purpose,
        department: request.department,
        category_limits: {},
        allowed_merchants: request.allowed_categories,
        blocked_merchants: request.blocked_categories,
      });

      return {
        success: true,
        card: cardRecord,
        stripe_card: {
          id: card.id,
          last4: card.last4,
          exp_month: card.exp_month,
          exp_year: card.exp_year,
          brand: card.brand,
        },
      };
    } catch (error) {
      console.error('Error issuing card:', error);
      throw new Error(`Failed to issue card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update card spending controls
   */
  async updateCardControls(request: CardControlsUpdate) {
    try {
      const cardRecord = await storage.getCorporateCard(request.card_id);
      if (!cardRecord) {
        throw new Error('Card not found');
      }

      const updateData: any = {};
      
      if (request.spend_limit) {
        updateData.spending_controls = {
          spending_limits: [
            {
              amount: request.spend_limit,
              interval: 'monthly',
            },
          ],
        };
      }

      if (request.status) {
        updateData.status = request.status;
      }

      if (request.allowed_categories || request.blocked_categories) {
        updateData.spending_controls = {
          ...updateData.spending_controls,
          allowed_categories: request.allowed_categories,
          blocked_categories: request.blocked_categories,
        };
      }

      // Update card in Stripe
      const updatedCard = await stripe.issuing.cards.update(
        cardRecord.stripe_card_id,
        updateData
      );

      // Update card in database
      await storage.updateCorporateCard(request.card_id, {
        spending_limit: request.spend_limit,
        card_status: request.status,
        allowed_merchants: request.allowed_categories,
        blocked_merchants: request.blocked_categories,
      });

      return {
        success: true,
        card: updatedCard,
      };
    } catch (error) {
      console.error('Error updating card controls:', error);
      throw new Error(`Failed to update card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Freeze/unfreeze a card
   */
  async freezeCard(card_id: number, freeze: boolean) {
    try {
      const cardRecord = await storage.getCorporateCard(card_id);
      if (!cardRecord) {
        throw new Error('Card not found');
      }

      const status = freeze ? 'inactive' : 'active';
      
      await stripe.issuing.cards.update(cardRecord.stripe_card_id, {
        status: status,
      });

      await storage.updateCorporateCard(card_id, {
        card_status: status,
      });

      return {
        success: true,
        status: status,
      };
    } catch (error) {
      console.error('Error freezing/unfreezing card:', error);
      throw new Error(`Failed to ${freeze ? 'freeze' : 'unfreeze'} card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a card permanently
   */
  async deleteCard(card_id: number, organization_id: number) {
    try {
      const cardRecord = await storage.getCorporateCard(card_id);
      if (!cardRecord) {
        throw new Error('Card not found');
      }

      // Verify the card belongs to the organization
      if (cardRecord.organization_id !== organization_id) {
        throw new Error('Access denied: Card does not belong to your organization');
      }

      // Cancel the card in Stripe first
      await stripe.issuing.cards.update(cardRecord.stripe_card_id, {
        status: 'canceled',
      });

      // Delete the card record from database
      await storage.deleteCorporateCard(card_id);

      return {
        success: true,
        message: 'Card deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting card:', error);
      throw new Error(`Failed to delete card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Stripe Issuing webhook events
   */
  async processWebhookEvent(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'issuing_authorization.request':
          await this.handleAuthorizationRequest(event.data.object as Stripe.Issuing.Authorization);
          break;
        
        case 'issuing_authorization.updated':
          await this.handleAuthorizationUpdate(event.data.object as Stripe.Issuing.Authorization);
          break;
        
        case 'issuing_transaction.created':
          await this.handleTransactionCreated(event.data.object as Stripe.Issuing.Transaction);
          break;
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }

  private async handleAuthorizationRequest(authorization: Stripe.Issuing.Authorization) {
    console.log('Authorization request:', {
      id: authorization.id,
      amount: authorization.amount,
      currency: authorization.currency,
      merchant: authorization.merchant_data?.name,
      status: authorization.status,
    });

    // Log the authorization request
    const cardRecord = await storage.getCorporateCardByStripeId(authorization.card.id);
    if (cardRecord) {
      await storage.createCardTransaction({
        card_id: cardRecord.id,
        organization_id: cardRecord.organization_id,
        user_id: cardRecord.user_id,
        transaction_id: authorization.id,
        authorization_code: authorization.authorization_code || '',
        amount: authorization.amount,
        currency: authorization.currency,
        transaction_type: 'authorization',
        transaction_status: authorization.status,
        merchant_name: authorization.merchant_data?.name || '',
        merchant_category: authorization.merchant_data?.category || '',
        merchant_mcc: authorization.merchant_data?.category_code || '',
        merchant_city: authorization.merchant_data?.city || '',
        merchant_state: authorization.merchant_data?.state || '',
        merchant_country: authorization.merchant_data?.country || '',
        processed_at: new Date(authorization.created * 1000),
        risk_score: this.calculateRiskScore(authorization),
        policy_checks: {},
        fraud_indicators: {},
      });
    }
  }

  private async handleAuthorizationUpdate(authorization: Stripe.Issuing.Authorization) {
    console.log('Authorization updated:', {
      id: authorization.id,
      status: authorization.status,
    });

    // Update transaction status if it exists
    await storage.updateCardTransactionByStripeId(authorization.id, {
      transaction_status: authorization.status,
    });
  }

  private async handleTransactionCreated(transaction: Stripe.Issuing.Transaction) {
    console.log('Transaction created:', {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      merchant: transaction.merchant_data?.name,
    });

    const cardRecord = await storage.getCorporateCardByStripeId(transaction.card.id);
    if (!cardRecord) {
      console.error('Card not found for transaction:', transaction.card.id);
      return;
    }

    // Create or update transaction record
    await storage.upsertCardTransaction({
      card_id: cardRecord.id,
      organization_id: cardRecord.organization_id,
      user_id: cardRecord.user_id,
      transaction_id: transaction.id,
      authorization_code: transaction.authorization?.id || '',
      amount: transaction.amount,
      currency: transaction.currency,
      transaction_type: transaction.type,
      transaction_status: 'completed',
      merchant_name: transaction.merchant_data?.name || '',
      merchant_category: transaction.merchant_data?.category || '',
      merchant_mcc: transaction.merchant_data?.category_code || '',
      merchant_city: transaction.merchant_data?.city || '',
      merchant_state: transaction.merchant_data?.state || '',
      merchant_country: transaction.merchant_data?.country || '',
      processed_at: new Date(transaction.created * 1000),
      settled_at: new Date(),
    });

    // Auto-create expense record
    await this.createExpenseFromTransaction(transaction, cardRecord);

    // Update card spending limits
    await this.updateCardSpendingLimits(cardRecord.id, transaction.amount);
  }

  private async createExpenseFromTransaction(
    transaction: Stripe.Issuing.Transaction,
    cardRecord: any
  ) {
    // Determine expense category based on merchant category
    const expenseCategory = this.categorizeExpense(
      transaction.merchant_data?.category || '',
      transaction.merchant_data?.name || ''
    );

    await storage.createExpense({
      organization_id: cardRecord.organization_id,
      user_id: cardRecord.user_id,
      card_id: cardRecord.id,
      transaction_id: transaction.id,
      merchant_name: transaction.merchant_data?.name || '',
      merchant_category: transaction.merchant_data?.category || '',
      merchant_mcc: transaction.merchant_data?.category_code || '',
      amount: transaction.amount,
      currency: transaction.currency,
      transaction_date: new Date(transaction.created * 1000),
      expense_category: expenseCategory,
      description: `${transaction.merchant_data?.name || 'Card Transaction'} - ${expenseCategory}`,
      status: 'pending',
      approval_status: transaction.amount > 10000 ? 'pending' : 'auto_approved', // Auto-approve under $100
      tax_deductible: true,
      billable_to_client: false,
    });
  }

  private categorizeExpense(merchantCategory: string, merchantName: string): string {
    const category = merchantCategory.toLowerCase();
    const name = merchantName.toLowerCase();

    if (category.includes('airline') || name.includes('airline') || name.includes('airways')) {
      return 'travel';
    }
    if (category.includes('lodging') || category.includes('hotel') || name.includes('hotel')) {
      return 'travel';
    }
    if (category.includes('car_rental') || name.includes('rental')) {
      return 'travel';
    }
    if (category.includes('restaurant') || category.includes('food')) {
      return 'meals';
    }
    if (category.includes('gas') || category.includes('fuel')) {
      return 'transportation';
    }
    if (category.includes('taxi') || category.includes('uber') || category.includes('lyft')) {
      return 'transportation';
    }
    if (category.includes('office') || name.includes('office')) {
      return 'office_supplies';
    }

    return 'general';
  }

  private async updateCardSpendingLimits(cardId: number, transactionAmount: number) {
    const cardRecord = await storage.getCorporateCard(cardId);
    if (cardRecord && cardRecord.remaining_limit) {
      const newRemainingLimit = cardRecord.remaining_limit - transactionAmount;
      await storage.updateCorporateCard(cardId, {
        remaining_limit: Math.max(0, newRemainingLimit),
      });
    }
  }

  /**
   * Get user email from database
   */
  private async getUserEmail(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    return user?.email || `user_${userId}@company.com`;
  }

  /**
   * Get user phone from database
   */
  private async getUserPhone(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    return user?.phone || '+15555551234';
  }

  /**
   * Calculate risk score for authorization
   */
  private calculateRiskScore(authorization: any): number {
    let score = 0;
    
    // Basic risk factors
    if (authorization.amount > 100000) score += 30; // High amount
    if (authorization.merchant_data?.category === 'gambling') score += 50;
    if (authorization.merchant_data?.country !== 'US') score += 20;
    
    return Math.min(score, 100);
  }
}

export const stripeIssuingService = new StripeIssuingService();

