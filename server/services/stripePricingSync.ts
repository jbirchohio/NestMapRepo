import { stripe } from '../stripe';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface PricingPlan {
  id: number;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  stripe_product_id?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

export class StripePricingSync {
  /**
   * Sync a pricing plan to Stripe, creating or updating products and prices
   */
  static async syncPlanToStripe(plan: PricingPlan): Promise<{
    productId: string;
    monthlyPriceId: string;
    yearlyPriceId?: string;
  }> {
    try {
      // Step 1: Create or update Stripe product
      let productId = plan.stripe_product_id;
      
      if (!productId) {
        // Create new product
        const product = await stripe.products.create({
          name: plan.display_name,
          description: plan.description || undefined,
          metadata: {
            plan_id: plan.id.toString(),
            plan_name: plan.name
          },
          default_price_data: {
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: { interval: 'month' }
          }
        });
        
        productId = product.id;
        
        // Log the sync
        await this.logSync(plan.id, 'create_product', productId, 
          { name: plan.display_name, description: plan.description },
          { id: product.id, name: product.name },
          true
        );
      } else {
        // Update existing product
        await stripe.products.update(productId, {
          name: plan.display_name,
          description: plan.description || undefined,
          metadata: {
            plan_id: plan.id.toString(),
            plan_name: plan.name
          }
        });
        
        await this.logSync(plan.id, 'update_product', productId,
          { name: plan.display_name, description: plan.description },
          { id: productId },
          true
        );
      }

      // Step 2: Create or update monthly price
      let monthlyPriceId = plan.stripe_price_id_monthly;
      
      if (!monthlyPriceId) {
        // Create new monthly price
        const monthlyPrice = await stripe.prices.create({
          product: productId,
          unit_amount: Math.round(plan.price_monthly * 100),
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: {
            plan_id: plan.id.toString(),
            billing_period: 'monthly'
          }
        });
        
        monthlyPriceId = monthlyPrice.id;
        
        await this.logSync(plan.id, 'create_price', monthlyPriceId,
          { amount: plan.price_monthly, interval: 'month' },
          { id: monthlyPrice.id, unit_amount: monthlyPrice.unit_amount },
          true
        );
      } else {
        // Prices are immutable in Stripe, so we need to create a new one if price changed
        const currentPrice = await stripe.prices.retrieve(monthlyPriceId);
        
        if (currentPrice.unit_amount !== Math.round(plan.price_monthly * 100)) {
          // Archive old price
          await stripe.prices.update(monthlyPriceId, { active: false });
          
          // Create new price
          const newMonthlyPrice = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(plan.price_monthly * 100),
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: {
              plan_id: plan.id.toString(),
              billing_period: 'monthly'
            }
          });
          
          monthlyPriceId = newMonthlyPrice.id;
          
          await this.logSync(plan.id, 'create_price', monthlyPriceId,
            { amount: plan.price_monthly, interval: 'month', reason: 'price_change' },
            { id: newMonthlyPrice.id, unit_amount: newMonthlyPrice.unit_amount },
            true
          );
        }
      }

      // Step 3: Create or update yearly price if applicable
      let yearlyPriceId: string | undefined;
      
      if (plan.price_yearly && plan.price_yearly > 0) {
        yearlyPriceId = plan.stripe_price_id_yearly;
        
        if (!yearlyPriceId) {
          // Create new yearly price
          const yearlyPrice = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(plan.price_yearly * 100),
            currency: 'usd',
            recurring: { interval: 'year' },
            metadata: {
              plan_id: plan.id.toString(),
              billing_period: 'yearly'
            }
          });
          
          yearlyPriceId = yearlyPrice.id;
          
          await this.logSync(plan.id, 'create_price', yearlyPriceId,
            { amount: plan.price_yearly, interval: 'year' },
            { id: yearlyPrice.id, unit_amount: yearlyPrice.unit_amount },
            true
          );
        } else {
          // Check if price changed
          const currentPrice = await stripe.prices.retrieve(yearlyPriceId);
          
          if (currentPrice.unit_amount !== Math.round(plan.price_yearly * 100)) {
            // Archive old price
            await stripe.prices.update(yearlyPriceId, { active: false });
            
            // Create new price
            const newYearlyPrice = await stripe.prices.create({
              product: productId,
              unit_amount: Math.round(plan.price_yearly * 100),
              currency: 'usd',
              recurring: { interval: 'year' },
              metadata: {
                plan_id: plan.id.toString(),
                billing_period: 'yearly'
              }
            });
            
            yearlyPriceId = newYearlyPrice.id;
            
            await this.logSync(plan.id, 'create_price', yearlyPriceId,
              { amount: plan.price_yearly, interval: 'year', reason: 'price_change' },
              { id: newYearlyPrice.id, unit_amount: newYearlyPrice.unit_amount },
              true
            );
          }
        }
      }

      // Step 4: Update the pricing plan in database with Stripe IDs
      await db.execute(sql`
        UPDATE pricing_plans
        SET 
          stripe_product_id = ${productId},
          stripe_price_id_monthly = ${monthlyPriceId},
          stripe_price_id_yearly = ${yearlyPriceId || null},
          updated_at = NOW()
        WHERE id = ${plan.id}
      `);

      logger.info(`Successfully synced pricing plan ${plan.name} to Stripe`, {
        planId: plan.id,
        productId,
        monthlyPriceId,
        yearlyPriceId
      });

      return { productId, monthlyPriceId, yearlyPriceId };
    } catch (error) {
      logger.error('Error syncing pricing plan to Stripe:', error);
      
      await this.logSync(plan.id, 'sync_error', null,
        { plan },
        null,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  /**
   * Update all active subscriptions when a price changes
   */
  static async updateActiveSubscriptions(oldPriceId: string, newPriceId: string): Promise<void> {
    try {
      // List all subscriptions using the old price
      const subscriptions = await stripe.subscriptions.list({
        price: oldPriceId,
        status: 'active',
        limit: 100
      });

      logger.info(`Found ${subscriptions.data.length} active subscriptions to update`);

      // Update each subscription to use the new price
      for (const subscription of subscriptions.data) {
        try {
          // Find the subscription item with the old price
          const itemToUpdate = subscription.items.data.find(item => item.price.id === oldPriceId);
          
          if (itemToUpdate) {
            await stripe.subscriptions.update(subscription.id, {
              items: [{
                id: itemToUpdate.id,
                price: newPriceId
              }],
              proration_behavior: 'always_invoice' // This will credit the customer for unused time
            });
            
            logger.info(`Updated subscription ${subscription.id} to new price`);
          }
        } catch (subError) {
          logger.error(`Error updating subscription ${subscription.id}:`, subError);
        }
      }
    } catch (error) {
      logger.error('Error updating active subscriptions:', error);
      throw error;
    }
  }

  /**
   * Sync all active pricing plans to Stripe
   */
  static async syncAllPlans(): Promise<void> {
    try {
      const plans = await db.execute(sql`
        SELECT * FROM pricing_plans 
        WHERE is_active = true 
        ORDER BY sort_order
      `);

      for (const plan of plans.rows) {
        await this.syncPlanToStripe(plan as unknown as PricingPlan);
      }

      logger.info('Successfully synced all pricing plans to Stripe');
    } catch (error) {
      logger.error('Error syncing all plans to Stripe:', error);
      throw error;
    }
  }

  /**
   * Log sync operations for audit trail
   */
  private static async logSync(
    planId: number,
    action: string,
    stripeObjectId: string | null,
    requestData: any,
    responseData: any,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO stripe_pricing_sync_log (
          pricing_plan_id,
          action,
          stripe_object_id,
          request_data,
          response_data,
          error_message,
          success
        ) VALUES (
          ${planId},
          ${action},
          ${stripeObjectId},
          ${JSON.stringify(requestData)},
          ${JSON.stringify(responseData)},
          ${errorMessage || null},
          ${success}
        )
      `);
    } catch (error) {
      logger.error('Error logging sync operation:', error);
    }
  }
}