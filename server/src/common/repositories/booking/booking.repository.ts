import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db.js';
import { bookings } from '../../db/schema.js';
import { type Booking } from '../../db/schema.js';
import { BookingRepository, type BookingConfirmationDetails } from './booking.repository.interface.js';
import { BaseRepositoryImpl } from '../base.repository.js';

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
      .where(eq(bookings.userId, userId));
  }

  async findByTripId(tripId: string): Promise<Booking[]> {
    this.logger.log(`Finding bookings for trip: ${tripId}`);
    
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.tripId, tripId));
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<Booking | null> {
    this.logger.log(`Finding booking by provider reference ID: ${providerReferenceId}`);
    
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.providerBookingId, providerReferenceId))
      .limit(1);
    
    return booking || null;
  }

  // Commented out as confirmationDetails field doesn't exist in current schema
  // async confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null> {
  //   this.logger.log(`Confirming booking: ${id}`);
  //   
  //   const [updatedBooking] = await db
  //     .update(bookings)
  //     .set({
  //       status: 'confirmed',
  //       confirmationDetails,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(bookings.id, id))
  //     .returning();
  //   
  //   return updatedBooking || null;
  // }

  // Commented out as cancellationReason field doesn't exist in current schema
  // async cancelBooking(id: string, cancellationReason: string): Promise<Booking | null> {
  //   this.logger.log(`Cancelling booking: ${id}, reason: ${cancellationReason}`);
  //   
  //   const [updatedBooking] = await db
  //     .update(bookings)
  //     .set({
  //       status: 'cancelled',
  //       cancellationReason,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(bookings.id, id))
  //     .returning();
  //   
  //   return updatedBooking || null;
  // }

  async getBookingStatsByUserId(userId: string): Promise<any> {
    this.logger.log(`Getting booking stats for user: ${userId}`);
    
    // Simple implementation - return all bookings for the user
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));
    
    // Count by status
    const statusCounts = userBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }

  async getBookingStatsByOrgId(orgId: string): Promise<any> {
    this.logger.log(`Getting booking stats for organization: ${orgId}`);
    
    // Simple implementation - return all bookings for the organization
    const orgBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.organizationId, orgId));
    
    // Count by status
    const statusCounts = orgBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }
}
