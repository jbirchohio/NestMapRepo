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
  Res,
  Logger,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { Request, Response } from 'express';

// Types and interfaces
import { Booking } from '@shared/types/bookings';
import { AuthUser } from '../../types/auth-user';

// Services and utilities
import { BookingService } from '../services/booking.service';
import { ResponseFormatter } from '../utils/response-formatter.util';

// Middleware
import { requireAuth, requireOrgContext } from '../middleware/auth.middleware';

// Request DTOs will be defined here when needed

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
  private readonly logger = new Logger(BookingController.name);

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
        throw new ForbiddenException('Authentication required');
      }

      const booking = await this.bookingService.getBookingById(id);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      
      if (booking.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to view this booking');
      }
      
      ResponseFormatter.success(res, { booking });
    } catch (error) {
      this.logger.error(`Error getting booking ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all bookings
   */
  @Get()
  @UseGuards(requireAuth, requireOrgContext)
  async getAllBookings(@Req() req: Request, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Authentication required');
      }
      const bookings = await this.bookingService.getBookingsByUserId(req.user.id);
      ResponseFormatter.success(res, { bookings });
    } catch (error) {
      this.logger.error('Error getting all bookings', error);
      throw error;
    }
  }

  /**
   * Get all bookings for a trip
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
        throw new ForbiddenException('Authentication required');
      }
      
      const bookings = await this.bookingService.getBookingsByTripId(tripId);
      // Filter bookings to only include those from the user's organization
      const orgBookings = bookings.filter(booking => 
        booking.organizationId === req.user.organizationId
      );
      
      ResponseFormatter.success(res, { bookings: orgBookings });
    } catch (error) {
      this.logger.error(`Error getting bookings for trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Get all bookings for a user
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
        throw new ForbiddenException('Authentication required');
      }
      
      // Verify the user has access to these bookings
      if (userId !== req.user.id) {
        throw new ForbiddenException('Not authorized to access these bookings');
      }
      
      const bookings = await this.bookingService.getBookingsByUserId(userId);
      ResponseFormatter.success(res, { bookings });
    } catch (error) {
      this.logger.error(`Error getting bookings for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Create a new booking
   */
  @Post()
  @UseGuards(requireAuth, requireOrgContext)
  async createBooking(
    @Body() bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'organizationId' | 'status'>,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Authentication required');
      }
      
      const booking = await this.bookingService.createBooking({
        ...bookingData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
        status: 'pending' as const
      });
      
      ResponseFormatter.created(res, { booking });
    } catch (error) {
      this.logger.error('Error creating booking', error);
      throw error;
    }
  }

  /**
   * Update a booking
   */
  @Put(':id')
  @UseGuards(requireAuth, requireOrgContext)
  async updateBooking(
    @Param('id') id: string,
    @Body() updateData: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'organizationId'>>,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Authentication required');
      }
      
      // First get the booking to verify ownership
      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        throw new NotFoundException('Booking not found');
      }
      
      if (existingBooking.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to update this booking');
      }
      
      const updatedBooking = await this.bookingService.updateBooking(id, updateData);
      ResponseFormatter.success(res, { booking: updatedBooking });
    } catch (error) {
      this.logger.error(`Error updating booking ${id}`, error);
      throw error;
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
        throw new ForbiddenException('Authentication required');
      }
      
      // First get the booking to verify ownership
      const booking = await this.bookingService.getBookingById(id);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      
      if (booking.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to delete this booking');
      }
      
      await this.bookingService.deleteBooking(id);
      ResponseFormatter.success(res, { success: true });
    } catch (error) {
      this.logger.error(`Error deleting booking ${id}`, error);
      throw error;
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
        throw new ForbiddenException('Authentication required');
      }

      // First get the booking to verify ownership
      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        throw new NotFoundException('Booking not found');
      }
      
      if (existingBooking.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to confirm this booking');
      }
      
      const booking = await this.bookingService.updateBooking(id, { 
        status: 'confirmed',
        ...confirmationDetails 
      });
      
ResponseFormatter.success(res, { booking });
    } catch (error) {
      this.logger.error(`Error confirming booking ${id}`, error);
      throw error;
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
        throw new ForbiddenException('Authentication required');
      }

      // First get the booking to verify ownership
      const existingBooking = await this.bookingService.getBookingById(id);
      if (!existingBooking) {
        throw new NotFoundException('Booking not found');
      }
      
      if (existingBooking.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to cancel this booking');
      }
      
      const booking = await this.bookingService.updateBooking(id, { 
        status: 'cancelled',
        cancellationReason: cancellationDetails.reason,
        cancelledAt: new Date().toISOString()
      });
      
      ResponseFormatter.success(res, { booking });
    } catch (error) {
      this.logger.error(`Error cancelling booking ${id}`, error);
      throw error;
    }
  }

  /**
   * Get booking statistics for a user
   */
  @Get('stats/user/:userId')
  @UseGuards(requireAuth, requireOrgContext)
  async getUserBookingStats(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Authentication required');
      }

      // Verify the user has access to these stats
      if (userId !== req.user.id) {
        throw new ForbiddenException('Not authorized to view these stats');
      }
      
      // This would be implemented in the service layer
      const stats = {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0
      };
      
      return ResponseFormatter.success(res, { stats });
    } catch (error) {
      this.logger.error(`Error getting booking stats for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get booking statistics for an organization
   */
  @Get('stats/organization/:orgId')
  @UseGuards(requireAuth, requireOrgContext)
  async getOrganizationBookingStats(
    @Param('orgId') orgId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      if (!req.user) {
        throw new ForbiddenException('Authentication required');
      }

      // Verify the requesting user has access to this organization
      if (orgId !== req.user.organizationId) {
        throw new ForbiddenException('Not authorized to view these stats');
      }
      
      // This would be implemented in the service layer
      const stats = {
        total: 0,
        byStatus: {
          confirmed: 0,
          pending: 0,
          cancelled: 0
        },
        byType: {},
        recentBookings: []
      };
      
      return ResponseFormatter.success(res, { stats });
    } catch (error) {
      this.logger.error(`Error getting booking stats for organization ${orgId}`, error);
      throw error;
    }
  }
}
