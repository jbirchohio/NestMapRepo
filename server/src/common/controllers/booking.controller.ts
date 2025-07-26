import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

// Types and interfaces
import { Booking } from '../../db/schema';

// Services and utilities
import { BookingService } from '../services/booking.service';
import  ResponseHandler  from '../../utils/response';

// Middleware
import { requireAuth, requireOrgContext } from '../middleware/auth.middleware';

// Request DTOs
interface ConfirmationDetails {
  notes?: string;
}


/**
 * Controller for booking endpoints
 */
export class BookingController {
  public router: express.Router;
  
  constructor(private readonly bookingService: BookingService) {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Apply auth and org context middleware to all routes
    this.router.use(requireAuth);
    this.router.use(requireOrgContext);

    // Register routes with proper binding to maintain 'this' context
    this.router.get('/', this.getAllBookings.bind(this));
    this.router.get('/:id', this.getBookingById.bind(this));
    this.router.get('/trip/:tripId', this.getBookingsByTripId.bind(this));
    this.router.get('/user/:userId', this.getBookingsByUserId.bind(this));
    this.router.post('/', this.createBooking.bind(this));
    this.router.put('/:id', this.updateBooking.bind(this));
    this.router.delete('/:id', this.deleteBooking.bind(this));
    this.router.post('/:id/confirm', this.confirmBooking.bind(this));
    this.router.post('/:id/cancel', this.cancelBooking.bind(this));
    this.router.get('/statistics', this.getBookingStatistics.bind(this));
  }

  /**
   * Get a booking by ID
   */
  private getBookingById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { id } = req.params;
    const booking = await this.bookingService.getBookingById(id);
    
    if (!booking) {
      ResponseHandler.notFound(res, 'Booking not found');
      return;
    }

    // Check if user has access to this booking
    if (booking.userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to view this booking');
      return;
    }

    ResponseHandler.success(res, { booking });
  });

  /**
   * Get all bookings
   */
  private getAllBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const bookings = await this.bookingService.getAllBookings();
    ResponseHandler.success(res, { bookings });
  });

  /**
   * Get bookings by trip ID
   */
  private getBookingsByTripId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { tripId } = req.params;
    const bookings = await this.bookingService.getBookingsByTripId(tripId);
    ResponseHandler.success(res, { bookings });
  });

  /**
   * Get bookings by user ID
   */
  private getBookingsByUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { userId } = req.params;
    
    if (userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to access these bookings');
      return;
    }

    const bookings = await this.bookingService.getBookingsByUserId(userId);
    ResponseHandler.success(res, { bookings });
  });

  /**
   * Create a new booking
   */
  private createBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const bookingData = req.body as Partial<Booking>;
    
    // Ensure the booking is associated with the authenticated user
    const bookingDataWithUser: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      tripId: bookingData.tripId || '',
      userId: req.user.id,
      organizationId: req.user.organizationId || null,
      type: (bookingData.type as 'flight' | 'hotel' | 'car' | 'train' | 'activity' | 'other') || 'other',
      provider: bookingData.provider || 'manual',
      providerBookingId: bookingData.providerBookingId || null,
      status: (bookingData.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed') || 'pending',
      bookingData: bookingData.bookingData || {},
      totalAmount: bookingData.totalAmount || null,
      currency: bookingData.currency || 'USD',
      passengerDetails: bookingData.passengerDetails || {},
      bookingReference: bookingData.bookingReference || null,
      cancellationPolicy: bookingData.cancellationPolicy || null,
      departureDate: bookingData.departureDate || null,
      returnDate: bookingData.returnDate || null,
      checkInDate: bookingData.checkInDate || null,
      checkOutDate: bookingData.checkOutDate || null
    };

    const booking = await this.bookingService.createBooking(bookingDataWithUser);
    ResponseHandler.created(res, { booking });
  });

  /**
   * Update a booking
   */
  private updateBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { id } = req.params;
    const updateData = req.body as Partial<Booking>;

    const existingBooking = await this.bookingService.getBookingById(id);
    if (!existingBooking) {
      ResponseHandler.notFound(res, 'Booking not found');
      return;
    }

    if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to update this booking');
      return;
    }

    const booking = await this.bookingService.updateBooking(id, updateData as Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>);
    ResponseHandler.success(res, { booking });
  });

  /**
   * Delete a booking
   */
  private deleteBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { id } = req.params;
    const existingBooking = await this.bookingService.getBookingById(id);
    
    if (!existingBooking) {
      ResponseHandler.notFound(res, 'Booking not found');
      return;
    }

    if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to delete this booking');
      return;
    }

    await this.bookingService.deleteBooking(id);
    ResponseHandler.noContent(res);
  });

  /**
   * Confirm a booking
   */
  private confirmBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { id } = req.params;
    const confirmationDetails = req.body as ConfirmationDetails;
    
    const existingBooking = await this.bookingService.getBookingById(id);
    if (!existingBooking) {
      ResponseHandler.notFound(res, 'Booking not found');
      return;
    }

    if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to confirm this booking');
      return;
    }

    const booking = await this.bookingService.confirmBooking(id, confirmationDetails);
    ResponseHandler.success(res, { booking });
  });

  /**
   * Cancel a booking
   */
  private cancelBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const existingBooking = await this.bookingService.getBookingById(id);
    if (!existingBooking) {
      ResponseHandler.notFound(res, 'Booking not found');
      return;
    }

    if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
      ResponseHandler.forbidden(res, 'Not authorized to cancel this booking');
      return;
    }

    const booking = await this.bookingService.cancelBooking(id, reason || '');
    if (booking) {
      ResponseHandler.success(res, { booking });
    } else {
      ResponseHandler.error(res, 'Failed to cancel booking');
    }
  });

  /**
   * Get booking statistics
   */
  private getBookingStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const { userId, orgId } = req.query;
    
    if (userId) {
      const stats = await this.bookingService.getBookingStatsByUserId(userId as string);
      ResponseHandler.success(res, { stats });
    } else if (orgId) {
      const stats = await this.bookingService.getBookingStatsByOrgId(orgId as string);
      ResponseHandler.success(res, { stats });
    } else {
      ResponseHandler.badRequest(res, 'Either userId or orgId query parameter is required');
    }
  });



  /**
   * Get the router instance
   */
  public getRouter(): express.Router {
    return this.router;
  }
}

