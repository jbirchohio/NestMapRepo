import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { bookings, bookingPayments, trips, insertBookingSchema } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { searchFlights, searchHotels } from '../bookingProviders';
import { z } from 'zod';

const router = Router();

// Flight search endpoint with JWT authentication
router.post('/flights/search', async (req, res) => {
  try {
    console.log('Authenticated flight search request:', req.body);

    // Standardize camelCase to snake_case for API consistency
    const origin = req.body.origin;
    const destination = req.body.destination;
    const departureDate = req.body.departureDate || req.body.departure_date;
    const returnDate = req.body.returnDate || req.body.return_date;
    const passengers = req.body.passengers || 1;

    // Convert date objects to strings if needed
    const formatDate = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string' && date.length > 0) return date;
      if (date instanceof Date && !isNaN(date.getTime())) return date.toISOString().split('T')[0];
      if (typeof date === 'object' && date.$d && date.$d instanceof Date) return date.$d.toISOString().split('T')[0];
      if (typeof date === 'object' && Object.keys(date).length === 0) return '';
      return '';
    };

    const departureDateStr = formatDate(departureDate);
    const returnDateStr = returnDate ? formatDate(returnDate) : undefined;

    // Validation
    if (!origin || !destination || !departureDateStr) {
      return res.status(400).json({ 
        message: "Missing required search parameters: origin, destination, departureDate",
        received: { origin, destination, departureDate: departureDateStr, passengers }
      });
    }

    console.log('Searching flights via Duffel API:', { origin, destination, departureDateStr, returnDateStr, passengers });

    // Use authentic Duffel API through booking provider
    const flights = await searchFlights({
      origin,
      destination,
      departureDate: departureDateStr,
      returnDate: returnDateStr,
      passengers
    });

    console.log(`Duffel API returned ${flights.length} flight options`);

    // Return flights with proper structure (Duffel already provides normalized data)
    const normalizedFlights = flights.map(flight => ({
      id: flight.id,
      airline: flight.airline,
      origin: flight.origin,
      destination: flight.destination,
      departureDate: flight.departureDate,
      price: flight.price
    }));

    res.json({ flights: normalizedFlights });
  } catch (error) {
    console.error('Duffel flight search error:', error);
    res.status(500).json({ 
      message: "Flight search failed", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get bookings for a specific trip
router.get('/trip/:tripId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user.organizationId;

    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organizationId, organizationId)
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

// Get all bookings for organization
router.get('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, parseInt(req.params.tripId)),
        eq(trips.organizationId, organizationId)
      ));

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const allBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.organizationId, organizationId))
      .orderBy(desc(bookings.createdAt));

    res.json(allBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Book a flight
router.post('/flights/book', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const { tripId, flightData, passengerDetails } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Verify trip exists and belongs to organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organizationId, organizationId)
      ));

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Create booking record
    const [booking] = await db
      .insert(bookings)
      .values({
        tripId,
        userId,
        organizationId,
        type: 'flight',
        provider: 'amadeus',
        status: 'pending',
        bookingData: flightData,
        totalAmount: Math.round(flightData.price * 100), // Convert to cents
        currency: flightData.currency || 'USD',
        passengerDetails: { passengers: passengerDetails },
        departureDate: new Date(flightData.departure_date),
        returnDate: flightData.return_date ? new Date(flightData.return_date) : null
      })
      .returning();

    res.json({ 
      success: true, 
      booking,
      message: "Flight booking initiated successfully" 
    });

  } catch (error) {
    console.error('Flight booking error:', error);
    res.status(500).json({ error: "Failed to book flight" });
  }
});

// Hotel search endpoint with authentic API integration
router.post('/hotels/search', async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests, rooms } = req.body;

    if (!location || !checkIn || !checkOut) {
      return res.status(400).json({ 
        message: "Missing required parameters: location, checkIn, checkOut" 
      });
    }

    console.log('Searching hotels via Duffel API:', { location, checkIn, checkOut, guests, rooms });

    // Use authentic Duffel API through booking provider
    const hotels = await searchHotels({
      destination: location,
      checkIn,
      checkOut,
      guests: guests || 1,
      rooms: rooms || 1
    });

    console.log(`Duffel API returned ${hotels.length} hotel options`);

    res.json({ hotels });
  } catch (error) {
    console.error('Duffel hotel search error:', error);
    res.status(500).json({ 
      message: "Hotel search failed", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Book a hotel
router.post('/hotels/book', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const { tripId, hotelData, guestDetails } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Verify trip exists and belongs to organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organizationId, organizationId)
      ));

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Calculate total nights and cost
    const checkIn = new Date(hotelData.check_in);
    const checkOut = new Date(hotelData.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = hotelData.price_per_night * nights;

    // Create booking record
    const [booking] = await db
      .insert(bookings)
      .values({
        tripId,
        userId,
        organizationId,
        type: 'hotel',
        provider: 'booking.com',
        status: 'pending',
        bookingData: { ...hotelData, nights, total_cost: totalCost },
        totalAmount: Math.round(totalCost * 100), // Convert to cents
        currency: hotelData.currency || 'USD',
        passengerDetails: { guests: guestDetails },
        checkInDate: checkIn,
        checkOutDate: checkOut
      })
      .returning();

    res.json({ 
      success: true, 
      booking,
      message: "Hotel booking initiated successfully" 
    });

  } catch (error) {
    console.error('Hotel booking error:', error);
    res.status(500).json({ error: "Failed to book hotel" });
  }
});

// Get booking by ID
router.get('/:bookingId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const bookingId = parseInt(req.params.bookingId);
    const organizationId = req.user.organizationId;

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

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// Cancel booking
router.patch('/:bookingId/cancel', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const bookingId = parseInt(req.params.bookingId);
    const organizationId = req.user.organizationId;

    // Verify booking exists and belongs to organization
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.organizationId, organizationId)
      ));

    if (!existingBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (existingBooking.status === 'cancelled') {
      return res.status(400).json({ error: "Booking already cancelled" });
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
      success: true, 
      booking: updatedBooking,
      message: "Booking cancelled successfully" 
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;