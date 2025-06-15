import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { bookings, type Booking } from '../../../../db/schema';
import { BookingRepository } from './booking.repository.interface';
import { BaseRepositoryImpl } from '../base.repository';
import { BookingConfirmationDetails } from '../../interfaces/booking.interfaces';

/**
 * Implementation of the booking repository
 * Extends the base repository implementation with booking-specific methods
 */
@Injectable()
export class BookingRepositoryImpl extends BaseRepositoryImpl<Booking, string, Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>> implements BookingRepository {
  constructor() {
    super('Booking', bookings, bookings.id);
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    this.logger.log(`Finding bookings for user: ${userId}`);
    
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(bookings.createdAt);
  }

  async findByTripId(tripId: string): Promise<Booking[]> {
    this.logger.log(`Finding bookings for trip: ${tripId}`);
    
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.tripId, tripId))
      .orderBy(bookings.createdAt);
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<Booking | null> {
    this.logger.log(`Finding booking by provider reference ID: ${providerReferenceId}`);
    
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.providerReferenceId, providerReferenceId))
      .limit(1);
    
    return booking || null;
  }

  async confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null> {
    this.logger.log(`Confirming booking: ${id}`);
    
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'confirmed',
        confirmationDetails,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
    
    return updatedBooking || null;
  }

  async cancelBooking(id: string, cancellationReason: string): Promise<Booking | null> {
    this.logger.log(`Cancelling booking: ${id}, reason: ${cancellationReason}`);
    
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancellationReason,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
    
    return updatedBooking || null;
  }

  async getBookingStatsByUserId(userId: string): Promise<any> {
    this.logger.log(`Getting booking stats for user: ${userId}`);
    
    // This would typically involve more complex queries with aggregations
    // For demonstration purposes, we'll return a simple count
    const bookingsByStatus = await db
      .select({
        status: bookings.status,
        count: db.fn.count()
      })
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .groupBy(bookings.status);
    
    return bookingsByStatus;
  }

  async getBookingStatsByOrgId(orgId: string): Promise<any> {
    this.logger.log(`Getting booking stats for organization: ${orgId}`);
    
    // This would typically involve more complex queries with aggregations and joins
    // For demonstration purposes, we'll return a simple count
    const bookingsByStatus = await db
      .select({
        status: bookings.status,
        count: db.fn.count()
      })
      .from(bookings)
      .where(eq(bookings.organizationId, orgId))
      .groupBy(bookings.status);
    
    return bookingsByStatus;
  }
}
