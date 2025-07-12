import { Controller, Get, Post, Put, Body, Param, Delete, Inject, Logger } from '@nestjs/common.js';
import { Request, Response, NextFunction } from 'express.js';
import { BookingService } from '../services/booking.service.js';
import { Booking } from '../../../db/bookingSchema.js.js';
import { ResponseFormatter } from '../utils/response-formatter.util.js';
import { withStandardizedErrorHandling } from '../middleware/standardized-error-handler.middleware.js';
import { requireAuth, requireOrgContext, enforceOrganizationSecurity } from '../middleware/auth.middleware.js';
import { validateBookingRequest } from '../middleware/validation.middleware.js';
import { BookingConfirmationDetails } from '../interfaces/booking.interfaces.js';
import { ErrorService } from '../services/error.service.js';
import { trips, activities, calendarIntegrations } from '@shared/schema.js';

/**
 * Controller for booking endpoints
 * Demonstrates how to use services and repositories through dependency injection
 */
@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    @Inject('BookingService')
    private readonly bookingService: BookingService,
    private readonly errorService: ErrorService,
  ) {}

  /**
   * Get a booking by ID
   */
  @Get(':id')
  getBookingById(@Param('id') id: string, @Inject('REQUEST') req: Request, @Inject('RESPONSE') res: Response, @Inject('NEXT') next: NextFunction) {
    return [
      requireAuth(this.logger),
      asyncHandler(async (req: Request, res: Response) => {
        this.logger.log(`GET /bookings/${id}`);
        const booking = await this.bookingService.getBookingById(id);
        
        if (!booking) {
          this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        
        return ResponseFormatter.success(res, booking, 'Booking retrieved successfully');
      }, this.logger)
    ];
  }

  /**
   * Get all bookings for a user
   */
  @Get('user/:userId')
  getBookingsByUserId(@Param('userId') userId: string, @Inject('REQUEST') req: Request, @Inject('RESPONSE') res: Response, @Inject('NEXT') next: NextFunction) {
    return [
      requireAuth(this.logger),
      asyncHandler(async (req: Request, res: Response) => {
        this.logger.log(`GET /bookings/user/${userId}`);
        const bookings = await this.bookingService.getBookingsByUserId(userId);
        return ResponseFormatter.success(res, bookings, 'User bookings retrieved successfully');
      }, this.logger)
    ];
  }

  /**
   * Get all bookings for a trip
   */
  @Get('trip/:tripId')
  getBookingsByTripId(@Param('tripId') tripId: string, @Inject('REQUEST') req: Request, @Inject('RESPONSE') res: Response, @Inject('NEXT') next: NextFunction) {
    return [
      requireAuth(this.logger),
      asyncHandler(async (req: Request, res: Response) => {
        this.logger.log(`GET /bookings/trip/${tripId}`);
        const bookings = await this.bookingService.getBookingsByTripId(tripId);
        return ResponseFormatter.success(res, bookings, 'Trip bookings retrieved successfully');
      }, this.logger)
    ];
  }

  /**
   * Create a new booking
   */
  @Post()
  createBooking(@Body() bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>, @Inject('REQUEST') req: Request, @Inject('RESPONSE') res: Response, @Inject('NEXT') next: NextFunction) {
    return [
      requireAuth(this.logger),
      requireOrgContext(this.logger),
      asyncHandler(async (req: Request, res: Response) => {
        this.logger.log('POST /bookings');
        const booking = await this.bookingService.createBooking(bookingData);
        return ResponseFormatter.created(res, booking, 'Booking created successfully');
      }, this.logger)
    ];
  }

  /**
   * Update a booking
   */
  @Put(':id')
  async updateBooking(
    @Param('id') id: string,
    @Body() bookingData: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Booking> {
    this.logger.log(`PUT /bookings/${id}`);
    const booking = await this.bookingService.updateBooking(id, bookingData);
    
    if (!booking) {
      this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
    }
    
    return booking;
  }

  /**
   * Delete a booking
   */
  @Delete(':id')
  async deleteBooking(@Param('id') id: string): Promise<{ success: boolean }> {
    this.logger.log(`DELETE /bookings/${id}`);
    const success = await this.bookingService.deleteBooking(id);
    
    if (!success) {
      this.errorService.throwNotFoundError('Booking not found or could not be deleted', { bookingId: id });
    }
    
    return { success };
  }

  /**
   * Confirm a booking
   */
  @Put(':id/confirm')
  confirmBooking(
    @Param('id') id: string,
    @Body() confirmationDetails: BookingConfirmationDetails,
    @Inject('REQUEST') req: Request,
    @Inject('RESPONSE') res: Response,
    @Inject('NEXT') next: NextFunction
  ) {
    return [
      requireAuth(this.logger),
      asyncHandler(async (req: Request, res: Response) => {
        this.logger.log(`PUT /bookings/${id}/confirm`);
        const booking = await this.bookingService.confirmBooking(id, confirmationDetails);
        
        if (!booking) {
          this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        
        return ResponseFormatter.success(res, booking, 'Booking confirmed successfully');
      }, this.logger)
    ];
  }

  /**
   * Cancel a booking
   */
  @Put(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') cancellationReason: string
  ): Promise<Booking> {
    this.logger.log(`PUT /bookings/${id}/cancel`);
    const booking = await this.bookingService.cancelBooking(id, cancellationReason);
    
    if (!booking) {
      this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
    }
    
    return booking;
  }

  /**
   * Get booking statistics for a user
   */
  @Get('stats/user/:userId')
  async getBookingStatsByUserId(@Param('userId') userId: string): Promise<any> {
    this.logger.log(`GET /bookings/stats/user/${userId}`);
    return this.bookingService.getBookingStatsByUserId(userId);
  }

  /**
   * Get booking statistics for an organization
   */
  @Get('stats/organization/:orgId')
  async getBookingStatsByOrgId(@Param('orgId') orgId: string): Promise<any> {
    this.logger.log(`GET /bookings/stats/organization/${orgId}`);
    return this.bookingService.getBookingStatsByOrgId(orgId);
  }
}
