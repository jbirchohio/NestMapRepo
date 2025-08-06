import { Router } from 'express';
import { db } from '../db';
import { jwtAuth } from '../middleware/jwtAuth';
import { bookings, trips } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Pending bookings tracker (in-memory for now, could use Redis in production)
const pendingBookings = new Map<string, {
  userId: string;
  tripId: string;
  hotelId: string;
  hotelName: string;
  price: string;
  checkIn: string;
  checkOut: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'browsing' | 'expired';
}>();

// Clean up old pending bookings every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  for (const [trackingId, booking] of pendingBookings.entries()) {
    if (booking.timestamp < oneHourAgo && booking.status === 'pending') {
      booking.status = 'expired';
    }
  }
}, 60 * 60 * 1000);

// Create a pending booking
router.post('/pending', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { 
      tripId, 
      hotelId, 
      hotelName, 
      price, 
      trackingId, 
      checkIn, 
      checkOut,
      timestamp 
    } = req.body;

    // Store pending booking
    pendingBookings.set(trackingId, {
      userId,
      tripId,
      hotelId,
      hotelName,
      price,
      checkIn,
      checkOut,
      timestamp: timestamp || Date.now(),
      status: 'pending'
    });

    // Also save to database for persistence
    await db.insert(bookings).values({
      user_id: userId,
      trip_id: parseInt(tripId),
      type: 'hotel',
      provider: 'expedia',
      reference_number: trackingId,
      status: 'pending',
      total_amount: parseFloat(price.replace(/[^0-9.]/g, '')),
      currency: 'USD',
      details: {
        hotelId,
        hotelName,
        checkIn,
        checkOut,
        trackingId
      },
      created_at: new Date(),
      updated_at: new Date()
    });

    res.json({ success: true, trackingId });
  } catch (error) {
    console.error('Error creating pending booking:', error);
    res.status(500).json({ error: 'Failed to create pending booking' });
  }
});

// Check booking status
router.get('/check-status/:trackingId', jwtAuth, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userId = (req as any).user.id;

    // Check in-memory first
    const pendingBooking = pendingBookings.get(trackingId);
    
    if (pendingBooking && pendingBooking.userId === userId) {
      // Simulate checking with Expedia API or scraping
      // In production, you'd check with actual booking status
      
      // For demo: randomly mark some as completed after 30 seconds
      const thirtySecondsAgo = Date.now() - (30 * 1000);
      if (pendingBooking.timestamp < thirtySecondsAgo && Math.random() > 0.7) {
        pendingBooking.status = 'completed';
      }

      return res.json({
        completed: pendingBooking.status === 'completed',
        status: pendingBooking.status,
        booking: pendingBooking
      });
    }

    // Check database
    const dbBooking = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.reference_number, trackingId),
          eq(bookings.user_id, userId)
        )
      )
      .limit(1);

    if (dbBooking.length > 0) {
      return res.json({
        completed: dbBooking[0].status === 'confirmed',
        status: dbBooking[0].status,
        booking: dbBooking[0]
      });
    }

    res.json({ completed: false, status: 'not_found' });
  } catch (error) {
    console.error('Error checking booking status:', error);
    res.status(500).json({ error: 'Failed to check booking status' });
  }
});

// Update booking status
router.post('/update-status', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { trackingId, status } = req.body;

    // Update in-memory
    const pendingBooking = pendingBookings.get(trackingId);
    if (pendingBooking && pendingBooking.userId === userId) {
      pendingBooking.status = status;
    }

    // Update in database
    await db.update(bookings)
      .set({ 
        status: status === 'completed' ? 'confirmed' : status,
        updated_at: new Date()
      })
      .where(
        and(
          eq(bookings.reference_number, trackingId),
          eq(bookings.user_id, userId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Get user's pending bookings
router.get('/pending/:tripId', jwtAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { tripId } = req.params;

    const pendingBookingsForTrip = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.trip_id, parseInt(tripId)),
          eq(bookings.user_id, userId),
          eq(bookings.status, 'pending')
        )
      )
      .orderBy(desc(bookings.created_at));

    res.json({ bookings: pendingBookingsForTrip });
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    res.status(500).json({ error: 'Failed to fetch pending bookings' });
  }
});

// Webhook endpoint for Expedia (if they support it)
router.post('/webhook/expedia', async (req, res) => {
  try {
    const { trackingId, status, confirmationNumber } = req.body;
    
    // Verify webhook signature (in production)
    // const signature = req.headers['x-expedia-signature'];
    // if (!verifyExpediaSignature(signature, req.body)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Update booking status
    const pendingBooking = pendingBookings.get(trackingId);
    if (pendingBooking) {
      pendingBooking.status = 'completed';
    }

    await db.update(bookings)
      .set({ 
        status: 'confirmed',
        confirmation_number: confirmationNumber,
        updated_at: new Date()
      })
      .where(eq(bookings.reference_number, trackingId));

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;