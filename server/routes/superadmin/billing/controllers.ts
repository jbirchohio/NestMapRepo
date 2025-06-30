import type { Request, Response, NextFunction } from '../../express-augmentations.js';
import { db } from '../../../db.js';
import { organizations } from '../../../db/schema.js';
import { auditLogs } from '../../../db/schema/auditLogs.js';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-05-28.basil',
});
import { logSuperadminAction } from '../audit-logs/audit-service.js';
import type { AuthenticatedRequest } from '../../../middleware/superadmin.js';
// Get billing overview across all organizations
export const getBillingOverview = async (req: Request, res: Response) => {
    try {
        const [stats] = await db
            .select({
            totalRevenue: sql<number> `SUM(CASE WHEN "subscriptionStatus" = 'active' THEN 
          CASE 
            WHEN plan = 'enterprise' THEN 999 
            WHEN plan = 'pro' THEN 99 
            ELSE 0 
          END 
        ELSE 0 END) as total_revenue`,
            activeSubscriptions: sql<number> `COUNT(CASE WHEN "subscriptionStatus" = 'active' THEN 1 END) as active_subscriptions`,
            trialSubscriptions: sql<number> `COUNT(CASE WHEN "subscriptionStatus" = 'trialing' THEN 1 END) as trial_subscriptions`,
            mrr: sql<number> `SUM(CASE WHEN "subscriptionStatus" = 'active' THEN 
          CASE 
            WHEN plan = 'enterprise' THEN 999 
            WHEN plan = 'pro' THEN 99 
            ELSE 0 
          END 
        ELSE 0 END) as mrr`,
        })
            .from(organizations);
        // Get recent transactions from Stripe
        const payments = await stripe.charges.list({
            limit: 10,
        });
        res.json({
            stats,
            recentPayments: payments.data.map(p => ({
                id: p.id,
                amount: p.amount / 100, // Convert from cents
                currency: p.currency,
                created: p.created,
                customer: p.customer,
                status: p.status,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching billing overview:', error);
        res.status(500).json({ error: 'Failed to fetch billing overview' });
    }
};
// Get billing details for a specific organization
export const getOrganizationBilling = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        // Get organization with subscription details
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        // Get subscription details from Stripe
        let subscription: Stripe.Subscription | null = null;
        if (org.stripeSubscriptionId) {
            try {
                subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId) as Stripe.Subscription;
            }
            catch (error) {
                console.error('Error fetching subscription:', error);
                // Continue without subscription details if there's an error
            }
        }
        // Get payment methods
        let paymentMethods: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */[] = [];
        if (org.stripeCustomerId) {
            const methods = await stripe.paymentMethods.list({
                customer: org.stripeCustomerId,
                type: 'card',
            });
            paymentMethods = methods.data;
        }
        // Get invoices
        let invoices: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */[] = [];
        if (org.stripeCustomerId) {
            const invoiceList = await stripe.invoices.list({
                customer: org.stripeCustomerId,
                limit: 12,
            });
            invoices = invoiceList.data;
        }
        res.json({
            organization: {
                id: org.id,
                name: org.name,
                plan: org.plan,
                subscriptionStatus: org.subscriptionStatus,
                currentPeriodEnd: org.currentPeriodEnd,
                billingEmail: org.billingEmail,
                createdAt: org.createdAt,
            },
            subscription,
            paymentMethods,
            invoices: invoices.map(invoice => ({
                id: invoice.id,
                number: invoice.number,
                amountDue: invoice.amountDue / 100,
                amountPaid: invoice.amountPaid / 100,
                status: invoice.status,
                created: invoice.created,
                dueDate: invoice.dueDate,
                pdf: invoice.invoicePdf,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching organization billing:', error);
        res.status(500).json({ error: 'Failed to fetch organization billing' });
    }
};
// Update subscription plan
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { plan, prorate = true } = req.body;
        const userId = req.user?.id;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripeCustomerId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        // Get customer's subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: org.stripeCustomerId,
            limit: 1,
        });
        const subscription = subscriptions.data[0];
        if (!subscription) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        if (!org.stripeSubscriptionId || !org.stripeSubscriptionItemId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        const priceId = getPriceIdForPlan(plan);
        if (!priceId) {
            return res.status(400).json({ error: 'Invalid plan specified' });
        }
        // Update subscription in Stripe
        const updatedSubscription = await stripe.subscriptions.update(org.stripeSubscriptionId, {
            items: [
                {
                    id: org.stripeSubscriptionItemId,
                    price: priceId,
                },
            ],
            proration_behavior: prorate ? 'create_prorations' : 'none',
        });
        // Update organization with subscription details
        await db.update(organizations)
            .set({
            plan: plan as any,
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionItemId: subscription.items.data[0].id,
            stripeSubscriptionStatus: subscription.status,
            updatedAt: new Date(),
        })
            .where(eq(organizations.id, organizationId));
        // Log the action
        if (userId) {
            await logSuperadminAction(userId, 'UPDATE_SUBSCRIPTION_PLAN', 'subscription', subscription.id, {
                organizationId,
                oldPlan: org.plan,
                newPlan: plan,
                prorated: prorate,
            });
        }
        res.json({
            success: true,
            subscription: updatedSubscription,
        });
    }
    catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Failed to update subscription plan' });
    }
};
// Apply coupon to subscription
export const applyCoupon = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { couponCode } = req.body;
        const userId = req.user?.id;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripeCustomerId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        // Get customer's subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: org.stripeCustomerId,
            limit: 1,
        });
        const subscription = subscriptions.data[0];
        if (!subscription) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        if (!org.stripeSubscriptionId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        // Apply coupon in Stripe
        const updatedSubscription = await stripe.subscriptions.update(org.stripeSubscriptionId, {
            coupon: couponCode as string,
        });
        // Get the discount details from the subscription
        const discount = updatedSubscription.discounts && updatedSubscription.discounts[0] ? {
            id: updatedSubscription.discounts[0].id,
            coupon: updatedSubscription.discounts[0].coupon ? {
                id: updatedSubscription.discounts[0].coupon.id,
                name: 'name' in updatedSubscription.discounts[0].coupon ? String(updatedSubscription.discounts[0].coupon.name) : undefined,
                percent_off: 'percent_off' in updatedSubscription.discounts[0].coupon ? Number(updatedSubscription.discounts[0].coupon.percent_off) : null,
                amount_off: 'amount_off' in updatedSubscription.discounts[0].coupon ? Number(updatedSubscription.discounts[0].coupon.amount_off) : null,
                duration: 'duration' in updatedSubscription.discounts[0].coupon ? String(updatedSubscription.discounts[0].coupon.duration) : null,
            } : null,
            start: updatedSubscription.discounts[0].start,
            end: updatedSubscription.discounts[0].end || null,
        } : null as any; // Using type assertion as the exact type isn't perfectly matching
        // Log the action
        if (userId) {
            await logSuperadminAction(userId, 'APPLY_COUPON', 'subscription', subscription.id, {
                organizationId,
                couponCode,
                discount,
            });
        }
        res.json({
            success: true,
            subscription: updatedSubscription,
        });
    }
    catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to apply coupon'
        });
    }
};
// Get payment methods
export const getPaymentMethods = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripeCustomerId) {
            return res.json({ data: [] });
        }
        // Get payment methods
        const paymentMethods = await stripe.paymentMethods.list({
            customer: org.stripeCustomerId,
            type: 'card',
        });
        res.json({
            data: paymentMethods.data.map(method => ({
                id: method.id,
                brand: method.card?.brand,
                last4: method.card?.last4,
                exp_month: method.card?.exp_month,
                exp_year: method.card?.exp_year,
                is_default: method.id === org.defaultPaymentMethodId,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
};
// Add payment method
export const addPaymentMethod = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { paymentMethodId } = req.body;
        const userId = req.user?.id;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        let customerId = org.stripeCustomerId;
        // Create customer if not exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: org.billingEmail,
                name: org.name,
                metadata: {
                    organization_id: org.id,
                },
            });
            customerId = customer.id;
            // Update organization with Stripe customer ID
            await db.update(organizations)
                .set({
                stripeCustomerId: customer.id,
                updatedAt: new Date(),
            })
                .where(eq(organizations.id, organizationId));
        }
        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
        // Set as default payment method if no default exists
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        if (paymentMethods.data.length === 1) {
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            // Update organization with payment method ID
            await db.update(organizations)
                .set({
                defaultPaymentMethodId: paymentMethodId,
                updatedAt: new Date(),
            })
                .where(eq(organizations.id, organizationId));
        }
        // Log the action
        if (userId) {
            await logSuperadminAction(userId, 'ADD_PAYMENT_METHOD', 'payment_method', paymentMethodId, {
                organizationId,
                customerId,
                isDefault: paymentMethods.data.length === 0,
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to add payment method'
        });
    }
};
// Set default payment method
export const setDefaultPaymentMethod = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { paymentMethodId } = req.body;
        const userId = req.user?.id;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripeCustomerId) {
            return res.status(400).json({ error: 'No customer account found' });
        }
        // Set as default payment method
        await stripe.customers.update(org.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        // Update organization with payment method ID
        await db.update(organizations)
            .set({
            defaultPaymentMethodId: paymentMethodId,
            updatedAt: new Date(),
        })
            .where(eq(organizations.id, organizationId));
        // Log the action
        if (userId) {
            await logSuperadminAction(userId, 'SET_DEFAULT_PAYMENT_METHOD', 'payment_method', paymentMethodId, {
                organizationId,
                customerId: org.stripeCustomerId,
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error setting default payment method:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to set default payment method'
        });
    }
};
// Get invoices
export const getInvoices = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { limit = '10', starting_after } = req.query;
        // Get organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripeCustomerId) {
            return res.json({ data: [], has_more: false });
        }
        // Get invoices from Stripe
        const invoices = org.stripeCustomerId
            ? await stripe.invoices.list({
                customer: org.stripeCustomerId,
                limit: 5,
            })
            : { data: [], has_more: false };
        res.json({
            data: invoices.data.map(invoice => ({
                id: invoice.id,
                number: invoice.number,
                amount_due: invoice.amount_due / 100,
                amount_paid: invoice.amount_paid / 100,
                status: invoice.status,
                created: invoice.created,
                due_date: invoice.due_date,
                pdf: invoice.invoice_pdf,
            })),
            has_more: invoices.has_more,
        });
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};
// Helper function to get Stripe price ID for a plan
function getPriceIdForPlan(plan: string): string {
    const prices: Record<string, string> = {
        'free': process.env.STRIPE_FREE_PLAN_PRICE_ID || '',
        'pro': process.env.STRIPE_PRO_PLAN_PRICE_ID || 'price_pro_plan',
        'enterprise': process.env.STRIPE_ENTERPRISE_PLAN_PRICE_ID || 'price_enterprise_plan',
    };
    return prices[plan] || '';
}
