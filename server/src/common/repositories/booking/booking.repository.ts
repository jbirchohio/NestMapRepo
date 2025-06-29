import { and, asc, desc, eq, gte, lte, sql, count, sum, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { bookings } from '../../../db/schema/index.js';
import { BaseRepositoryImpl } from '../base.repository.js';
import { BOOKING_REPOSITORY, DB_CONNECTION } from './booking.tokens.js';
import type { BookingRepository } from './booking.repository.interface.js';
import logger from '../../utils/logger.js';
import type { 
  BaseBooking, 
  BookingStatus, 
  BookingType, 
  BookingSearchParams,
  CreateBookingData,
  UpdateBookingData
} from '@shared/types/booking/index.js';

type OrderBy = 'asc' | 'desc';

@Injectable()
export class BookingRepositoryImpl 
  extends BaseRepositoryImpl<BaseBooking, string, any, any> 
  implements BookingRepository 
{
  protected logger: Logger;

  constructor(
    @Inject(DB_CONNECTION) private readonly db: PostgresJsDatabase,
    @Inject('winston') winstonLogger: Logger
  ) {
    super('Booking', bookings, bookings.id);
    this.logger = winstonLogger.child({ component: 'BookingRepository' });
  }

  protected async mapToModel(data: any): Promise<BaseBooking> {
    if (!data) {
      throw new Error('Booking data is required');
    }
    
    // Ensure provider and providerReferenceId are always set
    const provider = data.provider || 'internal';
    const providerReferenceId = data.providerReferenceId || data.provider_reference_id || '';
    
    // For backward compatibility, generate a reference if not provided
    const referenceNumber = data.referenceNumber || data.reference || '';
    
    return {
      id: data.id,
      userId: data.userId || data.user_id,
      type: data.type || 'other',
      provider,
      providerReferenceId,
      status: data.status || 'pending',
      startDate: data.startDate || data.start_date || data.checkInDate || data.check_in_date || new Date().toISOString(),
      endDate: data.endDate || data.end_date || data.checkOutDate || data.check_out_date || new Date().toISOString(),
      totalPrice: data.totalPrice || data.amount || 0,
      currency: data.currency || 'USD',
      referenceNumber,
      notes: data.notes || null,
      tripId: data.tripId || data.trip_id,
      organizationId: data.organizationId || data.organization_id,
      metadata: data.metadata || {}
    };
  }

  async confirmBooking(
    id: string, 
    confirmationDetails: {
      providerReferenceId: string;
      confirmationNumber: string;
      confirmedAt: Date;
      details?: Record<string, unknown>;
    }
  ): Promise<BaseBooking | null> {
    try {
      const updateData: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ = {
        status: 'confirmed' as const,
        providerReference: confirmationDetails.providerReferenceId,
        reference: confirmationDetails.confirmationNumber,
        confirmedAt: confirmationDetails.confirmedAt,
        updatedAt: new Date()
      };

      // Only include details if provided
      if (confirmationDetails.details) {
        updateData.metadata = confirmationDetails.details;
      }

      const [result] = await this.db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning();

      return result as unknown as BaseBooking;
    } catch (error) {
      this.logger.error(`Error confirming booking ${id}:`, error);
      throw error;
    }
  }

  async getBookingStatsByOrgId(orgId: string): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byType: Record<BookingType, number>;
    totalAmount: number;
    currency: string;
    byUser: Array<{ userId: string; count: number; amount: number }>;
  }> {
    try {
      // Get total count
      const [total] = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(eq(bookings.organizationId, orgId));

      // Get counts by status
      const statusResults = await this.db
        .select({ 
          status: bookings.status, 
          count: count() 
        })
        .from(bookings)
        .where(eq(bookings.organizationId, orgId))
        .groupBy(bookings.status);

      // Get counts by type
      const typeResults = await this.db
        .select({ 
          type: bookings.type, 
          count: count() 
        })
        .from(bookings)
        .where(eq(bookings.organizationId, orgId))
        .groupBy(bookings.type);

      // Get total amount and currency
      const [amountResult] = await this.db
        .select({
          total: sum(bookings.amount),
          currency: sql`${bookings.currency}::text`
        })
        .from(bookings)
        .where(eq(bookings.organizationId, orgId));

      // Get stats by user
      const userResults = await this.db
        .select({
          userId: bookings.userId,
          count: count(),
          amount: sum(bookings.amount)
        })
        .from(bookings)
        .where(eq(bookings.organizationId, orgId))
        .groupBy(bookings.userId);

      // Initialize default values for all statuses and types
      const defaultStatuses: Record<BookingStatus, number> = {} as Record<BookingStatus, number>;
      const defaultTypes: Record<BookingType, number> = {} as Record<BookingType, number>;

      // Initialize with all possible statuses and types set to 0
      const allStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];
      const allTypes: BookingType[] = ['flight', 'hotel', 'car_rental', 'activity', 'other'];

      allStatuses.forEach(status => {
        defaultStatuses[status] = 0;
      });

      allTypes.forEach(type => {
        defaultTypes[type] = 0;
      });

      // Merge results with defaults
      const byStatus = { ...defaultStatuses };
      statusResults.forEach(({ status, count }) => {
        if (status) {
          byStatus[status as BookingStatus] = Number(count) || 0;
        }
      });

      const byType = { ...defaultTypes };
      typeResults.forEach(({ type, count }) => {
        if (type) {
          byType[type as BookingType] = Number(count) || 0;
        }
      });

      const byUser = userResults.map(row => ({
        userId: row.userId || '',
        count: Number(row.count) || 0,
        amount: Number(row.amount) || 0
      }));

      return {
        total: Number(total?.count) || 0,
        byStatus,
        byType,
        totalAmount: Number(amountResult?.total) || 0,
        currency: amountResult?.currency?.toString() || 'USD',
        byUser
      };
    } catch (error) {
      this.logger.error(`Error getting booking stats for org ${orgId}:`, error);
      throw error;
    }
  }

  async updateStatus(
    id: string, 
    status: BookingStatus, 
    notes?: string
  ): Promise<BaseBooking | null> {
    try {
      const updateData: Record<string, any> = {
        status,
        updatedAt: new Date()
      };

      if (notes) {
        updateData.metadata = sql`jsonb_build_object(
          'notes', 
          COALESCE(metadata->'notes' || '\n' || ${notes}, ${notes}::text)
        )`;
      }

      const [result] = await this.db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning();

      return result as unknown as BaseBooking;
    } catch (error) {
      this.logger.error(`Error updating status for booking ${id}:`, error);
      throw error;
    }
  }

  async searchBookings(params: BookingSearchParams & { limit?: number; offset?: number }): Promise<BaseBooking[]> {
    try {
      // Build the base query
      const query = this.db.select().from(bookings);
      
      // Add where conditions
      if (params.userId) {
        query.where(eq(bookings.userId, String(params.userId)));
      }
      if (params.organizationId) {
        query.where(eq(bookings.organizationId, String(params.organizationId)));
      }
      if (params.tripId) {
        query.where(eq(bookings.tripId, String(params.tripId)));
      }
      if (params.status) {
        const statuses = Array.isArray(params.status) ? params.status : [params.status];
        query.where(inArray(bookings.status, statuses));
      }
      if (params.type) {
        const types = Array.isArray(params.type) ? params.type : [params.type];
        query.where(inArray(bookings.type, types));
      }
      if (params.startDate) {
        const startDate = typeof params.startDate === 'string' ? new Date(params.startDate) : params.startDate;
        query.where(gte(bookings.checkInDate, startDate));
      }
      if (params.endDate) {
        const endDate = typeof params.endDate === 'string' ? new Date(params.endDate) : params.endDate;
        query.where(lte(bookings.checkOutDate, endDate));
      }
      
      // Apply sorting if sortBy is provided
      if (params.sortBy && params.sortBy in bookings) {
        const sortColumn = bookings[params.sortBy as keyof typeof bookings];
        const sortOrder = params.sortOrder === 'desc' ? desc : asc;
        query.orderBy(sortOrder(sortColumn as any));
      }
      
      // Apply pagination if limit is provided
      if (params.limit !== undefined) {
        query.limit(params.limit);
        if (params.offset !== undefined) {
          query.offset(params.offset);
        }
      }
      
      // Execute the query and map results
      const results = await query;
      const mappedResults = await Promise.all(results.map(booking => this.mapToModel(booking)));
      return mappedResults.filter((booking): booking is BaseBooking => booking !== null);
    } catch (error) {
      this.logger.error('Error searching bookings:', error);
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    options: Omit<BookingSearchParams, 'userId'> = {}
  ): Promise<BaseBooking[]> {
    return this.searchBookings({ ...options, userId });
  }

  async findByTripId(
    tripId: string, 
    options: { status?: BookingStatus | BookingStatus[]; type?: BookingType | BookingType[] } = {}
  ): Promise<BaseBooking[]> {
    return this.searchBookings({ ...options, tripId });
  }

  async findByOrganizationId(
    organizationId: string,
    options: Omit<BookingSearchParams, 'organizationId'> = {}
  ): Promise<BaseBooking[]> {
    return this.searchBookings({ ...options, organizationId });
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<BaseBooking | null> {
    try {
      const [booking] = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.providerReferenceId, providerReferenceId));
      
      return booking ? this.mapToModel(booking) : null;
    } catch (error) {
      this.logger.error(`Error finding booking by provider reference ID ${providerReferenceId}:`, error);
      throw error;
    }
  }

  async cancelBooking(id: string, reason?: string): Promise<BaseBooking> {
    try {
      const [updatedBooking] = await this.db
        .update(bookings)
        .set({
          status: 'cancelled',
          cancellationReason: reason || null,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id))
        .returning();

      if (!updatedBooking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      return updatedBooking as unknown as BaseBooking;
    } catch (error) {
      this.logger.error(`Error cancelling booking ${id}:`, error);
      throw error;
    }
  }

  async getBookingStatsByUserId(userId: string): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byType: Record<BookingType, number>;
    totalAmount: number;
    currency: string;
  }> {
    try {
      // Get total count
      const [total] = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(eq(bookings.userId, userId));

      // Get counts by status
      const statusResults = await this.db
        .select({ 
          status: bookings.status, 
          count: count() 
        })
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .groupBy(bookings.status);

      // Get counts by type
      const typeResults = await this.db
        .select({ 
          type: bookings.type, 
          count: count() 
        })
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .groupBy(bookings.type);

      // Get total amount
      const [amountResult] = await this.db
        .select({ 
          total: sum(bookings.amount),
          currency: sql`${bookings.currency}`.as('currency')
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, userId),
            eq(bookings.status, 'confirmed')
          )
        )
        .groupBy(bookings.currency);

      // Initialize default values for all statuses and types
      const defaultStatuses = {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        refunded: 0
      } as const;

      const defaultTypes = {
        flight: 0,
        hotel: 0,
        car_rental: 0,
        activity: 0,
        other: 0
      } as const;

      // Transform results
      const byStatus = statusResults.reduce((acc, { status, count }) => ({
        ...acc,
        [status]: Number(count)
      }), { ...defaultStatuses });

      const byType = typeResults.reduce((acc, { type, count }) => ({
        ...acc,
        [type]: Number(count)
      }), { ...defaultTypes });

      return {
        total: Number(total?.count) || 0,
        byStatus,
        byType,
        totalAmount: Number(amountResult?.total) || 0,
        currency: amountResult?.currency?.toString() || 'USD'
      };
    } catch (error) {
      this.logger.error(`Error getting booking stats for user ${userId}:`, error);
      throw error;
    }
  }

  // Implement other required methods from BaseRepository
  async create(data: CreateBookingData & { userId: string }): Promise<BaseBooking> {
    try {
      const now = new Date();
      const reference = data.referenceNumber || `B${Math.floor(100000 + Math.random() * 900000)}`;
      
      const bookingData = {
        id: crypto.randomUUID(),
        type: data.type,
        provider: data.provider,
        providerReferenceId: data.providerReferenceId,
        status: 'pending' as const, // Explicitly type as const to match the enum
        bookingDate: now,
        amount: data.totalPrice,
        currency: data.currency,
        reference,
        checkInDate: new Date(data.startDate),
        checkOutDate: data.endDate ? new Date(data.endDate) : undefined,
        userId: data.userId,
        organizationId: data.organizationId,
        tripId: data.tripId,
        notes: data.notes || null,
        metadata: data.metadata || {},
        createdAt: now,
        updatedAt: now
      };

      // Validate provider reference ID is provided for non-internal providers
      if (data.provider !== 'internal' && !data.providerReferenceId) {
        throw new Error('providerReferenceId is required for external providers');
      }

      const [result] = await this.db
        .insert(bookings)
        .values(bookingData)
        .returning();
      
      return this.mapToModel(result);
    } catch (error) {
      this.logger.error('Error creating booking:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateBookingData): Promise<BaseBooking> {
    try {
      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: new Date()
      };

      // Map fields to match database schema
      if (data.startDate) updateData.checkInDate = new Date(data.startDate);
      if (data.endDate) updateData.checkOutDate = new Date(data.endDate);
      if (data.totalPrice !== undefined) updateData.amount = data.totalPrice;
      if (data.referenceNumber) updateData.reference = data.referenceNumber;

      const [result] = await this.db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning();
      
      if (!result) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }
      
      return this.mapToModel(result);
    } catch (error) {
      this.logger.error(`Error updating booking ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const [result] = await this.db
        .delete(bookings)
        .where(eq(bookings.id, id))
        .returning({ id: bookings.id });
      
      return !!result;
    } catch (error) {
      this.logger.error(`Error deleting booking ${id}:`, error);
      throw error;
    }
  }
}

export const bookingRepositoryProvider = {
  provide: BOOKING_REPOSITORY,
  useFactory: (db: PostgresJsDatabase, logger: Logger) => {
    return new BookingRepositoryImpl(db, logger);
  },
  inject: [DB_CONNECTION, 'winston']
};
