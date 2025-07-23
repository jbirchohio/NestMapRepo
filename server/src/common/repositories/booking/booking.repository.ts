import { Injectable } from 'injection-js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { getDatabase } from '../../../db';
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

  private async getDb() {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection not initialized');
    }
    return db;
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    this.logger.log(`Finding bookings for user: ${userId}`);
    const db = await this.getDb();
    
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));
    
    return result as Booking[];
  }

  async findByTripId(tripId: string): Promise<Booking[]> {
    this.logger.log(`Finding bookings for trip: ${tripId}`);
    const db = await this.getDb();
    
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.tripId, tripId));
    
    return result as Booking[];
  }

  async findByStatus(status: string | string[]): Promise<Booking[]> {
    this.logger.log(`Finding bookings with status: ${Array.isArray(status) ? status.join(', ') : status}`);
    const db = await this.getDb();
    
    const statuses = Array.isArray(status) ? status : [status];
    
    const result = await db
      .select()
      .from(bookings)
      .where(sql`${bookings.status} = ANY(${statuses})`);
    
    return result as Booking[];
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<Booking | null> {
    this.logger.log(`Finding booking by provider reference ID: ${providerReferenceId}`);
    const db = await this.getDb();
    
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.providerBookingId, providerReferenceId))
      .limit(1);
    
    return (booking as Booking) || null;
  }

  async confirmBooking(id: string, confirmationDetails: BookingConfirmationDetails): Promise<Booking | null> {
    this.logger.log(`Confirming booking: ${id}`);
    const db = await this.getDb();
    
    try {
      const [booking] = await db
        .update(bookings)
        .set({
          status: 'confirmed',
          confirmationCode: confirmationDetails.confirmationCode,
          confirmationDate: new Date(),
          updatedAt: new Date(),
          ...(confirmationDetails.providerBookingId && { providerBookingId: confirmationDetails.providerBookingId }),
          ...(confirmationDetails.providerData && { providerData: confirmationDetails.providerData })
        })
        .where(eq(bookings.id, id))
        .returning();

      return (booking as Booking) || null;
    } catch (error) {
      this.logger.error(`Error confirming booking ${id}:`, { error });
      return null;
    }
  }
  
  async cancelBooking(id: string, reason?: string): Promise<Booking | null> {
    this.logger.log(`Cancelling booking: ${id}`);
    const db = await this.getDb();
    
    try {
      const [booking] = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          cancellationDate: new Date(),
          cancellationReason: reason,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();

      return (booking as Booking) || null;
    } catch (error) {
      this.logger.error(`Error cancelling booking ${id}:`, { error });
      return null;
    }
  }
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
    const db = await this.getDb();
    
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
    const db = await this.getDb();
    
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
            .then(result => result as Booking[])
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
