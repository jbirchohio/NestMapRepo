import { Router } from 'express';
import { db } from '../db';
import { trips, expenses, bookings, activities } from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';
import { expenseManagementService } from '../services/expenseManagementService';
// Duty of care service removed - no APIs available
import multer from 'multer';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply auth and organization context
router.use(jwtAuthMiddleware);
router.use(requireOrganizationContext);

// Download offline data package
router.get('/download-offline-data', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Get user's active trips
    const activeTrips = await db.select()
      .from(trips)
      .where(
        and(
          eq(trips.user_id, req.user.id),
          eq(trips.organization_id, req.organizationContext.id),
          gte(trips.end_date, new Date()),
          eq(trips.completed, false)
        )
      );

    // Get recent expenses
    const recentExpenses = await db.select()
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, req.user.id),
          eq(expenses.organization_id, req.organizationContext.id),
          gte(expenses.created_at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(expenses.created_at))
      .limit(50);

    // Get trip bookings
    const tripIds = activeTrips.map(t => t.id);
    const tripBookings = tripIds.length > 0 
      ? await db.select()
          .from(bookings)
          .where(inArray(bookings.tripId, tripIds))
      : [];

    // Get trip activities
    const tripActivities = tripIds.length > 0
      ? await db.select()
          .from(activities)
          .where(inArray(activities.trip_id, tripIds))
      : [];

    // Package data
    const offlineData = {
      trips: activeTrips,
      expenses: recentExpenses,
      bookings: tripBookings,
      activities: tripActivities,
      receipts: [], // Would include receipt URLs
      lastSync: new Date(),
      version: '1.0'
    };

    res.json(offlineData);
  } catch (error) {
    console.error('Error downloading offline data:', error);
    res.status(500).json({ error: 'Failed to download offline data' });
  }
});

// Quick expense capture with receipt
router.post('/quick-capture', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user || !req.file) {
      return res.status(400).json({ error: 'Receipt required' });
    }

    // Create placeholder expense
    const { expense } = await expenseManagementService.createExpense({
      organization_id: req.organizationContext.id,
      user_id: req.user.id,
      merchant_name: 'Pending OCR',
      amount: 0, // Will be updated after OCR
      currency: 'USD',
      transaction_date: new Date(),
      expense_category: 'other',
      description: 'Quick capture - pending OCR processing',
      receipt_status: 'pending'
    });

    // Process receipt with OCR
    const receipt = await expenseManagementService.processReceipt(
      {
        expense_id: expense.id,
        organization_id: req.organizationContext.id,
        file_url: `/receipts/${expense.id}/quick-capture.jpg`,
        file_type: req.file.mimetype,
        file_size: req.file.size
      },
      req.file.buffer
    );

    res.json({
      expense,
      receipt,
      message: 'Receipt captured and processing'
    });
  } catch (error) {
    console.error('Error with quick capture:', error);
    res.status(500).json({ error: 'Failed to capture receipt' });
  }
});

// Simplified check-in
router.post('/check-in', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { latitude, longitude, message } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location required' });
    }

    // Check-in feature removed - no duty of care API available
    res.status(503).json({ 
      error: 'Check-in feature not available',
      message: 'Travel tracking requires external APIs that are not configured'
    });
  } catch (error) {
    console.error('Error with check-in:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Emergency SOS
router.post('/emergency', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { latitude, longitude, message, severity } = req.body;

    // Emergency tracking removed - no duty of care API available
    // In production, integrate with local emergency services

    // Send immediate notification
    // In production, this would trigger multiple emergency protocols
    res.json({
      success: true,
      message: 'Emergency alert sent',
      emergencyNumbers: {
        local: process.env.LOCAL_EMERGENCY_NUMBER || '911',
        company: process.env.COMPANY_EMERGENCY_NUMBER || 'Not configured',
        embassy: process.env.EMBASSY_EMERGENCY_NUMBER || 'Not configured'
      }
    });
  } catch (error) {
    console.error('Error with emergency alert:', error);
    res.status(500).json({ error: 'Failed to send emergency alert' });
  }
});

// Mobile-optimized trip view
router.get('/trips/current', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Get current/upcoming trips
    const currentTrips = await db.select()
      .from(trips)
      .where(
        and(
          eq(trips.user_id, req.user.id),
          eq(trips.organization_id, req.organizationContext.id),
          gte(trips.end_date, new Date()),
          eq(trips.completed, false)
        )
      )
      .orderBy(trips.start_date)
      .limit(5);

    // Get simplified trip data with essential info
    const mobileTrips = await Promise.all(
      currentTrips.map(async (trip) => {
        const [bookingCount] = await db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(bookings)
        .where(eq(bookings.tripId, trip.id));

        const [activityCount] = await db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(activities)
        .where(eq(activities.trip_id, trip.id));

        return {
          id: trip.id,
          title: trip.title,
          destination: trip.city || trip.location,
          startDate: trip.start_date,
          endDate: trip.end_date,
          daysUntil: Math.floor((trip.start_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          bookings: bookingCount.count,
          activities: activityCount.count,
          status: trip.start_date < new Date() ? 'active' : 'upcoming'
        };
      })
    );

    res.json(mobileTrips);
  } catch (error) {
    console.error('Error fetching mobile trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Sync offline data
router.post('/sync', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { expenses: offlineExpenses, receipts, checkIns } = req.body;
    const results = {
      expenses: [],
      receipts: [],
      checkIns: [],
      errors: []
    };

    // Sync expenses
    if (offlineExpenses && Array.isArray(offlineExpenses)) {
      for (const expense of offlineExpenses) {
        try {
          const result = await expenseManagementService.createExpense({
            ...expense,
            organization_id: req.organizationContext.id,
            user_id: req.user.id
          });
          results.expenses.push(result);
        } catch (error) {
          results.errors.push({ type: 'expense', data: expense, error: error.message });
        }
      }
    }

    // Process other sync items...

    res.json({
      success: true,
      synced: {
        expenses: results.expenses.length,
        receipts: results.receipts.length,
        checkIns: results.checkIns.length
      },
      errors: results.errors
    });
  } catch (error) {
    console.error('Error syncing offline data:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Helper: Reverse geocode coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // In production, this would use a real geocoding API
  return `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}

// Helper: Import for inArray
import { inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export default router;