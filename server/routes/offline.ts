import { Router } from 'express';
import { z } from 'zod';
import { offlineCapabilitiesService } from '../services/offlineCapabilities';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScoping';

const router = Router();

// Validation schemas
const cacheDataSchema = z.object({
  type: z.enum(['trip', 'booking', 'expense', 'map', 'contact', 'policy']),
  data: z.any(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  expiresAt: z.string().datetime().optional()
});

const offlineActionSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  entity: z.string(),
  data: z.any()
});

const syncConflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolution: z.enum(['local', 'server', 'merge']),
  mergedData: z.any().optional()
});

const mapCacheSchema = z.object({
  region: z.string(),
  mapData: z.object({
    tiles: z.any(),
    routes: z.any().optional(),
    pointsOfInterest: z.any().optional()
  })
});

const expenseSchema = z.object({
  tripId: z.number(),
  amount: z.number(),
  description: z.string(),
  category: z.string().optional(),
  date: z.string().datetime().optional(),
  receipt: z.any().optional()
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

/**
 * @route POST /api/offline/cache
 * @desc Cache data for offline use
 * @access Private
 */
router.post('/cache', async (req, res) => {
  try {
    const { type, data, priority, expiresAt } = cacheDataSchema.parse(req.body);

    const cacheId = await offlineCapabilitiesService.cacheDataForOffline(
      type,
      data,
      priority,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json({
      success: true,
      data: {
        cacheId,
        type,
        priority,
        expiresAt,
        cachedAt: new Date()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cache data',
        errors: error.errors
      });
    }

    console.error('Data caching error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cache data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/cache/:id
 * @desc Get cached data by ID
 * @access Private
 */
router.get('/cache/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cachedData = await offlineCapabilitiesService.getOfflineData(id);

    if (!cachedData) {
      return res.status(404).json({
        success: false,
        message: 'Cached data not found or expired'
      });
    }

    res.json({
      success: true,
      data: cachedData
    });

  } catch (error) {
    console.error('Cache retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cached data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/cache/type/:type
 * @desc Get all cached data of a specific type
 * @access Private
 */
router.get('/cache/type/:type', async (req, res) => {
  try {
    const { type } = req.params;

    if (!['trip', 'booking', 'expense', 'map', 'contact', 'policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cache type'
      });
    }

    const cachedData = await offlineCapabilitiesService.getOfflineDataByType(type as any);

    res.json({
      success: true,
      data: {
        type,
        items: cachedData,
        count: cachedData.length
      }
    });

  } catch (error) {
    console.error('Cache type retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cached data by type',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/actions/queue
 * @desc Queue an offline action for sync
 * @access Private
 */
router.post('/actions/queue', async (req, res) => {
  try {
    const { type, entity, data } = offlineActionSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    const actionId = await offlineCapabilitiesService.queueOfflineAction(
      type,
      entity,
      data,
      userId,
      organizationId
    );

    res.json({
      success: true,
      data: {
        actionId,
        type,
        entity,
        queuedAt: new Date(),
        status: 'pending'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action data',
        errors: error.errors
      });
    }

    console.error('Action queuing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/sync
 * @desc Trigger manual sync of offline data
 * @access Private
 */
router.post('/sync', async (req, res) => {
  try {
    // Trigger sync process
    await offlineCapabilitiesService.processSyncQueue();

    res.json({
      success: true,
      message: 'Sync process initiated',
      syncStarted: new Date()
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate sync',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/conflicts/resolve
 * @desc Resolve sync conflicts
 * @access Private
 */
router.post('/conflicts/resolve', async (req, res) => {
  try {
    const { conflictId, resolution, mergedData } = syncConflictResolutionSchema.parse(req.body);

    await offlineCapabilitiesService.resolveConflict(conflictId, resolution, mergedData);

    res.json({
      success: true,
      data: {
        conflictId,
        resolution,
        resolvedAt: new Date()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conflict resolution data',
        errors: error.errors
      });
    }

    console.error('Conflict resolution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve conflict',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/trips
 * @desc Get offline trips for user
 * @access Private
 */
router.get('/trips', async (req, res) => {
  try {
    const userId = req.user!.id;

    const trips = await offlineCapabilitiesService.getOfflineTrips(userId);

    res.json({
      success: true,
      data: {
        trips,
        count: trips.length
      }
    });

  } catch (error) {
    console.error('Offline trips retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offline trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/offline/trips/:tripId
 * @desc Update trip offline
 * @access Private
 */
router.put('/trips/:tripId', async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const updates = req.body;
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }

    await offlineCapabilitiesService.updateTripOffline(tripId, updates, userId, organizationId);

    res.json({
      success: true,
      data: {
        tripId,
        updates,
        updatedAt: new Date(),
        syncStatus: 'pending'
      }
    });

  } catch (error) {
    console.error('Offline trip update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trip offline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/expenses
 * @desc Add expense offline
 * @access Private
 */
router.post('/expenses', async (req, res) => {
  try {
    const expense = expenseSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    const expenseId = await offlineCapabilitiesService.addExpenseOffline(
      expense.tripId,
      {
        ...expense,
        date: expense.date ? new Date(expense.date) : new Date()
      },
      userId,
      organizationId
    );

    res.json({
      success: true,
      data: {
        expenseId,
        tripId: expense.tripId,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        createdAt: new Date(),
        syncStatus: 'pending'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense data',
        errors: error.errors
      });
    }

    console.error('Offline expense creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add expense offline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/expenses/:tripId
 * @desc Get offline expenses for a trip
 * @access Private
 */
router.get('/expenses/:tripId', async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);

    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }

    const expenses = await offlineCapabilitiesService.getOfflineExpenses(tripId);

    res.json({
      success: true,
      data: {
        tripId,
        expenses,
        count: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
      }
    });

  } catch (error) {
    console.error('Offline expenses retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offline expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/maps/cache
 * @desc Cache map data for offline use
 * @access Private
 */
router.post('/maps/cache', async (req, res) => {
  try {
    const { region, mapData } = mapCacheSchema.parse(req.body);

    await offlineCapabilitiesService.cacheMapData(region, mapData);

    res.json({
      success: true,
      data: {
        region,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid map data',
        errors: error.errors
      });
    }

    console.error('Map caching error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cache map data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/maps/:region
 * @desc Get cached map data for a region
 * @access Private
 */
router.get('/maps/:region', async (req, res) => {
  try {
    const { region } = req.params;

    const mapData = await offlineCapabilitiesService.getOfflineMapData(region);

    if (!mapData) {
      return res.status(404).json({
        success: false,
        message: 'Map data not found for region'
      });
    }

    res.json({
      success: true,
      data: {
        region,
        mapData
      }
    });

  } catch (error) {
    console.error('Map data retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve map data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/ai/process
 * @desc Process data using edge AI
 * @access Private
 */
router.post('/ai/process', async (req, res) => {
  try {
    const { type, data } = z.object({
      type: z.enum(['expense_categorization', 'itinerary_optimization', 'recommendation']),
      data: z.any()
    }).parse(req.body);

    const result = await offlineCapabilitiesService.processOfflineAI(type, data);

    res.json({
      success: true,
      data: {
        type,
        result,
        processedAt: new Date(),
        processedOffline: true
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI processing request',
        errors: error.errors
      });
    }

    console.error('Offline AI processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data with edge AI',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/stats
 * @desc Get offline storage statistics
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await offlineCapabilitiesService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Storage stats retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve storage statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/offline/clear
 * @desc Clear all offline data
 * @access Private
 */
router.delete('/clear', async (req, res) => {
  try {
    await offlineCapabilitiesService.clearOfflineData();

    res.json({
      success: true,
      message: 'All offline data cleared successfully',
      clearedAt: new Date()
    });

  } catch (error) {
    console.error('Offline data clearing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear offline data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/offline/export
 * @desc Export offline data for backup
 * @access Private
 */
router.get('/export', async (req, res) => {
  try {
    const exportData = await offlineCapabilitiesService.exportOfflineData();

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Offline data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export offline data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/offline/import
 * @desc Import offline data from backup
 * @access Private
 */
router.post('/import', async (req, res) => {
  try {
    const { exportData } = z.object({
      exportData: z.any()
    }).parse(req.body);

    await offlineCapabilitiesService.importOfflineData(exportData);

    res.json({
      success: true,
      message: 'Offline data imported successfully',
      importedAt: new Date()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import data',
        errors: error.errors
      });
    }

    console.error('Offline data import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import offline data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
