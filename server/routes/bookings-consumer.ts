import { Router } from "express";
import { jwtAuthMiddleware } from "../middleware/jwtAuth";
import { z } from "zod";
import { db } from "../db-connection";
import { bookings, activities, trips } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
router.use(jwtAuthMiddleware);

// Schema for saving booking requests
const saveBookingSchema = z.object({
  trip_id: z.number(),
  activity_id: z.number().optional(),
  type: z.enum(['flight', 'hotel', 'activity']),
  provider: z.string().optional(),
  reference: z.string(),
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    price: z.number(),
    currency: z.string(),
    date: z.string().optional(),
    time: z.string().optional(),
    guest_count: z.number(),
    total_price: z.number(),
    product_code: z.string().optional(),
    location_name: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
  })),
  contact_email: z.string().email(),
  total_price: z.number(),
  currency: z.string(),
  status: z.string().default('saved'),
});

// GET /api/consumer/bookings - Get user's bookings
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userBookings = await db
      .select({
        booking: bookings,
        trip: {
          id: trips.id,
          title: trips.title,
          city: trips.city,
          start_date: trips.start_date,
          end_date: trips.end_date,
        }
      })
      .from(bookings)
      .leftJoin(trips, eq(bookings.trip_id, trips.id))
      .where(eq(bookings.user_id, req.user.id))
      .orderBy(desc(bookings.created_at));

    res.json({
      success: true,
      bookings: userBookings
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch bookings" 
    });
  }
});

// GET /api/consumer/bookings/trip/:tripId - Get bookings for a specific trip
router.get("/trip/:tripId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const tripId = parseInt(req.params.tripId);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: "Invalid trip ID" });
    }

    // Verify trip belongs to user
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.user_id, req.user.id)
      ));

    if (!trip) {
      return res.status(404).json({ success: false, error: "Trip not found" });
    }

    const tripBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.user_id, req.user.id),
        eq(bookings.trip_id, tripId)
      ))
      .orderBy(desc(bookings.created_at));

    res.json({
      success: true,
      bookings: tripBookings
    });
  } catch (error) {
    console.error("Error fetching trip bookings:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch trip bookings" 
    });
  }
});

// POST /api/consumer/bookings - Save a booking request
router.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const validatedData = saveBookingSchema.parse(req.body);

    // Verify trip belongs to user
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, validatedData.trip_id),
        eq(trips.user_id, req.user.id)
      ));

    if (!trip) {
      return res.status(404).json({ success: false, error: "Trip not found" });
    }

    // Create booking record
    const [newBooking] = await db
      .insert(bookings)
      .values({
        user_id: req.user.id,
        trip_id: validatedData.trip_id,
        activity_id: validatedData.activity_id,
        type: validatedData.type,
        provider: validatedData.provider || 'manual',
        external_booking_id: validatedData.reference,
        confirmation_code: validatedData.reference,
        total_amount: validatedData.total_price.toString(),
        currency: validatedData.currency,
        status: 'saved',
        booking_data: {
          items: validatedData.items,
          contact_email: validatedData.contact_email,
          guest_count: validatedData.items[0]?.guest_count || 1,
          created_at: new Date().toISOString(),
        }
      })
      .returning();

    res.json({
      success: true,
      booking: newBooking
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid booking data",
        details: error.errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: "Failed to save booking" 
    });
  }
});

// PUT /api/consumer/bookings/:id - Update booking status
router.put("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: "Invalid booking ID" });
    }

    const { status, confirmation_code } = req.body;

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status,
        confirmation_code: confirmation_code || undefined,
        updated_at: new Date(),
      })
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.user_id, req.user.id)
      ))
      .returning();

    if (!updatedBooking) {
      return res.status(404).json({ 
        success: false, 
        error: "Booking not found" 
      });
    }

    res.json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update booking" 
    });
  }
});

// DELETE /api/consumer/bookings/:id - Cancel a booking
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: "Invalid booking ID" });
    }

    // Soft delete by updating status to cancelled
    const [cancelledBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updated_at: new Date(),
      })
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.user_id, req.user.id)
      ))
      .returning();

    if (!cancelledBooking) {
      return res.status(404).json({ 
        success: false, 
        error: "Booking not found" 
      });
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: cancelledBooking
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to cancel booking" 
    });
  }
});

export default router;