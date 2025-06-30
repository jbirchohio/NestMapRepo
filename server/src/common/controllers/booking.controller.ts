import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  UseGuards, 
  Req, 
  HttpStatus, 
  Logger, 
  Patch, 
  Query,
  HttpException,
  HttpCode,
  ExecutionContext,
  Inject,
  LoggerService
} from '@nestjs/common';
import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiBody, 
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { plainToClass } from 'class-transformer';

import { BookingService } from '../services/booking.service.js';
import { ErrorService } from '../services/error.service.js';
import { 
  createBookingSchema,
  updateBookingSchema,
  type CreateBookingDto, 
  type UpdateBookingDto, 
  type BookingSearchParams,
  BookingResponse,
  type BookingStatus,
  type BookingType,
  type CancelBookingDto,
  type BaseBooking,
  baseBookingSchema
} from './dto/booking.dto.js';
import { BaseController } from './base.controller.js';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface.js';

/**
 * Controller for managing bookings
 */
@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingController extends BaseController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly errorService: ErrorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) 
    protected readonly logger: LoggerService
  ) {
    super('BookingController');
  }
  /**
   * Get a booking by ID
   * @param id Booking ID
   * @returns The booking details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiOkResponse({ 
    description: 'Booking found',
    type: () => BookingResponse
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const organizationId = req.user.organizationId;
      const booking = await this.bookingService.findOne(id);
      
      if (!booking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      
      if (booking.organizationId !== organizationId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      return this.success(booking, 'Booking retrieved successfully');
    } catch (error) {
      this.handleError(error, 'findOne');
    }
  }
  /**
   * Get all bookings for the current user
   * @returns List of user's bookings
   */
  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'Returns all bookings' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'confirmed', 'cancelled', 'completed'] })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getBookings(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string
  ) {
    try {
      const organizationId = req.user.organization_id;
      const params: BookingSearchParams = { 
        organizationId,
        status: status as any,
        type: type as any,
        search
      };
      const bookings = await this.bookingService.findAll(params);
      return this.success(bookings, 'Bookings retrieved successfully');
    } catch (error) {
      this.handleError(error, 'getBookings');
    }
  }
  /**
   * Get all bookings for a trip
   * @param tripId Trip ID
   * @returns List of bookings for the trip
   */
  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Get all bookings for a trip' })
  @ApiParam({ name: 'tripId', description: 'ID of the trip' })
  @ApiOkResponse({ 
    description: 'Returns bookings for the trip',
    type: () => [BookingResponse]
  })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findByTripId(
    @Param('tripId') tripId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const organizationId = req.user.organization_id;
      const params: BookingSearchParams = {
        organizationId,
        tripId
      };
      
      const bookings = await this.bookingService.findAll(params);
      return this.success(bookings, 'Bookings retrieved successfully');
    } catch (error) {
      this.handleError(error, 'findByTripId');
    }
  }
  /**
   * Create a new booking
   * @param createBookingDto Booking data
   * @returns The created booking
   */
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['hotel', 'flight', 'car', 'train', 'activity', 'other'] },
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'], nullable: true },
        bookingDate: { type: 'string', format: 'date-time', nullable: true },
        checkInDate: { type: 'string', format: 'date-time', nullable: true },
        checkOutDate: { type: 'string', format: 'date-time', nullable: true },
        amount: { type: 'number', nullable: true },
        currency: { type: 'string', nullable: true },
        provider: { type: 'string', nullable: true },
        providerBookingId: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
        tripId: { type: 'string', format: 'uuid', nullable: true },
        activityId: { type: 'string', format: 'uuid', nullable: true },
        metadata: { type: 'object', nullable: true },
        startDate: { type: 'string', format: 'date-time', nullable: true },
        endDate: { type: 'string', format: 'date-time', nullable: true }
      },
      required: ['type', 'userId', 'organizationId']
    }
  })
  @ApiCreatedResponse({ 
    description: 'Booking created successfully',
    type: () => BookingResponse
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      
      // Create a properly typed booking data object with all required fields
      const bookingData: CreateBookingDto = {
        type: createBookingDto.type,
        status: (createBookingDto.status as BookingStatus) || 'pending',
        bookingDate: new Date(),
        reference: `BOOK-${Date.now()}`,
        userId,
        organizationId,
        // Required fields with defaults if needed
        amount: createBookingDto.amount || 0, // Default to 0 if not provided
        provider: createBookingDto.provider || 'unknown', // Default provider if not provided
        // Optional fields
        ...(createBookingDto.currency && { currency: createBookingDto.currency }),
        ...(createBookingDto.providerBookingId && { providerBookingId: createBookingDto.providerBookingId }),
        ...(createBookingDto.notes && { notes: createBookingDto.notes }),
        ...(createBookingDto.tripId && { tripId: createBookingDto.tripId }),
        ...(createBookingDto.activityId && { activityId: createBookingDto.activityId }),
        ...(createBookingDto.metadata && { metadata: createBookingDto.metadata }),
        ...(createBookingDto.checkInDate && { checkInDate: createBookingDto.checkInDate }),
        ...(createBookingDto.checkOutDate && { checkOutDate: createBookingDto.checkOutDate }),
        ...(createBookingDto.startDate && { startDate: createBookingDto.startDate }),
        ...(createBookingDto.endDate && { endDate: createBookingDto.endDate }),
        ...(createBookingDto.cancellationPolicy && { cancellationPolicy: createBookingDto.cancellationPolicy }),
        ...(createBookingDto.cancellationDeadline && { cancellationDeadline: createBookingDto.cancellationDeadline }),
        ...(createBookingDto.cancellationReason && { cancellationReason: createBookingDto.cancellationReason })
      };
      
      const booking = await this.bookingService.create(bookingData);
      return this.responseFormatter.success(booking, 'Booking created successfully', { statusCode: HttpStatus.CREATED });
    } catch (error) {
      this.handleError(error, 'create');
    }
  }
  /**
   * Update a booking
   * @param id Booking ID
   * @param updateData Updated booking data
   * @returns The updated booking
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'], nullable: true },
        checkInDate: { type: 'string', format: 'date-time', nullable: true },
        checkOutDate: { type: 'string', format: 'date-time', nullable: true },
        amount: { type: 'number', nullable: true },
        currency: { type: 'string', nullable: true },
        provider: { type: 'string', nullable: true },
        providerBookingId: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
        tripId: { type: 'string', format: 'uuid', nullable: true },
        activityId: { type: 'string', format: 'uuid', nullable: true },
        metadata: { type: 'object', nullable: true },
        cancellationReason: { type: 'string', nullable: true },
        updatedBy: { type: 'string', format: 'uuid' }
      },
      required: ['updatedBy']
    }
  })
  @ApiOkResponse({ 
    description: 'Booking updated successfully',
    type: () => BookingResponse
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      
      // Verify booking exists and belongs to organization
      const existing = await this.bookingService.findOne(id);
      if (!existing) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      if (existing.organizationId !== organizationId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      // Create a properly typed update data object
      const updateData: UpdateBookingDto = {
        updatedBy: userId,
        // Only include defined values from updateBookingDto
        ...(updateBookingDto.status && { status: updateBookingDto.status }),
        ...(updateBookingDto.checkInDate !== undefined && { checkInDate: updateBookingDto.checkInDate }),
        ...(updateBookingDto.checkOutDate !== undefined && { checkOutDate: updateBookingDto.checkOutDate }),
        ...(updateBookingDto.amount !== undefined && { amount: updateBookingDto.amount }),
        ...(updateBookingDto.currency && { currency: updateBookingDto.currency }),
        ...(updateBookingDto.provider && { provider: updateBookingDto.provider }),
        ...(updateBookingDto.providerBookingId && { providerBookingId: updateBookingDto.providerBookingId }),
        ...(updateBookingDto.notes && { notes: updateBookingDto.notes }),
        ...(updateBookingDto.tripId && { tripId: updateBookingDto.tripId }),
        ...(updateBookingDto.activityId && { activityId: updateBookingDto.activityId }),
        ...(updateBookingDto.metadata && { metadata: updateBookingDto.metadata }),
        ...(updateBookingDto.cancellationReason && { cancellationReason: updateBookingDto.cancellationReason })
      };
      
      const booking = await this.bookingService.update(id, updateData);
      return this.responseFormatter.success(booking, 'Booking updated successfully');
    } catch (error) {
      this.handleError(error, 'update');
    }
  }
  /**
   * Delete a booking
   * @param id Booking ID
   * @returns Success status
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', description: 'ID of the booking to delete' })
  @ApiNoContentResponse({ description: 'Booking deleted successfully' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const organizationId = req.user.organization_id;
      
      // First get the booking to verify organization ownership
      const booking = await this.bookingService.findOne(id);
      if (!booking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      
      if (booking.organizationId !== organizationId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      await this.bookingService.remove(id);
      return this.success(null, 'Booking deleted successfully');
    } catch (error) {
      this.handleError(error, 'remove');
    }
  }
  /**
   * Confirm a booking
   * @param id Booking ID
   * @returns The confirmed booking
   */
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiOkResponse({ 
    description: 'Booking confirmed successfully',
    type: () => BookingResponse
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async confirmBooking(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      
      const booking = await this.bookingService.findOne(id);
      if (!booking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      
      if (booking.organizationId !== organizationId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      // Create properly typed update data
      const updateData: UpdateBookingDto = {
        status: 'confirmed',
        updatedBy: userId
      };
      
      const updatedBooking = await this.bookingService.update(id, updateData);
      return this.success(updatedBooking, 'Booking confirmed successfully');
    } catch (error) {
      this.handleError(error, 'confirmBooking');
    }
  }
  /**
   * Cancel a booking
   * @param id Booking ID
   * @param reason Cancellation reason
   * @returns The cancelled booking
   */
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ schema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['cancelled'] },
      cancellationReason: { type: 'string', nullable: true },
      updatedBy: { type: 'string', format: 'uuid' }
    },
    required: ['status', 'updatedBy']
  }})
  @ApiOkResponse({ 
    description: 'Booking cancelled successfully',
    type: () => BookingResponse
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() cancelDto: CancelBookingDto,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      
      const booking = await this.bookingService.findOne(id);
      if (!booking) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      
      if (booking.organizationId !== organizationId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      // Update with cancel status and reason
      // Update with cancel status and reason
      const updateData: UpdateBookingDto = {
        status: 'cancelled',
        cancellationReason: cancelDto.cancellationReason,
        updatedBy: userId
      };

const updatedBooking = await this.bookingService.update(id, updateData);
      
      return this.success(updatedBooking, 'Booking cancelled successfully');
    } catch (error) {
      this.handleError(error, 'cancelBooking');
    }
  }
  /**
   * Get booking statistics for a user
   * @param userId User ID
   * @returns Booking statistics for the user
   */
  @Get('stats/user/:userId')
  @ApiOperation({ summary: 'Get booking statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiOkResponse({ 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byStatus: { type: 'object' },
        byType: { type: 'object' },
        totalAmount: { type: 'number' },
        currency: { type: 'string' }
      }
    }
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getBookingStatsByUserId(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Verify the requesting user has access to these stats
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      const stats = await this.bookingService.getBookingStatsByUserId(userId);
      return this.success(stats, 'Booking statistics retrieved successfully');
    } catch (error) {
      this.handleError(error, 'getBookingStatsByUserId');
    }
  }

  /**
   * Get booking statistics for an organization
   * @param orgId Organization ID
   * @returns Booking statistics for the organization
   */
  @Get('stats/organization/:orgId')
  @ApiOperation({ summary: 'Get booking statistics for an organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiOkResponse({ 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byStatus: { type: 'object' },
        byType: { type: 'object' },
        totalAmount: { type: 'number' },
        currency: { type: 'string' },
        byUser: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              count: { type: 'number' },
              amount: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getBookingStatsByOrgId(
    @Param('orgId') orgId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Verify the requesting user has access to these stats
      if (req.user.organization_id !== orgId && req.user.role !== 'ADMIN') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      
      const stats = await this.bookingService.getBookingStatsByOrgId(orgId);
      return this.success(stats, 'Organization booking statistics retrieved successfully');
    } catch (error) {
      this.handleError(error, 'getBookingStatsByOrgId');
    }
  }

  /**
   * Handle errors consistently across the controller
   * @param error The error that occurred
   * @param context The context where the error occurred (method name)
   * @private
   */
  /**
   * Handle errors consistently across the controller
   * @param error The error that occurred
   * @param context The context where the error occurred (method name)
   * @private
   * @throws {HttpException} Always throws an HTTP exception
   */
  private handleError(error: unknown, context: string): never {
    // If it's already an HTTP error, just rethrow it
    if (error instanceof HttpException) {
      throw error;
    }
    
    // Log the error with context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.logger.error(`Error in ${context}: ${errorMessage}`, errorStack);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'NotFoundError') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ValidationError') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
    
    // For other errors, return a 500 with a generic message
    throw new HttpException(
      'An unexpected error occurred', 
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
