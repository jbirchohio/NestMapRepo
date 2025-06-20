import { Express, Router, Request, Response, NextFunction, RequestHandler, RequestHandlerParams } from "express";
import { db } from "../db.js";
import { trips, bookings, activities } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import { duffelProvider } from "../duffelProvider.js";
import { AuthUser } from '../src/types/auth-user';
import { asyncHandler } from '../utils/routeHelpers.js';

// Extend Express types to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser & { organizationId: string; role?: string };
      organizationId: string;
      organizationFilter: (orgId: string | null) => boolean;
    }
  }
}

// Type for authenticated request with specific params
type AuthenticatedRequest<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> = 
  Request<Params, ResBody, ReqBody, ReqQuery> & {
    user: NonNullable<Express.Request['user']>;
    organizationId: string;
  };

// Type for route handler with authenticated request
type AuthenticatedHandler<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> = (
  req: AuthenticatedRequest<Params, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void> | void;

export function registerBookingRoutes(app: Express) {
  // Create a router for trip-related booking routes with proper typing
  const bookingRouter = Router();
  
  // Apply middleware to the booking router
  bookingRouter.use(validateJWT);
  bookingRouter.use(injectOrganizationContext);
  bookingRouter.use(validateOrganizationAccess);
  
  // Mount the booking router under /api/trips
  app.use('/api/trips', bookingRouter);
  
  // Get all bookings for a trip
  bookingRouter.get(
    "/:tripId/bookings",
    route<{ tripId: string }>(async (req, res) => {
      const tripId = req.params.tripId;
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
    })
  );
    try {
      const tripId = req.params.tripId;
      const organizationId = req.user!.organizationId;

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
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Create new booking for a trip
  bookingRouter.post(
    "/:tripId/bookings",
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const tripId = req.params.tripId;
      const organizationId = req.user.organizationId;
      const { type, passengers, ...bookingData } = req.body;

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

      let bookingResult;

      if (type === 'flight') {
        if (!process.env.DUFFEL_API_KEY) {
          return res.status(400).json({ 
            error: "Flight booking requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
          });
        }

        try {
          bookingResult = await duffelProvider.createBooking({
            type,
            passengers,
            ...bookingData
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
          bookingResult = await duffelProvider.createHotelBooking({
            type,
            passengers,
            ...bookingData
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
          providerBookingId: bookingResult.id,
          status: bookingResult.status || 'confirmed',
          bookingData: bookingResult,
          totalAmount: bookingResult.total_amount ? Math.round(bookingResult.total_amount * 100) : 0,
          currency: bookingResult.total_currency || 'USD',
          passengerDetails: { passengers },
          bookingReference: bookingResult.id,
          cancellationPolicy: bookingResult.cancellation_policy,
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
  bookingRouter.get(
    "/bookings/:bookingId",
    route<{ bookingId: string }>(async (req, res) => {
      const bookingId = req.params.bookingId;
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
    })
  );

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
  bookingRouter.patch(
    "/bookings/:bookingId",
    route<{ bookingId: string }>(async (req, res) => {
      const bookingId = req.params.bookingId;
      const organizationId = req.user.organizationId;
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
    })
  );

  // Cancel booking
  bookingRouter.delete(
    "/bookings/:bookingId",
    route<{ bookingId: string }>(async (req, res) => {
      const bookingId = req.params.bookingId;
      const organizationId = req.user.organizationId;

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
          await duffelProvider.cancelBooking(booking.providerBookingId);
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

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    res.json(updatedBooking);
  })
);

// Cancel booking
bookingRouter.delete(
  "/bookings/:bookingId",
  route<{ bookingId: string }>(async (req, res) => {
    const bookingId = req.params.bookingId;
    const organizationId = req.user.organizationId;

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
  bookingRouter.post(
    "/hotels/search",
    route<any, any, any, any>(async (req, res) => {
      if (!process.env.DUFFEL_API_KEY) {
        return res.status(400).json({ 
          error: "Hotel search requires Duffel API credentials. Please provide DUFFEL_API_KEY." 
        });
      }

      const searchParams = req.body;
      const results = await duffelProvider.searchHotels(searchParams);
      res.json(results);
    })
  );

  // Get trip activities
  bookingRouter.get(
    "/:tripId/activities",
    route<{ tripId: string }>(async (req, res) => {
      const tripId = req.params.tripId;
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

      const tripActivities = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.tripId, tripId),
          eq(activities.organizationId, organizationId)
        ))
        .orderBy(activities.startDate);

      res.json(tripActivities);
    })
  );

  // Create new booking for a trip
  bookingRouter.post(
    "/:tripId/bookings",
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const tripId = req.params.tripId;
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

      // Verify trip exists and belongs to user's organization
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

      // Create booking
      const bookingData = {
        ...req.body,
        tripId,
        userId,
        organizationId,
        status: 'pending', // Default status
      };

      const [newBooking] = await db
        .insert(bookings)
        .values(bookingData)
        .returning();

      res.status(201).json(newBooking);
    })
  );

  // Add activity to trip
  bookingRouter.post(
    "/:tripId/activities",
    route<{ tripId: string }>(async (req, res) => {
      const tripId = req.params.tripId;
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

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

      const [activity] = await db
        .insert(activities)
        .values({
          ...activityData,
          tripId,
          organizationId,
          userId: req.user!.id
        })
        .returning();

      res.json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });
} 