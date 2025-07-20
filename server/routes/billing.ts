import { Router, Request, Response } from 'express';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { 
  stripe, 
  SUBSCRIPTION_PLANS, 
  createStripeCustomer, 
  createSubscription, 
  updateSubscription 
} from '../stripe';
import { db } from '../db';
import { organizations } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply authentication and organization context to all billing routes
router.use(validateJWT);
router.use(injectOrganizationContext);

// Get billing information for the current user's organization
router.get("/", async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({ error: 'Organization required' });
    }

    // Get organization details
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, req.user.organizationId)
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // If no Stripe customer ID, return free plan info
    if (!org.stripe_customer_id) {
      return res.json({
        status: 'inactive',
        plan: 'free'
      });
    }

    // Get subscription details from Stripe
    try {
      if (org.stripe_subscription_id) {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        
        // Determine plan based on price ID
        let plan = 'free';
        if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_TEAM) {
          plan = 'team';
        } else if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ID_ENTERPRISE) {
          plan = 'enterprise';
        }

        return res.json({
          customerId: org.stripe_customer_id,
          subscriptionId: org.stripe_subscription_id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          plan
        });
      } else {
        return res.json({
          customerId: org.stripe_customer_id,
          status: 'inactive',
          plan: 'free'
        });
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return res.json({
        customerId: org.stripe_customer_id,
        status: 'error',
        plan: 'free'
      });
    }
  } catch (error) {
    console.error("Error fetching billing info:", error);
    res.status(500).json({ error: "Failed to fetch billing information" });
  }
});

// Create or update subscription
router.post("/subscription", async (req: Request, res: Response) => {
  try {
    const { organizationId, plan, customerEmail, customerName } = req.body;
    
    if (!organizationId || !plan || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['team', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Get price ID for the selected plan
    const priceId = SUBSCRIPTION_PLANS[plan].stripePriceId;
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or price not configured' });
    }
    
    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId)
    });
    
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    let customerId = org.stripe_customer_id;
    
    // Create customer if it doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(customerEmail, customerName || customerEmail);
      customerId = customer.id;
      
      // Update organization with customer ID
      await db.update(organizations)
        .set({ stripeCustomerId: customerId })
        .where(eq(organizations.id, organizationId));
    }
    
    // Create or update subscription
    let subscriptionResult;
    
    if (org.stripe_subscription_id) {
      // Update existing subscription
      subscriptionResult = await updateSubscription(org.stripe_subscription_id, priceId);
      
      return res.json({
        success: true,
        subscriptionId: subscriptionResult.id,
        status: subscriptionResult.status
      });
    } else {
      // Create new subscription
      subscriptionResult = await createSubscription(customerId, priceId);
      
      // Update organization with subscription ID
      await db.update(organizations)
        .set({ stripeSubscriptionId: subscriptionResult.id })
        .where(eq(organizations.id, organizationId));
      
      // Return client secret for checkout
      const invoice = subscriptionResult.latest_invoice as any;
      const clientSecret = invoice?.payment_intent?.client_secret;
      
      return res.json({
        success: true,
        subscriptionId: subscriptionResult.id,
        status: subscriptionResult.status,
        clientSecret
      });
    }
  } catch (error) {
    console.error("Error creating/updating subscription:", error);
    res.status(500).json({ error: "Failed to process subscription" });
  }
});

// Create Stripe billing portal session
router.post("/portal", async (req: Request, res: Response) => {
  try {
    const { customerId, returnUrl } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }
    
    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/team`,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

export default router;
