import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwtAuth";
import { logger } from "../utils/logger";
import { superCache } from "../services/superCache";
import { queryOptimizer } from "../services/queryOptimizer";
import { searchRateLimit, templateCreationRateLimit, paymentRateLimit } from "../middleware/rateLimiting";
import { httpCache } from "../middleware/httpCache";

const router = Router();

/**
 * Optimized template routes with aggressive caching and query optimization
 */

// GET /api/templates - Browse marketplace templates with caching
router.get("/", searchRateLimit, httpCache('templateList'), async (req, res) => {
  try {
    const queryParams = req.query;

    // Generate cache key from query params
    const cacheKey = `templates:${JSON.stringify(queryParams)}`;

    // Try to get from cache first
    const cached = await superCache.getQuery(cacheKey, async () => {
      // Use optimized search that does everything in one query
      const templates = await queryOptimizer.searchTemplatesOptimized({
        search: queryParams.search as string,
        tag: queryParams.tag as string,
        minPrice: queryParams.minPrice ? parseFloat(String(queryParams.minPrice)) : undefined,
        maxPrice: queryParams.maxPrice ? parseFloat(String(queryParams.maxPrice)) : undefined,
        duration: queryParams.duration ? parseInt(String(queryParams.duration)) : undefined,
        destination: queryParams.destination as string,
        sort: queryParams.sort as string || 'popular',
        limit: parseInt(String(queryParams.limit || '20'))
      });

      return templates;
    }, 60); // Cache for 60 seconds

    res.json(cached);
  } catch (error) {
    logger.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// GET /api/templates/:id - Get single template with aggressive caching
router.get("/:id", httpCache('template'), async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    // Use cache-through pattern
    const template = await superCache.getTemplate(templateId, async () => {
      // Fetch template with all related data in one optimized query
      const templates = await queryOptimizer.getTemplatesWithAllData([templateId]);
      return templates[0];
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Increment view count asynchronously (don't wait)
    setImmediate(() => {
      storage.incrementTemplateViews(templateId).catch(err =>
        logger.error('Failed to increment views:', err)
      );
    });

    res.json(template);
  } catch (error) {
    logger.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// GET /api/templates/purchased - Optimized purchased templates
router.get("/purchased", requireAuth, httpCache('user'), async (req, res) => {
  try {
    const userId = req.user!.id;

    // Cache user's purchases
    const cacheKey = `user-purchases:${userId}`;

    const purchases = await superCache.getQuery(cacheKey, async () => {
      return queryOptimizer.getUserPurchasesOptimized(userId);
    }, 300); // Cache for 5 minutes

    res.json(purchases);
  } catch (error) {
    logger.error("Error fetching purchased templates:", error);
    res.status(500).json({ message: "Failed to fetch purchased templates" });
  }
});

// GET /api/templates/popular - Heavily cached popular templates
router.get("/popular", httpCache('template'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // This is accessed frequently, cache aggressively
    const popular = await superCache.getQuery('popular-templates', async () => {
      return queryOptimizer.searchTemplatesOptimized({
        sort: 'popular',
        limit
      });
    }, 600); // Cache for 10 minutes

    res.json(popular);
  } catch (error) {
    logger.error("Error fetching popular templates:", error);
    res.status(500).json({ message: "Failed to fetch popular templates" });
  }
});

// GET /api/templates/destinations - Cached destination list
router.get("/destinations", httpCache('static'), async (req, res) => {
  try {
    // Popular destinations change rarely, cache for long time
    const destinations = await superCache.getQuery('popular-destinations', async () => {
      const result = await queryOptimizer.preloadCommonData();
      return result.popularDestinations;
    }, 3600); // Cache for 1 hour

    res.json(destinations);
  } catch (error) {
    logger.error("Error fetching destinations:", error);
    res.status(500).json({ message: "Failed to fetch destinations" });
  }
});

// POST /api/templates - Create template (invalidate caches)
router.post("/", requireAuth, templateCreationRateLimit, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Create template
    const template = await storage.createTemplate({
      ...req.body,
      user_id: userId,
      status: "draft"
    });

    // Invalidate relevant caches
    superCache.invalidatePattern('templates:');
    superCache.invalidatePattern('popular-templates');
    superCache.invalidateUser(userId);

    res.status(201).json(template);
  } catch (error) {
    logger.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// PUT /api/templates/:id - Update template (invalidate caches)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Verify ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res.status(404).json({ message: "Template not found or access denied" });
    }

    // Update template
    const updated = await storage.updateTemplate(templateId, req.body);

    // Invalidate caches
    superCache.invalidateTemplate(templateId);
    superCache.invalidatePattern('templates:');
    superCache.invalidateUser(userId);

    res.json(updated);
  } catch (error) {
    logger.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});

// Warm up cache on startup
setTimeout(async () => {
  try {
    logger.info('Warming up template cache...');

    // Preload popular templates
    await queryOptimizer.searchTemplatesOptimized({
      sort: 'popular',
      limit: 50
    });

    // Preload newest templates
    await queryOptimizer.searchTemplatesOptimized({
      sort: 'newest',
      limit: 20
    });

    // Preload common data
    await queryOptimizer.preloadCommonData();

    logger.info('Template cache warmed up successfully');
  } catch (error) {
    logger.error('Failed to warm up cache:', error);
  }
}, 5000); // Wait 5 seconds after startup

export default router;