import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { Router } from 'express';
import { db } from "../db.js";
import { trips } from "../db/schema.js";
import { bookings, type Booking, bookingStatusEnum, bookingTypeEnum } from "../db/bookingSchema.js";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import { duffelProvider } from "../duffelProvider.js";
import { asyncHandler } from '../utils/routeHelpers.js';

// Simple type for database operations
type DBQuery = {
  findFirst: (options: { where: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any>;
  findMany: (options: { where: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, orderBy?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any[]>;
  update?: (options: { where: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */; data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any[]>;
  insert?: (options: { values: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any[]>;
};

type DBTables = {
  trips: DBQuery;
  bookings: DBQuery & {
    update: (options: { where: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */; data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any[]>;
    insert: (options: { values: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ }) => Promise<any[]>;
  };
};

type ExtendedDB = {
  query: DBTables;
};

// Cast the db object to our extended type
const dbWithTypes = db as unknown as ExtendedDB;

// Delete a booking (soft delete)
const deleteBookingHandler = async (req: AuthenticatedRequest<{ bookingId: string }>, res: Response) => {
    const { bookingId } = req.params;
    const organizationId = req.user.organizationId;
    
    try {
        // First get the booking
        const existingBooking = await dbWithTypes.query.bookings.findFirst({
            where: { id: bookingId }
        });

        if (!existingBooking) {
            res.status(404).json({ error: "Booking not found" });
            return;
        }

        // Verify the booking's trip belongs to the organization
        const trip = await dbWithTypes.query.trips.findFirst({
            where: {
                id: existingBooking.tripId,
                organizationId: organizationId
            }
        });

        if (!trip) {
            res.status(404).json({ error: "Booking not found or access denied" });
            return;
        }

        // Soft delete by marking as cancelled
        const updatedBookings = await dbWithTypes.query.bookings.update({
            where: { id: bookingId },
            data: { 
                status: 'cancelled',
                cancelledAt: new Date(),
                updatedAt: new Date()
            }
        });

        if (updatedBookings.length === 0) {
            throw new Error('Failed to delete booking');
        }

        res.json({ success: true, booking: updatedBookings[0] });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
};

// Type for Drizzle query builder operators
type DrizzleOperators = {
    eq: <T>(column: T, value: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => SQL<unknown>;
    and: (...conditions: SQL<unknown>[]) => SQL<unknown>;
    sql: typeof sql;
    desc: (column: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => SQL<unknown>;
};

// Type for Drizzle query builder with SQL template literal support
type DrizzleSQL = typeof sql;

type DB = typeof db;
type BookingWithRelations = InferSelectModel<typeof bookings>;

// Define AuthUser type locally since the module is missing
type AuthUser = {
    id: string;
    email: string;
    organizationId: string;
    role?: string;
};

// Extend Express types to include our custom properties
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            email: string;
            organizationId: string;
            role?: string;
        } | null;
        organizationFilter: (orgId: string | null) => boolean;
    }
}

// Type for authenticated request with specific params
type AuthenticatedRequest<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> = Request<Params, ResBody, ReqBody, ReqQuery> & {
    user: NonNullable<Express.Request['user']>;
    organizationId: string;
};

// Route helper function with proper typing
function route<Params = any, ResBody = any, ReqBody = any>(
    handler: (req: AuthenticatedRequest<Params, ResBody, ReqBody>, res: Response<ResBody>) => Promise<void>
): RequestHandler<Params, ResBody, ReqBody> {
    return asyncHandler(async (req, res, next) => {
        try {
            await handler(req as AuthenticatedRequest<Params, ResBody, ReqBody>, res);
        } catch (error) {
            next(error);
        }
    });
}

// Type for route handler with authenticated request
type AuthenticatedHandler<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> = (
    req: AuthenticatedRequest<Params, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
) => Promise<void>;

// Type for booking creation
type CreateBookingInput = Omit<InferInsertModel<typeof bookings>, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: InferSelectModel<typeof bookings>['status'];
};

// Get all bookings for a trip
const getBookingsHandler = async (req: AuthenticatedRequest<{ tripId: string }>, res: Response) => {
    const { tripId } = req.params;
    const organizationId = req.user.organizationId;
    
    try {
        // Verify trip belongs to user's organization
        const trip = await dbWithTypes.query.trips.findFirst({
            where: {
                id: tripId,
                organizationId: organizationId
            }
        });

        if (!trip) {
            res.status(404).json({ error: "Trip not found or access denied" });
            return;
        }
        
        // Get bookings for this trip
        const tripBookings = await dbWithTypes.query.bookings.findMany({
            where: { tripId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tripBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

// Create a new booking
const createBookingHandler = async (req: AuthenticatedRequest<{ tripId: string }>, res: Response) => {
    const { tripId } = req.params;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    const bookingData = req.body as Omit<InferInsertModel<typeof bookings>, 'id' | 'createdAt' | 'updatedAt'>;

    try {
        // Verify trip exists and belongs to organization
        const trip = await dbWithTypes.query.trips.findFirst({
            where: {
                id: tripId,
                organizationId: organizationId
            }
        });

        if (!trip) {
            res.status(404).json({ error: 'Trip not found or access denied' });
            return;
        }

        // Prepare booking data with proper types
        const bookingValues = {
            ...bookingData,
            id: undefined, // Let DB generate the ID
            tripId,
            userId,
            status: 'confirmed',
            startDate: bookingData.startDate ? new Date(bookingData.startDate) : undefined,
            endDate: bookingData.endDate ? new Date(bookingData.endDate) : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: bookingData.metadata || {}
        } as const;

        // Store booking in database
        const booking = await dbWithTypes.query.bookings.insert({
            values: bookingValues
        });

        res.status(201).json(booking[0]);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
};

// Get booking by ID
const getBookingByIdHandler = async (req: AuthenticatedRequest<{ bookingId: string }>, res: Response) => {
    const { bookingId } = req.params;
    const organizationId = req.user.organizationId;
    
    try {
        // First get the booking
        const booking = await dbWithTypes.query.bookings.findFirst({
            where: { id: bookingId }
        });

        if (!booking) {
            res.status(404).json({ error: "Booking not found" });
            return;
        }

        // Verify the booking's trip belongs to the organization
        const trip = await dbWithTypes.query.trips.findFirst({
            where: {
                id: booking.tripId,
                organizationId: organizationId
            }
        });

        if (!trip) {
            res.status(404).json({ error: "Booking not found or access denied" });
            return;
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
};

// Update a booking
const updateBookingHandler = async (req: AuthenticatedRequest<{ bookingId: string }>, res: Response) => {
    const { bookingId } = req.params;
    const organizationId = req.user.organizationId;
    const updates = req.body as Partial<InferSelectModel<typeof bookings>>;
    
    try {
        // First get the booking
        const existingBooking = await dbWithTypes.query.bookings.findFirst({
            where: { id: bookingId }
        });

        if (!existingBooking) {
            res.status(404).json({ error: "Booking not found" });
            return;
        }

        // Verify the booking's trip belongs to the organization
        const trip = await dbWithTypes.query.trips.findFirst({
            where: {
                id: existingBooking.tripId,
                organizationId: organizationId
            }
        });

        if (!trip) {
            res.status(404).json({ error: "Booking not found or access denied" });
            return;
        }

        // Prepare update data
        const updateData: Record<string, any> = {
            ...updates,
            updatedAt: new Date()
        };

        // Handle status transitions
        if (updates.status === 'cancelled' && existingBooking.status !== 'cancelled') {
            updateData.cancelledAt = new Date();
        } else if (updates.status === 'confirmed' && existingBooking.status !== 'confirmed') {
            updateData.confirmedAt = new Date();
        }

        // Remove undefined values to avoid overwriting with null
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        // Perform the update
        const updatedBookings = await dbWithTypes.query.bookings.update({
            where: { id: bookingId },
            data: updateData
        });

        if (updatedBookings.length === 0) {
            throw new Error('Failed to update booking');
        }

        res.json(updatedBookings[0]);
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
};

export function registerBookingRoutes(app: Express) {
    // Create a router for trip-related booking routes
    const bookingRouter = Router();
    
    // Apply middleware to the booking router
    bookingRouter.use(validateJWT);
    bookingRouter.use(injectOrganizationContext);
    bookingRouter.use(validateOrganizationAccess);
    
    // Register route handlers with proper types
    bookingRouter.get("/:tripId/bookings", (req, res, next) => getBookingsHandler(req as any, res).catch(next));
    bookingRouter.post("/:tripId/bookings", (req, res, next) => createBookingHandler(req as any, res).catch(next));
    bookingRouter.get("/bookings/:bookingId", (req, res, next) => getBookingByIdHandler(req as any, res).catch(next));
    bookingRouter.put("/bookings/:bookingId", (req, res, next) => updateBookingHandler(req as any, res).catch(next));
    bookingRouter.delete("/bookings/:bookingId", (req, res, next) => deleteBookingHandler(req as any, res).catch(next));
    
    // Mount the booking router under /api/trips
    app.use('/api/trips', bookingRouter);
}
