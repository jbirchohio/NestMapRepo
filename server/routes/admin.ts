import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { requireAdmin } from '../middleware/adminAuth';
import { templateQualityService } from '../services/templateQualityService';
import { db } from '../db-connection';
import { templates, users, templatePurchases } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
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

// GET /api/admin/check - Check if current user is admin
router.get('/check', async (req, res) => {
  // If we got here, user is admin (middleware checked)
  res.json({ 
    isAdmin: true,
    user: {
      id: req.user!.id,
      email: req.user!.email
    }
  });
});

export default router;