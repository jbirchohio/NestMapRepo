import { Injectable, Inject, Logger } from '@nestjs/common.js';
import { BookingRepository } from '../repositories/booking/booking.repository.interface.js';
import { Booking } from '@shared/../db/bookingSchema';
import { BookingConfirmationDetails } from '../interfaces/booking.interfaces.js';

/**
 * Service for managing bookings
 * Demonstrates how to use repositories through dependency injection
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}

  /**
   * Get a booking by ID
   */
  async getBookingById(id: string): Promise<Booking | null> {
    this.logger.log(`Getting booking by ID: ${id}`);
    return this.bookingRepository.findById(id);
  }

  /**
   * Get all bookings for a user
   */
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    this.logger.log(`Getting bookings for user: ${userId}`);
    return this.bookingRepository.findByUserId(userId);
  }

  /**
   * Get all bookings for a trip
   */
  async getBookingsByTripId(tripId: string): Promise<Booking[]> {
    this.logger.log(`Getting bookings for trip: ${tripId}`);
    return this.bookingRepository.findByTripId(tripId);
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    this.logger.log('Creating new booking');
    return this.bookingRepository.create(bookingData);
  }

  /**
   * Update a booking
   */
  async updateBooking(id: string, bookingData: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Booking | null> {
    this.logger.log(`Updating booking: ${id}`);
    return this.bookingRepository.update(id, bookingData);
  }

  /**
   * Delete a booking
   */
  async deleteBooking(id: string): Promise<boolean> {
    this.logger.log(`Deleting booking: ${id}`);
    return this.bookingRepository.delete(id);
  }

  /**
   * Confirm a booking
   */
  async confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null> {
    this.logger.log(`Confirming booking: ${id}`);
    return this.bookingRepository.confirmBooking(id, confirmationDetails);
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, cancellationReason: string): Promise<Booking | null> {
    this.logger.log(`Cancelling booking: ${id}, reason: ${cancellationReason}`);
    return this.bookingRepository.cancelBooking(id, cancellationReason);
  }

  /**
   * Get booking statistics for a user
   */
  async getBookingStatsByUserId(userId: string): Promise<any> {
    this.logger.log(`Getting booking stats for user: ${userId}`);
    return this.bookingRepository.getBookingStatsByUserId(userId);
  }

  /**
   * Get booking statistics for an organization
   */
  async getBookingStatsByOrgId(orgId: string): Promise<any> {
    this.logger.log(`Getting booking stats for organization: ${orgId}`);
    return this.bookingRepository.getBookingStatsByOrgId(orgId);
  }
}
