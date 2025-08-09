import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { db } from '../db-connection';
import { templates, templatePurchases } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import { geocodeCacheService } from '../services/geocodeCacheService';
import { aiCache } from '../services/aiCacheService';
// Admin check inline
const requireAdmin = (req: any, res: any, next: any) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const allAdminEmails = [...adminEmails, superAdminEmail].filter(Boolean);
  
  if (!req.user || !allAdminEmails.includes(req.user.email)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
// Super admin check inline
const requireSuperAdmin = (req: any, res: any, next: any) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!req.user || req.user.email !== superAdminEmail) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};
import { templateQualityService } from '../services/templateQualityService';
import { db } from '../db-connection';
import { templates, users, templatePurchases, destinations } from '@shared/schema';
import { eq, desc, sql, gte, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/templates/pending - Get templates pending review
router.get('/templates/pending', async (req, res) => {
  try {
    const pendingTemplates = await db.select({
      id: templates.id,
      title: templates.title,
      description: templates.description,
      price: templates.price,
      quality_score: templates.quality_score,
      created_at: templates.created_at,
      user: {
        id: users.id,
        username: users.username,
        email: users.email,
        creator_status: users.creator_status,
      }
    })
    .from(templates)
    .leftJoin(users, eq(templates.user_id, users.id))
    .where(eq(templates.moderation_status, 'pending'))
    .orderBy(desc(templates.quality_score));

    res.json(pendingTemplates);
  } catch (error) {
    logger.error('Error fetching pending templates:', error);
    res.status(500).json({ message: 'Failed to fetch pending templates' });
  }
});

// POST /api/admin/templates/:id/approve - Approve a template
router.post('/templates/:id/approve', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { notes } = req.body;
    
    await templateQualityService.approveTemplate(templateId, notes);
    
    logger.info(`Admin approved template ${templateId}`);
    res.json({ message: 'Template approved successfully' });
  } catch (error) {
    logger.error('Error approving template:', error);
    res.status(500).json({ message: 'Failed to approve template' });
  }
});

// POST /api/admin/templates/:id/reject - Reject a template
router.post('/templates/:id/reject', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    await templateQualityService.rejectTemplate(templateId, reason, notes);
    
    logger.info(`Admin rejected template ${templateId}: ${reason}`);
    res.json({ message: 'Template rejected' });
  } catch (error) {
    logger.error('Error rejecting template:', error);
    res.status(500).json({ message: 'Failed to reject template' });
  }
});

// GET /api/admin/stats - Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    // Get various stats
    const [templateStats] = await db.select({
      total: sql<number>`count(*)`,
      published: sql<number>`count(*) filter (where status = 'published')`,
      pending: sql<number>`count(*) filter (where moderation_status = 'pending')`,
      avgQuality: sql<number>`avg(quality_score)`,
    }).from(templates);

    const [userStats] = await db.select({
      total: sql<number>`count(*)`,
      creators: sql<number>`count(*) filter (where creator_status != 'none')`,
      verified: sql<number>`count(*) filter (where creator_status = 'verified')`,
    }).from(users);

    const [salesStats] = await db.select({
      totalSales: sql<number>`count(*)`,
      totalRevenue: sql<number>`sum(price)`,
      totalPlatformFees: sql<number>`sum(platform_fee)`,
    }).from(templatePurchases);

    res.json({
      templates: templateStats,
      users: userStats,
      sales: salesStats,
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/users - Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, creator_status: creatorStatus } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build query
    let query = db.select()
      .from(users);
    
    // Apply filters
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role as string));
    }
    if (creatorStatus) {
      conditions.push(eq(users.creator_status, creatorStatus as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const allUsers = await query
      .orderBy(desc(users.created_at))
      .limit(Number(limit))
      .offset(offset);
    
    // Get template counts and revenue for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        // Get template count
        const [templateCount] = await db.select({
          count: sql<number>`count(*)`
        })
        .from(templates)
        .where(eq(templates.user_id, user.id));
        
        // Get total revenue
        const [revenue] = await db.select({
          total: sql<number>`COALESCE(SUM(seller_earnings), 0)`
        })
        .from(templatePurchases)
        .innerJoin(templates, eq(templates.id, templatePurchases.template_id))
        .where(eq(templates.user_id, user.id));
        
        return {
          ...user,
          template_count: Number(templateCount?.count || 0),
          total_revenue: Number(revenue?.total || 0)
        };
      })
    );
    
    // Get total count
    const [{ count }] = await db.select({
      count: sql<number>`count(*)`
    }).from(users);
    
    res.json({
      users: usersWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// POST /api/admin/users/:id/verify - Verify a creator
router.post('/users/:id/verify', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    await db.update(users)
      .set({
        creator_status: 'verified',
        creator_tier: 'verified',
        creator_verified_at: new Date()
      })
      .where(eq(users.id, userId));
    
    logger.info(`Admin verified creator ${userId}`);
    res.json({ message: 'Creator verified successfully' });
  } catch (error) {
    logger.error('Error verifying creator:', error);
    res.status(500).json({ message: 'Failed to verify creator' });
  }
});

// POST /api/admin/users/:id/suspend - Suspend a creator
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;
    
    await db.update(users)
      .set({
        creator_status: 'suspended',
      })
      .where(eq(users.id, userId));
    
    // Also unpublish all their templates
    await db.update(templates)
      .set({ status: 'draft' })
      .where(eq(templates.user_id, userId));
    
    logger.info(`Admin suspended creator ${userId}: ${reason}`);
    res.json({ message: 'Creator suspended' });
  } catch (error) {
    logger.error('Error suspending creator:', error);
    res.status(500).json({ message: 'Failed to suspend creator' });
  }
});

// POST /api/admin/users/:id/make-admin - Make a user an admin
router.post('/users/:id/make-admin', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId));
    
    logger.info(`Super admin granted admin privileges to user ${userId}`);
    res.json({ message: 'User granted admin privileges' });
  } catch (error) {
    logger.error('Error making user admin:', error);
    res.status(500).json({ message: 'Failed to grant admin privileges' });
  }
});

// POST /api/admin/users/:id/remove-admin - Remove admin privileges
router.post('/users/:id/remove-admin', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Don't allow removing your own admin status
    if (userId === req.user!.id) {
      return res.status(400).json({ message: 'Cannot remove your own admin privileges' });
    }
    
    await db.update(users)
      .set({ role: 'user' })
      .where(eq(users.id, userId));
    
    logger.info(`Super admin removed admin privileges from user ${userId}`);
    res.json({ message: 'Admin privileges removed' });
  } catch (error) {
    logger.error('Error removing admin privileges:', error);
    res.status(500).json({ message: 'Failed to remove admin privileges' });
  }
});

// GET /api/admin/check - Check if current user is admin
router.get('/check', async (req, res) => {
  // If we got here, user is admin (middleware checked)
  res.json({ 
    isAdmin: true,
    isSuperAdmin: (req as any).isSuperAdmin || false,
    user: {
      id: req.user!.id,
      email: req.user!.email
    }
  });
});

// ===== FINANCIAL ROUTES - SUPER ADMIN ONLY =====

// GET /api/admin/financials/overview - Get financial overview
router.get('/financials/overview', requireSuperAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get revenue data
    const [revenue] = await db.select({
      totalRevenue: sql<number>`sum(price)`,
      totalPlatformFees: sql<number>`sum(platform_fee)`,
      totalCreatorPayouts: sql<number>`sum(seller_earnings)`,
      totalSales: sql<number>`count(*)`,
      last30DaysRevenue: sql<number>`sum(price) filter (where purchased_at >= ${thirtyDaysAgo})`,
      last30DaysSales: sql<number>`count(*) filter (where purchased_at >= ${thirtyDaysAgo})`
    }).from(templatePurchases);

    // Get pending payouts
    const [pendingPayouts] = await db.select({
      totalPending: sql<number>`sum(seller_earnings) filter (where payout_status = 'pending')`,
      countPending: sql<number>`count(*) filter (where payout_status = 'pending')`
    }).from(templatePurchases);

    // Get top earning templates
    const topTemplates = await db.select({
      template_id: templatePurchases.template_id,
      title: templates.title,
      totalRevenue: sql<number>`sum(${templatePurchases.price})`,
      totalSales: sql<number>`count(*)`,
      creatorUsername: users.username
    })
    .from(templatePurchases)
    .leftJoin(templates, eq(templatePurchases.template_id, templates.id))
    .leftJoin(users, eq(templates.user_id, users.id))
    .groupBy(templatePurchases.template_id, templates.title, users.username)
    .orderBy(desc(sql`sum(${templatePurchases.price})`))
    .limit(10);

    res.json({
      revenue,
      pendingPayouts,
      topTemplates,
      platformFeePercentage: 30 // 30% platform fee
    });
  } catch (error) {
    logger.error('Error fetching financial overview:', error);
    res.status(500).json({ message: 'Failed to fetch financial data' });
  }
});

// GET /api/admin/financials/transactions - Get detailed transaction history
router.get('/financials/transactions', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select({
      id: templatePurchases.id,
      template_id: templatePurchases.template_id,
      template_title: templates.title,
      buyer_id: templatePurchases.buyer_id,
      buyer_username: users.username,
      creator_id: templates.user_id,
      price: templatePurchases.price,
      platform_fee: templatePurchases.platform_fee,
      creator_payout: templatePurchases.seller_earnings,
      payout_status: templatePurchases.payout_status,
      purchased_at: templatePurchases.purchased_at
    })
    .from(templatePurchases)
    .leftJoin(templates, eq(templatePurchases.template_id, templates.id))
    .leftJoin(users, eq(templatePurchases.buyer_id, users.id));

    // Apply filters
    const conditions = [];
    if (status) {
      conditions.push(eq(templatePurchases.payout_status, status as string));
    }
    if (startDate) {
      conditions.push(gte(templatePurchases.purchased_at, new Date(startDate as string)));
    }
    if (endDate) {
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(sql`${templatePurchases.purchased_at} <= ${endDateTime}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const transactions = await query
      .orderBy(desc(templatePurchases.purchased_at))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const countQuery = db.select({
      count: sql<number>`count(*)`
    }).from(templatePurchases);
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// POST /api/admin/financials/process-payouts - Process pending creator payouts
router.post('/financials/process-payouts', requireSuperAdmin, async (req, res) => {
  try {
    const { creatorId, purchaseIds } = req.body;

    let updateQuery = db.update(templatePurchases)
      .set({
        payout_status: 'processing',
        payout_initiated_at: new Date()
      });

    if (purchaseIds && Array.isArray(purchaseIds)) {
      // Process specific purchases
      updateQuery = updateQuery.where(
        and(
          sql`${templatePurchases.id} = ANY(${purchaseIds})`,
          eq(templatePurchases.payout_status, 'pending')
        )
      );
    } else if (creatorId) {
      // Process all pending for a creator
      updateQuery = updateQuery.where(
        and(
          eq(templatePurchases.payout_status, 'pending'),
          sql`${templatePurchases.template_id} IN (
            SELECT id FROM ${templates} WHERE user_id = ${creatorId}
          )`
        )
      );
    } else {
      return res.status(400).json({ message: 'Either creatorId or purchaseIds required' });
    }

    const result = await updateQuery.returning();

    logger.info(`Super admin initiated payout processing for ${result.length} purchases`);
    res.json({
      message: `Processing ${result.length} payouts`,
      purchases: result
    });
  } catch (error) {
    logger.error('Error processing payouts:', error);
    res.status(500).json({ message: 'Failed to process payouts' });
  }
});

// GET /api/admin/financials/creators - Get creator financial summary
router.get('/financials/creators', requireSuperAdmin, async (req, res) => {
  try {
    const creatorFinancials = await db.select({
      creator_id: users.id,
      username: users.username,
      email: users.email,
      creator_status: users.creator_status,
      totalTemplates: sql<number>`count(distinct ${templates.id})`,
      totalSales: sql<number>`count(distinct ${templatePurchases.id})`,
      totalRevenue: sql<number>`coalesce(sum(${templatePurchases.seller_earnings}), 0)`,
      pendingPayout: sql<number>`coalesce(sum(${templatePurchases.seller_earnings}) filter (where ${templatePurchases.payout_status} = 'pending'), 0)`,
      lastPayout: sql<Date>`max(${templatePurchases.payout_completed_at})`
    })
    .from(users)
    .leftJoin(templates, eq(users.id, templates.user_id))
    .leftJoin(templatePurchases, eq(templates.id, templatePurchases.template_id))
    .where(sql`${users.creator_status} != 'none'`)
    .groupBy(users.id, users.username, users.email, users.creator_status)
    .orderBy(desc(sql`sum(${templatePurchases.seller_earnings})`));

    res.json(creatorFinancials);
  } catch (error) {
    logger.error('Error fetching creator financials:', error);
    res.status(500).json({ message: 'Failed to fetch creator financial data' });
  }
});

// POST /api/admin/financials/mark-paid - Mark payouts as completed
router.post('/financials/mark-paid', requireSuperAdmin, async (req, res) => {
  try {
    const { purchaseIds, paymentMethod, transactionId, notes } = req.body;

    if (!purchaseIds || !Array.isArray(purchaseIds)) {
      return res.status(400).json({ message: 'Purchase IDs required' });
    }

    const result = await db.update(templatePurchases)
      .set({
        payout_status: 'completed',
        payout_completed_at: new Date(),
        payout_method: paymentMethod,
        payout_transaction_id: transactionId,
        payout_notes: notes
      })
      .where(
        and(
          sql`${templatePurchases.id} = ANY(${purchaseIds})`,
          eq(templatePurchases.payout_status, 'processing')
        )
      )
      .returning();

    logger.info(`Super admin marked ${result.length} payouts as completed`);
    res.json({
      message: `Marked ${result.length} payouts as completed`,
      purchases: result
    });
  } catch (error) {
    logger.error('Error marking payouts as paid:', error);
    res.status(500).json({ message: 'Failed to mark payouts as completed' });
  }
});

// GET /api/admin/destinations - Get all destinations for management
router.get('/destinations', async (req, res) => {
  try {
    const allDestinations = await db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
        country: destinations.country,
        status: destinations.status,
        viewCount: destinations.view_count,
        activityCount: destinations.activity_count,
        templateCount: destinations.template_count,
        coverImage: destinations.cover_image,
        updatedAt: destinations.updated_at,
        lastRegenerated: destinations.last_regenerated,
        aiGenerated: destinations.ai_generated
      })
      .from(destinations)
      .orderBy(destinations.name);
    
    // Convert snake_case to camelCase for frontend
    const formattedDestinations = allDestinations.map(dest => ({
      id: dest.id,
      slug: dest.slug,
      name: dest.name,
      country: dest.country,
      status: dest.status,
      viewCount: dest.viewCount,
      activityCount: dest.activityCount,
      templateCount: dest.templateCount,
      coverImage: dest.coverImage,
      updatedAt: dest.updatedAt,
      lastRegenerated: dest.lastRegenerated,
      aiGenerated: dest.aiGenerated
    }));
    
    res.json({ destinations: formattedDestinations });
  } catch (error) {
    logger.error('Error fetching destinations:', error);
    res.status(500).json({ message: 'Failed to fetch destinations' });
  }
});

// Manual purchase recording for failed transactions
router.post('/manual-purchase', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { template_id, user_id: targetUserId } = req.body;
    
    // Use provided userId or the current user
    const buyerId = targetUserId || req.user!.id;
    
    // Get template
    const template = await storage.getTemplate(template_id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Check if already recorded
    const existing = await db.select()
      .from(templatePurchases)
      .where(
        and(
          eq(templatePurchases.template_id, template_id),
          eq(templatePurchases.buyer_id, buyerId)
        )
      )
      .limit(1);
      
    if (existing.length > 0) {
      // If purchase exists but user doesn't have the trip, just copy it
      const { templateCopyService } = await import('../services/templateCopyService');
      const newTripId = await templateCopyService.copyTemplateToTrip(template_id, buyerId);
      
      return res.json({
        message: 'Purchase already recorded, created new trip copy',
        purchaseId: existing[0].id,
        tripId: newTripId
      });
    }
    
    // Record purchase
    const price = parseFloat(template.price || '0');
    const platformFee = price * 0.30;
    const sellerEarnings = price - platformFee;
    
    const [purchase] = await db.insert(templatePurchases)
      .values({
        template_id: template_id,
        buyer_id: buyerId,
        seller_id: template.user_id,
        price: price.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        seller_earnings: sellerEarnings.toFixed(2),
        stripe_payment_intent_id: 'manual_recovery_' + Date.now(),
        stripe_payment_id: 'manual_recovery_' + Date.now(),
        status: 'completed',
        payout_status: 'pending',
      })
      .returning();
      
    // Update template sales
    await db.update(templates)
      .set({ sales_count: sql`COALESCE(sales_count, 0) + 1` })
      .where(eq(templates.id, template_id));
      
    // Copy template to trips
    const { templateCopyService } = await import('../services/templateCopyService');
    const newTripId = await templateCopyService.copyTemplateToTrip(template_id, buyerId);
    
    logger.info(`Manual purchase recorded for template ${template_id} by user ${buyerId}`);
    
    res.json({
      message: 'Purchase recorded successfully',
      purchaseId: purchase.id,
      tripId: newTripId
    });
  } catch (error) {
    logger.error('Error recording manual purchase:', error);
    res.status(500).json({ message: 'Failed to record purchase' });
  }
});

// GET /api/admin/cache/stats - Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const geocodeStats = geocodeCacheService.getStats();
    const aiStats = aiCache.getStats();
    
    res.json({
      geocode: geocodeStats,
      ai: aiStats,
      summary: {
        totalCacheEntries: geocodeStats.entries + aiStats.entries,
        totalCacheSizeMB: geocodeStats.sizeMB + aiStats.sizeMB,
        geocodeHitRate: geocodeStats.hitRate,
        aiHitRate: aiStats.hitRate
      }
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({ message: 'Failed to fetch cache statistics' });
  }
});

// POST /api/admin/cache/clear - Clear cache (super admin only)
router.post('/cache/clear', requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'geocode', 'ai', or 'all'
    
    if (type === 'geocode' || type === 'all') {
      geocodeCacheService.clear();
      logger.info('Geocode cache cleared by admin');
    }
    
    if (type === 'ai' || type === 'all') {
      aiCache.clear();
      logger.info('AI cache cleared by admin');
    }
    
    res.json({ 
      message: `Cache cleared successfully: ${type}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ message: 'Failed to clear cache' });
  }
});

export default router;