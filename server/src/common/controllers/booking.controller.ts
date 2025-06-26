import { Controller, Get, Post, Put, Body, Param, Delete, Inject, Logger } from '@nestjs/common';
import { BookingService } from '../services/booking.service.js';
import type { Booking } from '../../../db/schema.js';
import { ErrorService } from '../services/error.service.js';
import type { CreateBookingDto, UpdateBookingDto } from './dto/booking.dto.js';
/**
 * Controller for booking endpoints
 * Demonstrates how to use services and repositories through dependency injection
 */
@Controller('bookings')
export class BookingController {
    private readonly logger = new Logger(BookingController.name);
    constructor(
    @Inject('BookingService')
    private readonly bookingService: BookingService, private readonly errorService: ErrorService) { }
    /**
     * Get a booking by ID
     */
    @Get(':id')
    async getBookingById(
        @Param('id') id: string
    ) {
        this.logger.log(`GET /bookings/${id}`);
        const booking = await this.bookingService.findOne(id);
        if (!booking) {
            this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        return booking;
    }
    /**
     * Get all bookings for a user
     */
    @Get()
    async getBookingsByUser() {
        this.logger.log('GET /bookings');
        // TODO: Get user ID from auth context
        const userId = 'temp-user-id';
        return this.bookingService.getBookingsByUserId(userId);
    }
    /**
     * Get all bookings for a trip
     */
    @Get('trip/:tripId')
    async getBookingsByTrip(@Param('tripId') tripId: string) {
        this.logger.log(`GET /bookings/trip/${tripId}`);
        return this.bookingService.getBookingsByTripId(tripId);
    }
    /**
     * Create a new booking
     */
    @Post()
    async createBooking(@Body() createBookingDto: CreateBookingDto) {
        this.logger.log('POST /bookings');
        return this.bookingService.create(createBookingDto);
    }
    /**
     * Update a booking
     */
    @Put(':id')
    async updateBooking(
        @Param('id') id: string,
        @Body() updateData: UpdateBookingDto
    ): Promise<Booking> {
        this.logger.log(`PUT /bookings/${id}`);
        const booking = await this.bookingService.update(id, updateData);
        if (!booking) {
            this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        return booking;
    }
    /**
     * Delete a booking
     */
    @Delete(':id')
    async deleteBooking(
        @Param('id') id: string
    ): Promise<{ success: boolean }> {
        this.logger.log(`DELETE /bookings/${id}`);
        const booking = await this.bookingService.findOne(id);
        if (!booking) {
            this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        const success = await this.bookingService.remove(id);
        return { success };
    }
    /**
     * Confirm a booking
     */
    @Put(':id/confirm')
    async confirmBooking(
        @Param('id') id: string
    ): Promise<Booking> {
        this.logger.log(`PUT /bookings/${id}/confirm`);
        const booking = await this.bookingService.findOne(id);
        if (!booking) {
            this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        // TODO: Implement confirm logic in service
        return booking;
    }
    /**
     * Cancel a booking
     */
    @Put(':id/cancel')
    async cancelBooking(
        @Param('id') id: string,
        @Body('reason') reason: string
    ): Promise<Booking> {
        this.logger.log(`PUT /bookings/${id}/cancel`);
        const booking = await this.bookingService.findOne(id);
        if (!booking) {
            this.errorService.throwNotFoundError('Booking not found', { bookingId: id });
        }
        // TODO: Implement cancel logic in service
        return { ...booking, status: 'cancelled', cancellationReason: reason } as Booking;
    }
    /**
     * Get booking statistics for a user
     */
    @Get('stats/user/:userId')
    async getBookingStatsByUserId(
        @Param('userId') userId: string
    ) {
        this.logger.log(`GET /bookings/stats/user/${userId}`);
        // TODO: Implement stats logic in service
        return {
            total: 0,
            byStatus: {},
            byType: {},
            totalAmount: 0,
            currency: 'USD'
        };
    }

    /**
     * Get booking statistics for an organization
     */
    @Get('stats/organization/:orgId')
    async getBookingStatsByOrgId(
        @Param('orgId') orgId: string
    ) {
        this.logger.log(`GET /bookings/stats/organization/${orgId}`);
        // TODO: Implement org stats logic in service
        return {
            total: 0,
            byStatus: {},
            byType: {},
            totalAmount: 0,
            currency: 'USD',
            byUser: []
        };
    }
}
