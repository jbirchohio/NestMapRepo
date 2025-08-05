import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Make Stripe optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export interface FundingSourceConfig {
  organizationId: number;
  type: 'bank_account' | 'credit_line' | 'stripe_balance';
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    accountType: 'checking' | 'savings';
  };
  creditLine?: {
    requestedAmount: number;
    currency: string;
  };
}

export class OrganizationFundingService {
  /**
   * Create a Stripe Connect account for an organization
   */
  async createConnectedAccount(organizationId: number, businessInfo: {
    businessName: string;
    businessType: string;
    email: string;
    country: string;
    currency: string;
  }) {
    try {
      // Create Express account for the organization
      const account = await stripe.accounts.create({
        type: 'express',
        country: businessInfo.country,
        email: businessInfo.email,
        capabilities: {
          card_issuing: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        company: {
          name: businessInfo.businessName,
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual',
            },
          },
        },
      });

      // Update organization with Stripe account ID
      await db
        .update(organizations)
        .set({ 
          stripe_connect_account_id: account.id,
          stripe_issuing_enabled: false, // Will be enabled after onboarding
          updated_at: new Date()
        })
        .where(eq(organizations.id, organizationId));

      return account;
    } catch (error: any) {
      throw new Error(`Failed to create connected account: ${error.message}`);
    }
  }

  /**
   * Generate onboarding link for organization to complete Stripe setup
   */
  async createOnboardingLink(organizationId: number, returnUrl: string, refreshUrl: string) {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]?.stripe_connect_account_id) {
      throw new Error('No Stripe account found for organization');
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: org[0].stripe_connect_account_id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error: any) {
      throw new Error(`Failed to create onboarding link: ${error.message}`);
    }
  }

  /**
   * Check if organization's Stripe account is ready for issuing
   */
  async checkAccountStatus(organizationId: number) {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]?.stripe_connect_account_id) {
      return { ready: false, reason: 'No Stripe account' };
    }

    try {
      const account = await stripe.accounts.retrieve(org[0].stripe_connect_account_id);
      
      const issuingCapability = account.capabilities?.card_issuing;
      const isReady = issuingCapability === 'active';

      if (isReady && !org[0].stripe_issuing_enabled) {
        // Enable issuing in our database
        await db
          .update(organizations)
          .set({ 
            stripe_issuing_enabled: true,
            updated_at: new Date()
          })
          .where(eq(organizations.id, organizationId));
      }

      return {
        ready: isReady,
        status: issuingCapability,
        requirements: account.requirements,
        account: account
      };
    } catch (error: any) {
      return { ready: false, reason: error.message };
    }
  }

  /**
   * Set up funding source for organization
   */
  async setupFundingSource(config: FundingSourceConfig) {
    const org = await db.select().from(organizations).where(eq(organizations.id, config.organizationId)).limit(1);
    if (!org[0]?.stripe_connect_account_id) {
      throw new Error('Organization must have a Stripe account first');
    }

    try {
      let fundingSourceId: string;

      switch (config.type) {
        case 'bank_account':
          if (!config.bankAccount) {
            throw new Error('Bank account details required');
          }
          
          // Create external account (bank account)
          const bankAccount = await stripe.accounts.createExternalAccount(
            org[0].stripe_connect_account_id,
            {
              external_account: {
                object: 'bank_account',
                country: 'US', // This should be dynamic based on org location
                currency: 'usd',
                account_holder_name: config.bankAccount.accountHolderName,
                account_holder_type: 'company',
                routing_number: config.bankAccount.routingNumber,
                account_number: config.bankAccount.accountNumber,
              },
            }
          );
          fundingSourceId = bankAccount.id;
          break;

        case 'credit_line':
          // Credit line implementation - requires manual Stripe Capital API setup
          if (!config.creditLine) {
            throw new Error('Credit line configuration required');
          }
          
          // Note: Stripe Capital is invite-only. For production, this would need:
          // 1. Stripe Capital API access (requires application)
          // 2. Custom implementation based on Stripe's Capital API documentation
          
          // For now, create a reference to track the credit line request
          const creditLineId = `cl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // In production, this would:
          // 1. Check organization eligibility via Stripe Capital API
          // 2. Apply for credit line with requested amount
          // 3. Track approval status and terms
          
          fundingSourceId = creditLineId;
          break;

        case 'stripe_balance':
          // Use Stripe balance as funding source
          fundingSourceId = 'stripe_balance';
          break;

        default:
          throw new Error('Invalid funding source type');
      }

      // Update organization with funding source info
      await db
        .update(organizations)
        .set({
          funding_source_id: fundingSourceId,
          funding_source_type: config.type,
          funding_source_status: 'active',
          updated_at: new Date()
        })
        .where(eq(organizations.id, config.organizationId));

      return { success: true, fundingSourceId };
    } catch (error: any) {
      throw new Error(`Failed to setup funding source: ${error.message}`);
    }
  }

  /**
   * Get funding source status for organization
   */
  async getFundingSourceStatus(organizationId: number) {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]) {
      throw new Error('Organization not found');
    }

    return {
      hasStripeAccount: !!org[0].stripe_connect_account_id,
      stripeConnectOnboarded: org[0].stripe_connect_onboarded || false,
      issuingEnabled: org[0].stripe_issuing_enabled || false,
      paymentsEnabled: org[0].stripe_payments_enabled || false,
      transfersEnabled: org[0].stripe_transfers_enabled || false,
      fundingSourceType: org[0].funding_source_type,
      fundingSourceStatus: org[0].funding_source_status || 'pending',
      ready: org[0].stripe_connect_onboarded && org[0].stripe_issuing_enabled && org[0].funding_source_status === 'active',
      // Enhanced verification tracking
      requirementsCurrentlyDue: org[0].stripe_requirements_currently_due as string[] || [],
      requirementsEventuallyDue: org[0].stripe_requirements_eventually_due as string[] || [],
      requirementsPastDue: org[0].stripe_requirements_past_due as string[] || [],
      requirementsDisabledReason: org[0].stripe_requirements_disabled_reason,
      requirementsCurrentDeadline: org[0].stripe_requirements_current_deadline?.toISOString() || null,
      chargesEnabled: org[0].stripe_payments_enabled || false,
      payoutsEnabled: org[0].stripe_transfers_enabled || false,
      errors: [] // Will be populated from webhook data if available
    };
  }

  /**
   * Create card with organization's funding source
   */
  async createCardWithFunding(organizationId: number, cardData: {
    cardholderName: string;
    spendingLimit: number;
    currency?: string;
  }) {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]?.stripe_connect_account_id || !org[0].stripe_issuing_enabled) {
      throw new Error('Organization not ready for card issuing');
    }

    try {
      // Create cardholder first
      const cardholder = await stripe.issuing.cardholders.create({
        name: cardData.cardholderName,
        email: `cards@${org[0].name.toLowerCase().replace(/\s/g, '')}.com`, // Generate email
        type: 'individual' as any, // Using 'individual' type for card holders
        billing: {
          address: {
            line1: '123 Corporate Blvd',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94105',
            country: 'US'
          }
        }
      }, {
        stripeAccount: org[0].stripe_connect_account_id,
      });

      // Create the card
      const card = await stripe.issuing.cards.create({
        cardholder: cardholder.id,
        currency: cardData.currency || 'usd',
        type: 'virtual',
        spending_controls: {
          spending_limits: [
            {
              amount: Math.round(cardData.spendingLimit * 100), // Convert to cents
              interval: 'monthly',
            },
          ],
        },
      }, {
        stripeAccount: org[0].stripe_connect_account_id,
      });

      return { card, cardholder };
    } catch (error: any) {
      throw new Error(`Failed to create card: ${error.message}`);
    }
  }

  /**
   * Add funds to organization's account for card spending
   */
  async addFundsToOrganization(organizationId: number, amount: number) {
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]?.stripe_connect_account_id || org[0].funding_source_status !== 'active') {
      throw new Error('Organization funding not properly configured');
    }

    try {
      // This would typically involve transferring funds from the funding source
      // Implementation depends on funding source type
      switch (org[0].funding_source_type) {
        case 'bank_account':
          // Create transfer from bank account to Stripe balance
          // This is a simplified implementation
          break;
        case 'credit_line':
          // Draw from credit line
          break;
        case 'stripe_balance':
          // Use existing Stripe balance
          break;
      }

      return { success: true, amount };
    } catch (error: any) {
      throw new Error(`Failed to add funds: ${error.message}`);
    }
  }
}

export const organizationFundingService = new OrganizationFundingService();