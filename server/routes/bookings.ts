import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { bookings, bookingPayments, trips, insertBookingSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Flight search endpoint
router.post('/flights/search', async (req, res) => {
  try {
    console.log('Flight search request body:', req.body);

    // Handle both camelCase and snake_case parameters due to middleware
    const origin = req.body.origin;
    const destination = req.body.destination;
    const departureDate = req.body.departure_date || req.body.departureDate;
    const returnDate = req.body.return_date || req.body.returnDate;
    const passengers = req.body.passengers || 1;
    const cabin = req.body.cabin || req.body.class || 'economy';

    // Convert date objects to strings if needed
    const formatDate = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string' && date.length > 0) return date;
      if (date instanceof Date && !isNaN(date.getTime())) return date.toISOString().split('T')[0];
      if (typeof date === 'object' && date.$d && date.$d instanceof Date) return date.$d.toISOString().split('T')[0]; // Day.js object
      if (typeof date === 'object' && Object.keys(date).length === 0) return ''; // Empty object
      return '';
    };

    const departureDateStr = formatDate(departureDate);
    const returnDateStr = returnDate ? formatDate(returnDate) : '';

    // Validation
    if (!origin || !destination || !departureDateStr) {
      return res.status(400).json({ 
        message: "Missing required search parameters. Need: origin, destination, departure_date",
        received: { 
          origin, 
          destination, 
          departure_date: departureDateStr, 
          passengers,
          original_departure: departureDate,
          original_return: returnDate
        }
      });
    }

    const searchParams = {
      origin,
      destination,
      departure_date: departureDateStr,
      return_date: returnDateStr,
      passengers,
      cabin
    };

    console.log('Processed search params:', searchParams);

    // Mock flight data for development
    const mockFlights = [
      {
        id: "flight_1",
        airline: "American Airlines",
        flight_number: "AA123",
        origin: origin,
        destination: destination,
        departure_date: departureDateStr,
        departure_time: "08:00",
        arrival_time: "11:30",
        duration: "3h 30m",
        price: 299,
        currency: "USD",
        stops: 0,
        aircraft: "Boeing 737"
      },
      {
        id: "flight_2", 
        airline: "Delta Airlines",
        flight_number: "DL456",
        origin: origin,
        destination: destination,
        departure_date: departureDateStr,
        departure_time: "14:15",
        arrival_time: "17:45",
        duration: "3h 30m",
        price: 349,
        currency: "USD",
        stops: 0,
        aircraft: "Airbus A320"
      }
    ];

    res.json({ flights: mockFlights });
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ message: "Flight search failed" });
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

// Hotel search endpoint
router.post('/hotels/search', async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests, rooms } = req.body;

    if (!location || !checkIn || !checkOut) {
      return res.status(400).json({ 
        message: "Missing required parameters: location, checkIn, checkOut" 
      });
    }

    // Mock hotel data for development
    const mockHotels = [
      {
        id: "hotel_1",
        name: "Grand Plaza Hotel",
        location: location,
        rating: 4.5,
        price_per_night: 150,
        currency: "USD",
        check_in: checkIn,
        check_out: checkOut,
        amenities: ["WiFi", "Pool", "Gym", "Restaurant"],
        image: "https://via.placeholder.com/300x200"
      },
      {
        id: "hotel_2",
        name: "Boutique City Inn",
        location: location,
        rating: 4.2,
        price_per_night: 120,
        currency: "USD",
        check_in: checkIn,
        check_out: checkOut,
        amenities: ["WiFi", "Restaurant", "Room Service"],
        image: "https://via.placeholder.com/300x200"
      }
    ];

    res.json({ hotels: mockHotels });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ message: "Hotel search failed" });
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