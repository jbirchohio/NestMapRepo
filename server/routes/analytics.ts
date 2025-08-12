import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { analyticsService } from '../services/analyticsService';
import { auditService } from '../services/auditService';

const router = Router();

/**
 * GET /api/analytics/template/:id - Get analytics for a specific template
 */
router.get('/template/:id', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;

    // TODO: Verify user owns this template
    const analytics = await analyticsService.getTemplateAnalytics(
      templateId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    if (!analytics) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching template analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/creator - Get analytics for the authenticated creator
 */
router.get('/creator', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getCreatorAnalytics(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching creator analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/marketplace - Get marketplace-wide analytics (admin only)
 */
router.get('/marketplace', requireAuth, async (req, res) => {
  try {
    // TODO: Add admin check
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getMarketplaceAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching marketplace analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/funnel/:templateId - Get conversion funnel for a template
 */
router.get('/funnel/:templateId', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const days = parseInt(req.query.days as string) || 30;

    const funnel = await analyticsService.getConversionFunnel(templateId, days);

    res.json(funnel);
  } catch (error) {
    logger.error('Error fetching conversion funnel:', error);
    res.status(500).json({ message: 'Failed to fetch funnel analytics' });
  }
});

/**
 * POST /api/analytics/track/view - Track a template view
 */
router.post('/track/view', async (req, res) => {
  try {
    const { templateId } = req.body;
    const userId = req.user?.id;

    if (!templateId) {
      return res.status(400).json({ message: 'Template ID required' });
    }

    await analyticsService.trackView(templateId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking view:', error);
    res.status(500).json({ message: 'Failed to track view' });
  }
});

/**
 * GET /api/analytics/audit/user - Get user audit log
 */
router.get('/audit/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { days } = req.query;

    const summary = await auditService.getUserActivitySummary(
      userId,
      days ? parseInt(days as string) : 30
    );

    res.json(summary);
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/analytics/audit/anomalies - Detect anomalies for user
 */
router.get('/audit/anomalies', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const anomalies = await auditService.detectAnomalies(userId);

    res.json(anomalies);
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    res.status(500).json({ message: 'Failed to detect anomalies' });
  }
});

export default router;