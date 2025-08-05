import type { Express } from "express";
import { db } from "../db-connection";
import { trips, bookings, activities } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { duffelProvider } from "../duffelProvider";

export function registerBookingRoutes(app: Express) {
  
  // Get all bookings for a trip
  app.get("/api/trips/:tripId/bookings", requireAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const organizationId = req.user!.organization_id;

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
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Create new booking for a trip
  app.post("/api/trips/:tripId/bookings", requireAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const organizationId = req.user!.organization_id;
      const { type, passengers, ...bookingData } = req.body;

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

      let bookingResult;

      if (type === 'flight') {
        if (!process.env.DUFFEL_API_KEY) {
          return res.status(400).json({ 
            error: "Flight booking requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
          });
        }

        try {
          bookingResult = await duffelProvider.bookFlight({
            bookingToken: bookingData.bookingToken,
            passengers,
            contactInfo: bookingData.contactInfo
          });
        } catch (apiError) {
          console.error("Duffel API error:", apiError);
          return res.status(400).json({ 
            error: "Flight booking failed. Please verify your Duffel API credentials." 
          });
        }
      } else if (type === 'hotel') {
        if (!process.env.DUFFEL_API_KEY) {
          return res.status(400).json({ 
            error: "Hotel booking requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
          });
        }

        try {
          bookingResult = await duffelProvider.bookHotel({
            searchResultId: bookingData.searchResultId,
            rateId: bookingData.rateId,
            guests: passengers,
            email: bookingData.email,
            phone_number: bookingData.phoneNumber,
            special_requests: bookingData.specialRequests
          });
        } catch (apiError) {
          console.error("Duffel API error:", apiError);
          return res.status(400).json({ 
            error: "Hotel booking failed. Please verify your Duffel API credentials." 
          });
        }
      } else {
        return res.status(400).json({ error: "Invalid booking type" });
      }

      // Store booking in database
      const [booking] = await db
        .insert(bookings)
        .values({
          type,
          tripId: tripId,
          userId: req.user!.id,
          organizationId: organizationId,
          provider: 'duffel',
          providerBookingId: bookingResult.bookingReference || bookingResult.confirmationNumber,
          status: bookingResult.status || 'confirmed',
          bookingData: bookingResult.bookingDetails || bookingResult,
          totalAmount: bookingResult.bookingDetails?.total_amount ? Math.round(parseFloat(bookingResult.bookingDetails.total_amount) * 100) : 0,
          currency: bookingResult.bookingDetails?.total_currency || 'USD',
          passengerDetails: { passengers },
          bookingReference: bookingResult.bookingReference || bookingResult.confirmationNumber,
          cancellationPolicy: bookingResult.success && bookingResult.bookingDetails?.cancellation_policy ? bookingResult.bookingDetails.cancellation_policy : null,
          departureDate: bookingData.departureDate ? new Date(bookingData.departureDate) : null,
          returnDate: bookingData.returnDate ? new Date(bookingData.returnDate) : null,
          checkInDate: bookingData.checkInDate ? new Date(bookingData.checkInDate) : null,
          checkOutDate: bookingData.checkOutDate ? new Date(bookingData.checkOutDate) : null,
        })
        .returning();

      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Get booking by ID
  app.get("/api/bookings/:bookingId", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const organizationId = req.user!.organization_id;

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
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  // Update booking
  app.patch("/api/bookings/:bookingId", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const organizationId = req.user!.organization_id;
      const updates = req.body;

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

      const [updatedBooking] = await db
        .update(bookings)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // Cancel booking
  app.delete("/api/bookings/:bookingId", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const organizationId = req.user!.organization_id;

      // Verify booking exists and belongs to organization
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

      // Cancel with provider if needed
      if (booking.provider === 'duffel' && booking.providerBookingId) {
        if (!process.env.DUFFEL_API_KEY) {
          return res.status(400).json({ 
            error: "Cancellation requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
          });
        }

        try {
          // Duffel doesn't have a direct cancel method - would need to implement via their API
          console.log(`Would cancel booking ${booking.providerBookingId} with Duffel API`);
        } catch (apiError) {
          console.error("Provider cancellation error:", apiError);
          // Continue with local cancellation even if provider fails
        }
      }

      // Update booking status to cancelled
      const [cancelledBooking] = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      res.json(cancelledBooking);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Search flights (both endpoints for compatibility)
  app.post("/api/flights/search", requireAuth, async (req, res) => {
    try {
      if (!process.env.DUFFEL_API_KEY) {
        return res.status(400).json({ 
          error: "Flight search requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
        });
      }

      const searchParams = req.body;
      
      try {
        const results = await duffelProvider.searchFlights(searchParams);
        res.json(results);
      } catch (apiError) {
        console.error("Duffel flight search error:", apiError);
        return res.status(400).json({ 
          error: "Flight search failed. Please verify your Duffel API credentials." 
        });
      }
    } catch (error) {
      console.error("Error searching flights:", error);
      res.status(500).json({ error: "Failed to search flights" });
    }
  });

  // Alternative flight search endpoint for compatibility
  app.post("/api/bookings/flights/search", requireAuth, async (req, res) => {
    try {
      if (!process.env.DUFFEL_API_KEY) {
        return res.status(400).json({ 
          error: "Flight search requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
        });
      }

      const requestBody = req.body;
      console.log('Flight search request body:', requestBody);
      
      // Map frontend parameters to DuffelProvider expected format
      const searchParams = {
        departure: requestBody.departure || requestBody.origin,
        destination: requestBody.destination,
        departureDate: requestBody.departureDate || requestBody.departure_date,
        returnDate: requestBody.returnDate || requestBody.return_date,
        passengers: requestBody.passengers || 1,
        class: requestBody.class || 'economy'
      };
      
      console.log(`Duffel flight search for: ${searchParams.departure} → ${searchParams.destination}`);
      console.log('Mapped search params:', searchParams);
      
      try {
        const results = await duffelProvider.searchFlights(searchParams);
        res.json(results);
      } catch (apiError) {
        console.error("Duffel flight search error:", apiError);
        return res.status(400).json({ 
          error: "Flight search failed. Please verify your Duffel API credentials." 
        });
      }
    } catch (error) {
      console.error("Error searching flights:", error);
      res.status(500).json({ error: "Failed to search flights" });
    }
  });

  // Search hotels
  app.post("/api/hotels/search", requireAuth, async (req, res) => {
    try {
      if (!process.env.DUFFEL_API_KEY) {
        return res.status(400).json({ 
          error: "Hotel search requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
        });
      }

      const searchParams = req.body;
      
      try {
        const results = await duffelProvider.searchHotels(searchParams);
        res.json(results);
      } catch (apiError) {
        console.error("Duffel hotel search error:", apiError);
        return res.status(400).json({ 
          error: "Hotel search failed. Please verify your Duffel API credentials." 
        });
      }
    } catch (error) {
      console.error("Error searching hotels:", error);
      res.status(500).json({ error: "Failed to search hotels" });
    }
  });

  // Get trip activities
  app.get("/api/trips/:tripId/activities", requireAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const organizationId = req.user!.organization_id;

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

      const tripActivities = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.trip_id, tripId),
          eq(activities.organization_id, organizationId)
        ))
        .orderBy(activities.date);

      res.json(tripActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Add activity to trip
  app.post("/api/trips/:tripId/activities", requireAuth, async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const organizationId = req.user!.organization_id;
      const activityData = req.body;

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

      const [activity] = await db
        .insert(activities)
        .values({
          ...activityData,
          trip_id: tripId,
          organization_id: organizationId,
          user_id: req.user!.id
        })
        .returning();

      res.json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });
}