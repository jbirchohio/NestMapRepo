import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { db } from '../db-connection';
import { templates, templatePurchases } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

// Profile update schema
const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  specialties: z.array(z.string()).max(10).optional(),
  social_twitter: z.string().max(50).optional(),
  social_instagram: z.string().max(50).optional(),
  social_youtube: z.string().max(100).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  payout_method: z.enum(['paypal', 'amazon', 'bank', 'credits']).optional(),
  payout_email: z.string().email().optional(),
});

// GET /api/creators/dashboard - Get creator dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get or create creator profile
    const profile = await storage.getOrCreateCreatorProfile(userId);

    // Get balance
    const balance = await storage.getOrCreateCreatorBalance(userId);

    // Get templates
    const templates = await storage.getTemplatesByUserId(userId);

    // Calculate total metrics
    const totalViews = templates.reduce((sum, t) => sum + (t.view_count || 0), 0);
    const totalSales = templates.reduce((sum, t) => sum + (t.sales_count || 0), 0);
    const totalRevenue = parseFloat(balance.lifetime_earnings || '0');

    // Get recent sales (last 10)
    const recentSales = [];
    for (const template of templates) {
      const purchases = await storage.getTemplatePurchases(template.id);
      for (const purchase of purchases.slice(0, 10)) {
        recentSales.push({
          ...purchase,
          templateTitle: template.title,
          templateId: template.id,
        });
      }
    }
    recentSales.sort((a, b) => {
      const dateA = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
      const dateB = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 10);

    // Monthly revenue (last 12 months)
    const monthlyRevenue = calculateMonthlyRevenue(recentSales);

    res.json({
      profile,
      balance,
      metrics: {
        totalTemplates: templates.length,
        publishedTemplates: templates.filter(t => t.status === 'published').length,
        totalViews,
        totalSales,
        totalRevenue,
        averagePrice: templates.length > 0
          ? (templates.reduce((sum, t) => sum + parseFloat(t.price || '0'), 0) / templates.length).toFixed(2)
          : 0,
        conversionRate: totalViews > 0
          ? ((totalSales / totalViews) * 100).toFixed(2)
          : 0,
      },
      templates: templates.slice(0, 5), // Recent 5 templates
      recentSales,
      monthlyRevenue,
    });
  } catch (error) {
    logger.error('Error fetching creator dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// GET /api/creators/balance - Get creator balance details
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const balance = await storage.getOrCreateCreatorBalance(userId);

    // Check payout eligibility
    const availableBalance = parseFloat(balance.available_balance || '0');
    const payoutThresholds = {
      paypal: 10,
      amazon: 25,
      bank: 100,
      credits: 5,
    };

    const eligibility = {
      paypal: availableBalance >= payoutThresholds.paypal,
      amazon: availableBalance >= payoutThresholds.amazon,
      bank: availableBalance >= payoutThresholds.bank,
      credits: availableBalance >= payoutThresholds.credits,
    };

    res.json({
      ...balance,
      payoutThresholds,
      eligibility,
      preferredMethod: balance.payout_method || 'paypal',
      taxInfoRequired: availableBalance >= 600 && !balance.w9_on_file,
    });
  } catch (error) {
    logger.error('Error fetching creator balance:', error);
    res.status(500).json({ message: 'Failed to fetch balance' });
  }
});

// GET /api/creators/sales - Get detailed sales history
router.get('/sales', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, templateId } = req.query;

    // Get user's templates
    const templates = await storage.getTemplatesByUserId(userId);
    const templateIds = templates.map(t => t.id);

    // Filter by specific template if requested
    const targetIds = templateId
      ? [parseInt(String(templateId))]
      : templateIds;

    // Get all sales for user's templates
    const allSales = [];
    for (const id of targetIds) {
      const template = templates.find(t => t.id === id);
      if (!template) continue;

      const purchases = await storage.getTemplatePurchases(id);
      for (const purchase of purchases) {
        allSales.push({
          ...purchase,
          templateTitle: template.title,
          templateId: template.id,
          templateSlug: template.slug,
        });
      }
    }

    // Apply date filters
    let filteredSales = allSales;
    if (startDate) {
      const start = new Date(String(startDate));
      filteredSales = filteredSales.filter(s =>
        s.purchased_at ? new Date(s.purchased_at) >= start : false
      );
    }
    if (endDate) {
      const end = new Date(String(endDate));
      filteredSales = filteredSales.filter(s =>
        s.purchased_at ? new Date(s.purchased_at) <= end : false
      );
    }

    // Sort by date descending
    filteredSales.sort((a, b) => {
      const dateA = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
      const dateB = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
      return dateB - dateA;
    });

    // Calculate summary
    const summary = {
      totalSales: filteredSales.length,
      totalRevenue: filteredSales.reduce((sum, s) =>
        sum + parseFloat(s.seller_earnings || '0'), 0
      ),
      totalPlatformFees: filteredSales.reduce((sum, s) =>
        sum + parseFloat(s.platform_fee || '0'), 0
      ),
      averageSalePrice: filteredSales.length > 0
        ? (filteredSales.reduce((sum, s) =>
            sum + parseFloat(s.price || '0'), 0
          ) / filteredSales.length).toFixed(2)
        : 0,
    };

    res.json({
      sales: filteredSales,
      summary,
    });
  } catch (error) {
    logger.error('Error fetching sales history:', error);
    res.status(500).json({ message: 'Failed to fetch sales history' });
  }
});

// PUT /api/creators/profile - Update creator profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = updateProfileSchema.parse(req.body);

    // Ensure profile exists
    await storage.getOrCreateCreatorProfile(userId);

    // Update profile
    const updated = await storage.updateCreatorProfile(userId, validatedData);

    // Update payout info in balance if provided
    if (validatedData.payout_method || validatedData.payout_email) {
      await storage.getOrCreateCreatorBalance(userId);
      const balanceUpdate: any = {};
      if (validatedData.payout_method) {
        balanceUpdate.payout_method = validatedData.payout_method;
      }
      if (validatedData.payout_email) {
        balanceUpdate.payout_email = validatedData.payout_email;
      }
      await storage.updateCreatorBalance(userId, 0, 'add'); // Just to trigger update
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid profile data',
        errors: error.errors
      });
    }
    logger.error('Error updating creator profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST /api/creators/request-payout - Request payout
router.post('/request-payout', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { method, amount } = req.body;

    // Validate payout method
    if (!['paypal', 'amazon', 'bank', 'credits'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payout method' });
    }

    // Get balance
    const balance = await storage.getOrCreateCreatorBalance(userId);
    const availableBalance = parseFloat(balance.available_balance || '0');

    // Validate amount
    const requestedAmount = parseFloat(amount);
    if (requestedAmount <= 0 || requestedAmount > availableBalance) {
      return res.status(400).json({
        message: 'Invalid payout amount',
        availableBalance,
      });
    }

    // Check minimum thresholds
    const minThresholds: Record<string, number> = {
      paypal: 10,
      amazon: 25,
      bank: 100,
      credits: 5,
    };

    if (requestedAmount < minThresholds[method]) {
      return res.status(400).json({
        message: `Minimum payout for ${method} is $${minThresholds[method]}`
      });
    }

    // Check tax info for large payouts
    if (requestedAmount >= 600 && !balance.w9_on_file) {
      return res.status(400).json({
        message: 'Tax information required for payouts over $600'
      });
    }

    // TODO: Create payout record and process
    // For now, just return success message
    res.json({
      message: 'Payout request submitted successfully',
      amount: requestedAmount,
      method,
      estimatedArrival: getEstimatedPayoutDate(method),
    });
  } catch (error) {
    logger.error('Error requesting payout:', error);
    res.status(500).json({ message: 'Failed to request payout' });
  }
});

// GET /api/creators/payouts/history - Get payout history
router.get('/payouts/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all template purchases for this creator's templates
    const creatorTemplates = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.user_id, userId));
    
    const templateIds = creatorTemplates.map(t => t.id);
    
    if (templateIds.length === 0) {
      return res.json({
        payouts: [],
        summary: {
          totalPaidOut: 0,
          lastPayoutDate: null,
          pendingPayouts: 0,
        },
      });
    }

    // Get payout history from template purchases
    const payoutHistory = await db
      .select({
        id: templatePurchases.id,
        templateId: templatePurchases.template_id,
        amount: templatePurchases.seller_earnings,
        status: templatePurchases.payout_status,
        initiatedAt: templatePurchases.payout_initiated_at,
        completedAt: templatePurchases.payout_completed_at,
        method: templatePurchases.payout_method,
        transactionId: templatePurchases.payout_transaction_id,
        purchasedAt: templatePurchases.purchased_at
      })
      .from(templatePurchases)
      .where(sql`${templatePurchases.template_id} = ANY(${templateIds})`)
      .orderBy(desc(templatePurchases.purchased_at));

    // Calculate summary
    const totalPaidOut = payoutHistory
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    
    const pendingPayouts = payoutHistory
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    
    const lastPayout = payoutHistory
      .filter(p => p.status === 'completed' && p.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];

    res.json({
      payouts: payoutHistory,
      summary: {
        totalPaidOut,
        lastPayoutDate: lastPayout?.completedAt || null,
        pendingPayouts,
      },
    });
  } catch (error) {
    logger.error('Error fetching payout history:', error);
    res.status(500).json({ message: 'Failed to fetch payout history' });
  }
});

// GET /api/creators/:userId/public - Get public creator profile
router.get('/:userId/public', async (req, res) => {
  try {
    const creatorId = parseInt(req.params.userId);

    // Get creator profile
    const profile = await storage.getCreatorProfile(creatorId);
    if (!profile) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Get user info
    const user = await storage.getUserById(creatorId);
    if (!user) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Get published templates
    const templates = await storage.getTemplatesByUserId(creatorId);
    const publishedTemplates = templates.filter(t => t.status === 'published');

    // Calculate stats
    const totalSales = publishedTemplates.reduce((sum, t) => sum + (t.sales_count || 0), 0);
    const averageRating = 0; // TODO: Calculate from template reviews

    res.json({
      id: creatorId,
      username: user.username,
      displayName: user.display_name || user.username,
      avatarUrl: user.avatar_url,
      bio: profile.bio,
      specialties: profile.specialties,
      socialTwitter: profile.social_links?.twitter || null,
      socialInstagram: profile.social_links?.instagram || null,
      socialYoutube: profile.social_links?.youtube || null,
      websiteUrl: profile.website || null,
      verified: profile.verified,
      featured: profile.featured,
      stats: {
        totalTemplates: publishedTemplates.length,
        totalSales,
        averageRating,
        followerCount: profile.follower_count,
      },
      templates: publishedTemplates.slice(0, 6), // Top 6 templates
    });
  } catch (error) {
    logger.error('Error fetching public creator profile:', error);
    res.status(500).json({ message: 'Failed to fetch creator profile' });
  }
});

// Helper functions
function calculateMonthlyRevenue(sales: any[]): any[] {
  const months: Record<string, number> = {};
  const now = new Date();

  // Initialize last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months[key] = 0;
  }

  // Sum revenue by month
  for (const sale of sales) {
    const date = new Date(sale.purchased_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key] !== undefined) {
      months[key] += parseFloat(sale.seller_earnings || '0');
    }
  }

  // Convert to array
  return Object.entries(months)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getEstimatedPayoutDate(method: string): string {
  const now = new Date();
  const estimates: Record<string, number> = {
    paypal: 2, // 2 business days
    amazon: 1, // 1 business day
    bank: 5, // 5 business days
    credits: 0, // Instant
  };

  const days = estimates[method] || 3;
  now.setDate(now.getDate() + days);

  // Skip weekends
  while (now.getDay() === 0 || now.getDay() === 6) {
    now.setDate(now.getDate() + 1);
  }

  return now.toISOString().split('T')[0];
}

export default router;