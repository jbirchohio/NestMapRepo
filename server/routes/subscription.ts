import { Router } from 'express';
import { db } from '../db';
import { users, subscriptions, usageTracking, trips } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { jwtAuthMiddleware as jwtAuth } from '../middleware/jwtAuth';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-10-28.acacia'
});

// Simple subscription model for acquisition
export const SUBSCRIPTION_CONFIG = {
  FREE: {
    trips: 3,
    aiSuggestionsPerMonth: 5,
    removeAds: false,
    prioritySupport: false
  },
  PRO: {
    price: 8.00, // Monthly
    yearlyPrice: 60.00, // 25% discount for annual
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    trips: -1, // unlimited
    aiSuggestionsPerMonth: -1, // unlimited
    removeAds: true,
    prioritySupport: true
  }
};

// Get current user's subscription status
router.get('/status', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // Get user's subscription
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1);

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usage] = await db.select({
      aiSuggestions: sql<number>`COALESCE(SUM(CASE WHEN feature = 'ai_suggestion' THEN count ELSE 0 END), 0)`,
      trips: sql<number>`COALESCE(SUM(CASE WHEN feature = 'trip_created' THEN count ELSE 0 END), 0)`,
    })
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.user_id, userId),
        gte(usageTracking.created_at, startOfMonth)
      )
    );

    const isPro = subscription?.status === 'active' && subscription?.tier === 'pro';
    const config = isPro ? SUBSCRIPTION_CONFIG.PRO : SUBSCRIPTION_CONFIG.FREE;

    res.json({
      isPro,
      tier: isPro ? 'pro' : 'free',
      status: subscription?.status || 'inactive',
      currentPeriodEnd: subscription?.current_period_end,
      usage: {
        aiSuggestions: Number(usage?.aiSuggestions || 0),
        trips: Number(usage?.trips || 0),
      },
      limits: {
        aiSuggestionsPerMonth: config.aiSuggestionsPerMonth,
        trips: config.trips
      },
      features: {
        removeAds: config.removeAds,
        prioritySupport: config.prioritySupport
      }
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create checkout session for Pro subscription
router.post('/create-checkout', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { interval = 'monthly' } = req.body; // monthly or yearly

    const priceId = interval === 'yearly' 
      ? SUBSCRIPTION_CONFIG.PRO.priceIdYearly 
      : SUBSCRIPTION_CONFIG.PRO.priceIdMonthly;
    
    if (!priceId) {
      // Return demo checkout URL if Stripe not configured
      return res.json({ 
        checkoutUrl: `${process.env.CLIENT_URL}/settings?subscription=demo&interval=${interval}` 
      });
    }

    // Get user email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/settings?subscription=success`,
      cancel_url: `${process.env.CLIENT_URL}/settings?subscription=cancelled`,
      allow_promotion_codes: true, // Allow discount codes
      metadata: {
        userId: userId.toString(),
        tier: 'pro'
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Cancel subscription
router.post('/cancel', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1);

    if (!subscription?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update database
    await db.update(subscriptions)
      .set({ 
        status: 'cancelling',
        updated_at: new Date()
      })
      .where(eq(subscriptions.user_id, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Track feature usage
router.post('/track-usage', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { feature, count = 1 } = req.body;

    await db.insert(usageTracking).values({
      user_id: userId,
      feature,
      count,
      created_at: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Check if user can use feature
router.get('/can-use/:feature', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { feature } = req.params;

    // Get subscription
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1);

    const isPro = subscription?.status === 'active' && subscription?.tier === 'pro';
    const config = isPro ? SUBSCRIPTION_CONFIG.PRO : SUBSCRIPTION_CONFIG.FREE;

    // Check AI suggestion limits
    if (feature === 'ai_suggestion') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [usage] = await db.select({
        count: sql<number>`COALESCE(SUM(count), 0)`
      })
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.user_id, userId),
          eq(usageTracking.feature, 'ai_suggestion'),
          gte(usageTracking.created_at, startOfMonth)
        )
      );

      const used = Number(usage?.count || 0);
      const limit = config.aiSuggestionsPerMonth;
      
      if (limit > 0 && used >= limit) {
        return res.json({ 
          canUse: false, 
          reason: 'limit_reached',
          used,
          limit,
          isPro,
          upgradeMessage: 'Upgrade to Pro for unlimited AI suggestions'
        });
      }
    }

    // Check trip limit
    if (feature === 'create_trip') {
      const [tripCount] = await db.select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(trips)
      .where(eq(trips.user_id, userId));

      const count = Number(tripCount?.count || 0);
      const limit = config.trips;
      
      if (limit > 0 && count >= limit) {
        return res.json({ 
          canUse: false, 
          reason: 'limit_reached',
          used: count,
          limit,
          isPro,
          upgradeMessage: 'Upgrade to Pro for unlimited trips'
        });
      }
    }

    // Check pro-only features
    const proFeatures = ['remove_ads', 'priority_support'];
    if (proFeatures.includes(feature)) {
      return res.json({ 
        canUse: isPro,
        reason: isPro ? 'allowed' : 'pro_only',
        isPro,
        upgradeMessage: 'This feature is available for Pro users'
      });
    }

    res.json({ canUse: true, isPro });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

// Analytics endpoint for MRR tracking
router.get('/metrics', jwtAuth, async (req, res) => {
  try {
    // Only allow admin users to see metrics
    const userId = (req as any).user.id;
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get subscription metrics
    const [metrics] = await db.select({
      totalSubscribers: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)::int`,
      monthlySubscribers: sql<number>`COUNT(CASE WHEN status = 'active' AND tier = 'pro' THEN 1 END)::int`,
      cancelledCount: sql<number>`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int`,
      mrr: sql<number>`COUNT(CASE WHEN status = 'active' AND tier = 'pro' THEN 1 END) * 8`
    })
    .from(subscriptions);

    res.json({
      totalSubscribers: metrics?.totalSubscribers || 0,
      monthlySubscribers: metrics?.monthlySubscribers || 0,
      cancelledCount: metrics?.cancelledCount || 0,
      mrr: metrics?.mrr || 0,
      arr: (metrics?.mrr || 0) * 12
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;