import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  Res
} from '@nestjs/common';
import { Request, Response } from 'express';

// Types and interfaces
import { Booking } from '@shared/src/types/bookings';
import { AuthUser } from '../../types/auth-user';

// Services and utilities
import { BookingService } from '../services/booking.service';
import { ResponseFormatter } from '../utils/response-formatter.util';

// Middleware
import { requireAuth, requireOrgContext } from '../middleware/auth.middleware';

// Request DTOs
interface ConfirmationDetails {
  notes?: string;
}

interface CancellationDetails {
  reason?: string;
}

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      organizationFilter?: (orgId: string | null) => boolean;
    }
  }
}

/**
 * Controller for booking endpoints
 * Demonstrates how to use services and repositories through dependency injection
 */
@Controller('bookings')
@UseGuards(requireAuth, requireOrgContext)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService
  ) {}

  /**
   * Get a booking by ID
   */
  @Get(':id')
  @UseGuards(requireAuth, requireOrgContext)
  async getBookingById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const booking = await this.bookingService.getBookingById(id);
      if (!booking) {
        return ResponseFormatter.notFound(res, 'Booking not found');
      }

      if (booking.userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to view this booking');
      }

      return ResponseFormatter.success(res, { booking });
    } catch (error) {
      console.error(`Error getting booking ${id}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching the booking');
    }
  }

  /**
   * Get all bookings
   */
  @Get()
  @UseGuards(requireAuth, requireOrgContext)
  async getAllBookings(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const bookings = await this.bookingService.getAllBookings();
      return ResponseFormatter.success(res, { bookings });
    } catch (error) {
      console.error('Error getting all bookings', error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching bookings');
    }
  }

  /**
   * Get bookings by trip ID
   */
  @Get('trip/:tripId')
  @UseGuards(requireAuth, requireOrgContext)
  async getBookingsByTripId(
    @Param('tripId') tripId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const bookings = await this.bookingService.getBookingsByTripId(tripId);
      return ResponseFormatter.success(res, { bookings });
    } catch (error) {
      console.error(`Error getting bookings for trip ${tripId}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching bookings');
    }
  }

  /**
   * Get bookings by user ID
   */
  @Get('user/:userId')
  @UseGuards(requireAuth, requireOrgContext)
  async getBookingsByUserId(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      if (userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to access these bookings');
      }

      const bookings = await this.bookingService.getBookingsByUserId(userId);
      return ResponseFormatter.success(res, { bookings });
    } catch (error) {
      console.error(`Error getting bookings for user ${userId}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching bookings');
    }
  }

  /**
   * Create a new booking
   */
  @Post()
  @UseGuards(requireAuth, requireOrgContext)
  async createBooking(
    @Body() bookingData: Partial<Booking>,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      // Ensure the booking is associated with the authenticated user
      const bookingDataWithUser = {
        ...bookingData,
        userId: req.user.id,
        organizationId: req.user.organizationId
      } as Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>;

      const booking = await this.bookingService.createBooking(bookingDataWithUser);
      return ResponseFormatter.created(res, { booking });
    } catch (error) {
      console.error('Error creating booking', error);
      return ResponseFormatter.serverError(res, 'An error occurred while creating the booking');
    }
  }

  /**
   * Update a booking
   */
  @Put(':id')
  @UseGuards(requireAuth, requireOrgContext)
  async updateBooking(
    @Param('id') id: string,
    @Body() updateData: Partial<Booking>,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        return ResponseFormatter.notFound(res, 'Booking not found');
      }

      if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to update this booking');
      }

      const booking = await this.bookingService.updateBooking(id, updateData);
      return ResponseFormatter.success(res, { booking });
    } catch (error) {
      console.error(`Error updating booking ${id}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while updating the booking');
    }
  }

  /**
   * Delete a booking
   */
  @Delete(':id')
  @UseGuards(requireAuth, requireOrgContext)
  async deleteBooking(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        return ResponseFormatter.notFound(res, 'Booking not found');
      }

      if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to delete this booking');
      }

      await this.bookingService.deleteBooking(id);
      return ResponseFormatter.noContent(res);
    } catch (error) {
      console.error(`Error deleting booking ${id}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while deleting the booking');
    }
  }

  /**
   * Confirm a booking
   */
  @Put(':id/confirm')
  @UseGuards(requireAuth, requireOrgContext)
  async confirmBooking(
    @Param('id') id: string,
    @Body() confirmationDetails: ConfirmationDetails,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        return ResponseFormatter.notFound(res, 'Booking not found');
      }

      if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to confirm this booking');
      }

      const booking = await this.bookingService.confirmBooking(id, confirmationDetails);
      return ResponseFormatter.success(res, { booking });
    } catch (error) {
      console.error(`Error confirming booking ${id}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while confirming the booking');
    }
  }

  /**
   * Cancel a booking
   */
  @Put(':id/cancel')
  @UseGuards(requireAuth, requireOrgContext)
  async cancelBooking(
    @Param('id') id: string,
    @Body() cancellationDetails: CancellationDetails,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        return ResponseFormatter.notFound(res, 'Booking not found');
      }

      if (existingBooking.userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to cancel this booking');
      }

      const booking = await this.bookingService.cancelBooking(id, cancellationDetails.reason || '');
      return ResponseFormatter.success(res, { booking });
    } catch (error) {
      console.error(`Error cancelling booking ${id}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while cancelling the booking');
    }
  }

  /**
   * Get booking stats for a user
   */
  @Get('stats/user/:userId')
  @UseGuards(requireAuth, requireOrgContext)
  async getBookingStatsByUserId(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      if (userId !== req.user.id && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to view these stats');
      }

      const stats = await this.bookingService.getBookingStatsByUserId(userId);
      
      // If no stats found, return empty stats object
      const finalStats = stats || {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0
      };
      
      return ResponseFormatter.success(res, { stats: finalStats });
    } catch (error) {
      console.error(`Error getting booking stats for user ${userId}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching booking stats');
    }
  }

  /**
   * Get booking stats for an organization
   */
  @Get('stats/org/:orgId')
  @UseGuards(requireAuth, requireOrgContext)
  async getBookingStatsByOrgId(
    @Param('orgId') orgId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Authentication required');
      }

      if (orgId !== req.user.organizationId && !req.user.isAdmin) {
        return ResponseFormatter.forbidden(res, 'Not authorized to view these stats');
      }

      const stats = await this.bookingService.getBookingStatsByOrgId(orgId);
      
      // If no stats found, return empty stats object
      const finalStats = stats || {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0
      };
      
      return ResponseFormatter.success(res, { stats: finalStats });
    } catch (error) {
      console.error(`Error getting booking stats for organization ${orgId}`, error);
      return ResponseFormatter.serverError(res, 'An error occurred while fetching booking stats');
    }
  }
}