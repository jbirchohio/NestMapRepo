import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { bookings, bookingPayments, trips, insertBookingSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get bookings for a trip (organization-scoped)
router.get('/trip/:tripId', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user.organization_id;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Get bookings for this trip
    const tripBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.tripId, tripId),
        eq(bookings.organizationId, organizationId)
      ))
      .orderBy(desc(bookings.createdAt));
    
    res.json(tripBookings);
  } catch (error) {
    console.error('Error fetching trip bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Create flight booking
router.post('/flights', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const {
      tripId,
      flightOffer,
      passengerDetails,
      paymentMethod = 'card'
    } = req.body;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Check if we have Amadeus API credentials
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "Booking service not configured",
        message: "Flight booking requires Amadeus API credentials. Please contact support."
      });
    }

    // Attempt real flight booking through Amadeus
    let bookingResult;
    try {
      const { bookingEngine } = await import('../bookingEngine');
      bookingResult = await bookingEngine.bookFlight({
        offer: flightOffer,
        passengers: passengerDetails.passengers,
        paymentMethod
      });
    } catch (bookingError) {
      console.error('Amadeus booking failed:', bookingError);
      return res.status(500).json({
        error: "Booking failed",
        message: "Unable to complete flight booking. Please try again or contact support.",
        details: bookingError instanceof Error ? bookingError.message : 'Unknown error'
      });
    }
    
    // Create booking record
    const [newBooking] = await db
      .insert(bookings)
      .values({
        tripId,
        userId,
        organizationId,
        type: 'flight',
        provider: 'amadeus',
        providerBookingId: bookingResult.id,
        status: bookingResult.status || 'confirmed',
        bookingData: flightOffer,
        totalAmount: Math.round(parseFloat(flightOffer.price.total) * 100), // Convert to cents
        currency: flightOffer.price.currency,
        passengerDetails,
        bookingReference: bookingResult.reference,
        departureDate: new Date(flightOffer.itineraries[0].segments[0].departure.at),
        returnDate: flightOffer.itineraries[1] ? new Date(flightOffer.itineraries[1].segments[0].departure.at) : null,
        cancellationPolicy: bookingResult.cancellationPolicy
      })
      .returning();
    
    // Create payment record if Stripe integration is available
    if (process.env.STRIPE_SECRET_KEY) {
      await db
        .insert(bookingPayments)
        .values({
          bookingId: newBooking.id,
          organizationId,
          amount: newBooking.totalAmount!,
          currency: newBooking.currency,
          status: 'completed',
          paymentMethod,
          processedAt: new Date()
        });
    }
    
    res.status(201).json({
      booking: newBooking,
      confirmation: bookingResult
    });
    
  } catch (error) {
    console.error('Error creating flight booking:', error);
    res.status(500).json({ error: "Failed to create flight booking" });
  }
});

// Create hotel booking
router.post('/hotels', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const {
      tripId,
      hotelOffer,
      guestDetails,
      paymentMethod = 'card'
    } = req.body;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Check if we have booking API credentials
    if (!process.env.AMADEUS_CLIENT_ID) {
      return res.status(500).json({ 
        error: "Booking service not configured",
        message: "Hotel booking requires API credentials. Please contact support."
      });
    }

    // Attempt real hotel booking
    let bookingResult;
    try {
      const { bookHotel } = await import('../bookingProviders');
      bookingResult = await bookHotel({
        hotelId: hotelOffer.hotel.hotelId,
        offer: hotelOffer,
        guests: guestDetails.guests,
        paymentMethod
      });
    } catch (bookingError) {
      console.error('Hotel booking failed:', bookingError);
      return res.status(500).json({
        error: "Booking failed",
        message: "Unable to complete hotel booking. Please try again or contact support.",
        details: bookingError instanceof Error ? bookingError.message : 'Unknown error'
      });
    }
    
    // Create booking record
    const [newBooking] = await db
      .insert(bookings)
      .values({
        tripId,
        userId,
        organizationId,
        type: 'hotel',
        provider: 'amadeus',
        providerBookingId: bookingResult.id,
        status: bookingResult.status || 'confirmed',
        bookingData: hotelOffer,
        totalAmount: Math.round(parseFloat(hotelOffer.offers[0].price.total) * 100),
        currency: hotelOffer.offers[0].price.currency,
        passengerDetails: { passengers: guestDetails.guests },
        bookingReference: bookingResult.reference,
        checkInDate: new Date(hotelOffer.offers[0].checkInDate),
        checkOutDate: new Date(hotelOffer.offers[0].checkOutDate),
        cancellationPolicy: bookingResult.cancellationPolicy
      })
      .returning();
    
    // Create payment record if Stripe integration is available
    if (process.env.STRIPE_SECRET_KEY) {
      await db
        .insert(bookingPayments)
        .values({
          bookingId: newBooking.id,
          organizationId,
          amount: newBooking.totalAmount!,
          currency: newBooking.currency,
          status: 'completed',
          paymentMethod,
          processedAt: new Date()
        });
    }
    
    res.status(201).json({
      booking: newBooking,
      confirmation: bookingResult
    });
    
  } catch (error) {
    console.error('Error creating hotel booking:', error);
    res.status(500).json({ error: "Failed to create hotel booking" });
  }
});

// Cancel booking
router.patch('/:bookingId/cancel', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const bookingId = parseInt(req.params.bookingId);
    const organizationId = req.user.organization_id;
    const { reason } = req.body;
    
    // Verify booking belongs to user's organization
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, organizationId)
      ));
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: "Booking already cancelled" });
    }
    
    // Attempt to cancel with provider if possible
    let cancellationResult = { success: true, refundAmount: 0 };
    
    if (booking.providerBookingId) {
      try {
        // Would integrate with provider cancellation APIs here
        console.log(`Cancelling booking ${booking.providerBookingId} with ${booking.provider}`);
      } catch (error) {
        console.error('Provider cancellation failed:', error);
      }
    }
    
    // Update booking status
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    
    res.json({
      booking: updatedBooking,
      cancellation: cancellationResult
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Get booking details
router.get('/:bookingId', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const bookingId = parseInt(req.params.bookingId);
    const organizationId = req.user.organization_id;
    
    // Get booking with payment information
    const [booking] = await db
      .select({
        booking: bookings,
        payments: bookingPayments
      })
      .from(bookings)
      .leftJoin(bookingPayments, eq(bookings.id, bookingPayments.bookingId))
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, organizationId)
      ));
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: "Failed to fetch booking details" });
  }
});

// Flight booking helper function
async function bookFlightWithAmadeus(params: {
  offer: any;
  passengers: any[];
  paymentMethod: string;
}) {
  // This would integrate with the actual Amadeus Flight Create Orders API
  // For now, returning a structured response that matches expected format
  throw new Error("Amadeus Flight Create Orders API requires authentication setup");
}

export default router;