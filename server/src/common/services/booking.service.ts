import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Import shared types
import type { 
  Booking as SharedBooking, 
  BookingStatus, 
  BookingType,
  Booking as SharedBookingType
} from '@shared/types/bookings';

// Import database types
import type { 
  Booking as DbBooking,
  InsertBooking as DbInsertBooking,
  UpdateBooking as DbUpdateBooking
} from '../../../db/bookingSchema.js';

// Import repository interfaces
import { BOOKING_REPOSITORY } from '../repositories/booking/booking.repository.interface.js';
import type { 
  BookingRepository as IBookingRepository,
  CreateBookingData,
  UpdateBookingData
} from '../repositories/booking/booking.repository.interface.js';

// Import DTOs
import type { 
  CreateBookingDto, 
  UpdateBookingDto, 
  BookingSearchParams 
} from './dto/booking.dto.js';

// Token for dependency injection
export const BOOKING_SERVICE = 'BOOKING_SERVICE';

// Type to bridge between database and shared booking types
type DatabaseBooking = Omit<DbBooking, 'providerReferenceId'> & {
  providerBookingId: string;  // Alias for providerReferenceId
  providerReferenceId: string;
  metadata: Record<string, unknown>;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  amount?: number | null;
  currency?: string | null;
  tripId?: string | null;
  activityId?: string | null;
  notes?: string | null;
  cancellationPolicy?: string | null;
  cancellationDeadline?: Date | null;
  cancellationReason?: string | null;
}

/**
 * Service for managing bookings
 * Demonstrates how to use repositories through dependency injection
 */
@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: IBookingRepository,
    ) {}

    async create(createBookingDto: CreateBookingDto): Promise<SharedBooking> {
        const now = new Date();
        const createData: CreateBookingData = {
            ...createBookingDto,
            id: uuidv4(),
            status: 'pending',
            bookingDate: now,
            createdAt: now,
            updatedAt: now,
            reference: `B-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            providerReferenceId: createBookingDto.providerBookingId || `PR-${Date.now()}`,
            // Ensure all required fields have default values
            amount: createBookingDto.amount ?? 0,
            currency: createBookingDto.currency ?? 'USD',
            metadata: createBookingDto.metadata ?? {},
            // Optional fields with proper null handling
            checkInDate: createBookingDto.checkInDate ? new Date(createBookingDto.checkInDate) : null,
            checkOutDate: createBookingDto.checkOutDate ? new Date(createBookingDto.checkOutDate) : null,
            tripId: createBookingDto.tripId || null,
            activityId: createBookingDto.activityId || null,
            notes: createBookingDto.notes || null,
            cancellationPolicy: createBookingDto.cancellationPolicy || null,
            cancellationDeadline: createBookingDto.cancellationDeadline ? 
                new Date(createBookingDto.cancellationDeadline) : null,
            cancellationReason: createBookingDto.cancellationReason || null,
        };
        
        const dbBooking = await this.bookingRepository.create(createData);
        return this.mapToSharedBooking(dbBooking as unknown as DatabaseBooking);
    }

    async update(id: string, updateBookingDto: UpdateBookingDto): Promise<SharedBooking> {
        const dbBooking = await this.bookingRepository.update(id, {
            ...updateBookingDto,
            updatedAt: new Date(),
        } as unknown as Parameters<IBookingRepository['update']>[1]);
        
        if (!dbBooking) {
            throw new Error('Booking not found');
        }
        
        return this.mapToSharedBooking(dbBooking as unknown as DatabaseBooking);
    }

    async findOne(id: string): Promise<SharedBooking | null> {
        const booking = await this.bookingRepository.findById(id);
        if (!booking) return null;
        
        // Convert the repository's Booking type to our expected format
        const dbBooking: DbBooking & { providerBookingId: string } = {
            ...booking,
            // Map snake_case to camelCase for timestamps
            createdAt: 'created_at' in booking ? (booking as any).created_at : new Date(),
            updatedAt: 'updated_at' in booking ? (booking as any).updated_at : new Date(),
            // Ensure all required fields are present
            metadata: 'metadata' in booking ? (booking.metadata as Record<string, unknown>) ?? {} : {},
            // Map provider reference ID
            providerBookingId: 'provider_reference_id' in booking 
                ? (booking as any).provider_reference_id 
                : (booking as any).providerReferenceId ?? ''
        };
        
        return this.mapToSharedBooking(dbBooking);
    }

    async findAll(params: BookingSearchParams = {}): Promise<SharedBooking[]> {
        const bookings = await this.bookingRepository.searchBookings(params);
        return bookings.map(booking => {
            const dbBooking: DbBooking & { providerBookingId: string } = {
                ...booking,
                // Map snake_case to camelCase for timestamps
                createdAt: 'created_at' in booking ? (booking as any).created_at : new Date(),
                updatedAt: 'updated_at' in booking ? (booking as any).updated_at : new Date(),
                // Ensure all required fields are present
                metadata: 'metadata' in booking ? (booking.metadata as Record<string, unknown>) ?? {} : {},
                // Map provider reference ID
                providerBookingId: 'provider_reference_id' in booking 
                    ? (booking as any).provider_reference_id 
                    : (booking as any).providerReferenceId ?? ''
            };
            return this.mapToSharedBooking(dbBooking);
        });
    }

    async remove(id: string): Promise<boolean> {
        return this.bookingRepository.delete(id);
    }

    async getBookingsByUserId(userId: string): Promise<SharedBooking[]> {
        const bookings = await this.bookingRepository.findByUserId(userId, {});
        return bookings.map(booking => {
            // Create a properly typed DbBooking object with all required fields
            const dbBooking: DbBooking & { providerBookingId: string } = {
                id: booking.id,
                reference: booking.reference,
                type: booking.type as any, // Will be cast to BookingType in mapToSharedBooking
                status: booking.status as any, // Will be cast to BookingStatus in mapToSharedBooking
                bookingDate: booking.bookingDate instanceof Date ? booking.bookingDate : new Date(booking.bookingDate),
                checkInDate: booking.checkInDate ? (booking.checkInDate instanceof Date ? booking.checkInDate : new Date(booking.checkInDate)) : null,
                checkOutDate: booking.checkOutDate ? (booking.checkOutDate instanceof Date ? booking.checkOutDate : new Date(booking.checkOutDate)) : null,
                amount: booking.amount ?? null,
                currency: booking.currency ?? 'usd',
                provider: booking.provider,
                providerReferenceId: 'providerReferenceId' in booking ? booking.providerReferenceId : (booking as any).provider_reference_id || '',
                userId: booking.userId,
                organizationId: booking.organizationId,
                tripId: booking.tripId ?? null,
                activityId: booking.activityId ?? null,
                notes: booking.notes ?? null,
                cancellationPolicy: booking.cancellationPolicy ?? null,
                cancellationDeadline: booking.cancellationDeadline ? 
                    (booking.cancellationDeadline instanceof Date ? booking.cancellationDeadline : new Date(booking.cancellationDeadline)) : 
                    null,
                cancellationReason: 'cancellationReason' in booking ? booking.cancellationReason : null,
                metadata: booking.metadata ? (typeof booking.metadata === 'object' ? booking.metadata : {}) : {},
                createdAt: 'createdAt' in booking ? 
                    (booking.createdAt instanceof Date ? booking.createdAt : new Date(booking.createdAt)) : 
                    new Date(),
                updatedAt: 'updatedAt' in booking ?
                    (booking.updatedAt instanceof Date ? booking.updatedAt : new Date(booking.updatedAt)) :
                    new Date(),
                // Alias for providerReferenceId to match SharedBooking interface
                providerBookingId: 'providerReferenceId' in booking ? 
                    booking.providerReferenceId : 
                    (booking as any).provider_reference_id || ''
            };
            return this.mapToSharedBooking(dbBooking);
        });
    }

    async getBookingsByTripId(tripId: string): Promise<SharedBooking[]> {
        const bookings = await this.bookingRepository.findByTripId(tripId, {});
        return bookings.map(booking => {
            const dbBooking: DbBooking & { providerBookingId: string } = {
                ...booking,
                // Map snake_case to camelCase for timestamps
                createdAt: 'created_at' in booking ? (booking as any).created_at : new Date(),
                updatedAt: 'updated_at' in booking ? (booking as any).updated_at : new Date(),
                // Ensure all required fields are present
                metadata: 'metadata' in booking ? (booking.metadata as Record<string, unknown>) ?? {} : {},
                // Map provider reference ID
                providerBookingId: 'provider_reference_id' in booking 
                    ? (booking as any).provider_reference_id 
                    : (booking as any).providerReferenceId ?? ''
            };
            return this.mapToSharedBooking(dbBooking);
        });
    }

    async getBookingStatsByOrgId(orgId: string): Promise<{
        total: number;
        byStatus: Record<BookingStatus, number>;
        byType: Record<BookingType, number>;
        totalAmount: number;
        currency: string;
        byUser: Array<{ userId: string; count: number; amount: number }>;
    }> {
        return this.bookingRepository.getBookingStatsByOrgId(orgId);
    }

    async getBookingStatsByUserId(userId: string): Promise<{
        total: number;
        byStatus: Record<BookingStatus, number>;
        byType: Record<BookingType, number>;
        totalAmount: number;
        currency: string;
    }> {
        return this.bookingRepository.getBookingStatsByUserId(userId);
    }

    private mapToSharedBooking(
        dbBooking: DbBooking & { providerBookingId: string }
    ): SharedBooking {
        // Ensure all required fields are present and properly typed
        const booking: SharedBooking = {
            id: dbBooking.id,
            reference: dbBooking.reference,
            type: dbBooking.type as SharedBooking['type'],
            status: dbBooking.status as SharedBooking['status'],
            bookingDate: dbBooking.bookingDate.toISOString(),
            provider: dbBooking.provider,
            providerBookingId: dbBooking.providerBookingId,
            providerReferenceId: dbBooking.providerReferenceId,
            userId: dbBooking.userId,
            organizationId: dbBooking.organizationId,
            // Handle optional fields with nullish coalescing
            checkInDate: dbBooking.checkInDate?.toISOString(),
            checkOutDate: dbBooking.checkOutDate?.toISOString(),
            amount: dbBooking.amount ?? 0,
            currency: dbBooking.currency ?? 'USD',
            tripId: dbBooking.tripId ?? undefined,
            activityId: dbBooking.activityId ?? undefined,
            notes: dbBooking.notes ?? undefined,
            cancellationPolicy: dbBooking.cancellationPolicy ?? undefined,
            cancellationDeadline: dbBooking.cancellationDeadline?.toISOString(),
            cancellationReason: dbBooking.cancellationReason ?? undefined,
            metadata: dbBooking.metadata ?? {},
            // Timestamps
            createdAt: dbBooking.createdAt.toISOString(),
            updatedAt: dbBooking.updatedAt.toISOString(),
        };

        return booking;
    }
}
