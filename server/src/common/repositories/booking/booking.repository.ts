import { Injectable } from '@nestjs/common/index';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { bookings, type Booking } from '../../../db/schema';
import { users } from '../../../db/schema';
import { BookingRepository, type BookingConfirmationDetails } from './booking.repository.interface';
import { BaseRepositoryImpl } from '../base.repository';

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

  async confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null> {
    this.logger.log(`Confirming booking: ${id}`);
    
    try {
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          status: 'confirmed',
          confirmationCode: confirmationDetails.confirmationCode?.toString(),
          confirmedAt: new Date(),
          metadata: confirmationDetails, // Store full details in metadata
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();
      
      return updatedBooking || null;
    } catch (error) {
      this.logger.error(`Error confirming booking ${id}:`, { error });
      return null;
    }
  }
  
  async cancelBooking(id: string, cancellationReason: string): Promise<Booking | null> {
    this.logger.log(`Cancelling booking: ${id}, reason: ${cancellationReason}`);
    
    try {
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
    } catch (error) {
      this.logger.error(`Error cancelling booking ${id}:`, { error });
      return null;
    }
  }
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

  async getBookingStatsByUserId(userId: string): Promise<{total: number, statusCounts: Record<string, number>}> {
    this.logger.log(`Getting booking stats for user: ${userId}`);
    
    try {
      // Get all bookings for the user
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, userId));
      
      // Count by status
      const statusCounts = userBookings.reduce((acc, booking) => {
        const status = booking.status;
        if (status) {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total: userBookings.length,
        statusCounts
      };
    } catch (error) {
      this.logger.error(`Error getting booking stats for user ${userId}:`, { error });
      return { total: 0, statusCounts: {} };
    }
  }

  async getBookingStatsByOrgId(orgId: string): Promise<{total: number, statusCounts: Record<string, number>}> {
    this.logger.log(`Getting booking stats for organization: ${orgId}`);
    
    try {
      // First, find all users in this organization
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, orgId));
      
      // Get user IDs
      const userIds = orgUsers.map(user => user.id);
      
      if (userIds.length === 0) {
        return { total: 0, statusCounts: {} };
      }
      
      // Find all bookings for these users
      const bookingsForOrg = await Promise.all(
        userIds.map(userId => 
          db.select()
            .from(bookings)
            .where(eq(bookings.userId, userId))
        )
      ).then(results => results.flat());
      
      // Count by status
      const statusCounts = bookingsForOrg.reduce((acc, booking) => {
        const status = booking.status;
        if (status) {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total: bookingsForOrg.length,
        statusCounts
      };
    } catch (error) {
      this.logger.error(`Error getting booking stats for organization ${orgId}:`, { error });
      return { total: 0, statusCounts: {} };
    }
  }
}
