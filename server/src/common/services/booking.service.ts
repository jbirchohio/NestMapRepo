import { v4 as uuidv4 } from 'uuid';

// Import shared types
import type { 
  Booking as SharedBooking, 
  BookingStatus, 
  BookingType,
  Booking as SharedBookingType,
  AnyBooking
} from '@shared/schema/types/booking';

// Import database types
import type { 
  Booking as DbBooking,
  InsertBooking as DbInsertBooking
} from '../../../db/schema/index.js';

type DbUpdateBooking = Partial<DbInsertBooking>;

// Import repository interfaces
// Import repository token
import { BOOKING_REPOSITORY } from '../repositories/repository.tokens.js';
import type { 
  BookingRepository as IBookingRepository
} from '../repositories/booking/booking.repository.interface.js';
import logger from '../../utils/logger.js';

// Extend the base booking type with required fields for creation
// Extend the base booking type with required fields for creation
type CreateBookingData = Omit<SharedBooking, 'id' | 'createdAt' | 'updatedAt' | 'reference' | 'cancellationReason'> & {
  providerBookingId: string;
  provider: string;
  amount: number;
  currency: string;
  userId: string | number;
  organizationId: string | number;
  // Add optional fields that might come from DTO
  cancellationReason?: string | null;
  providerReferenceId?: string;
  deleted_at?: Date | null;
};

type UpdateBookingData = Partial<Omit<CreateBookingData, 'userId' | 'organizationId' | 'provider' | 'providerBookingId'>>;

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
export class BookingService {
    private readonly logger = logger;

    /**
     * Normalize a date input to a Date object
     * Handles string, number, or Date inputs
     */
    private normalizeDate(dateInput: string | number | Date | null | undefined): Date {
        if (!dateInput) return new Date();
        if (dateInput instanceof Date) return dateInput;
        if (typeof dateInput === 'number') return new Date(dateInput);
        if (typeof dateInput === 'string') {
            // Try to parse the date string
            const parsed = new Date(dateInput);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    }

    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: IBookingRepository,
    ) {}

    async create(createBookingDto: CreateBookingDto): Promise<SharedBooking> {
        const now = new Date();
        // Ensure all required fields are present with proper types
        const createData: CreateBookingData = {
            ...createBookingDto,
            status: 'pending' as const, // Ensure type is narrowed to literal 'pending'
            bookingDate: now,
            // Ensure all required fields have default values
            providerBookingId: createBookingDto.providerBookingId || `PR-${Date.now()}`,
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
        // Ensure all required fields are present with proper types
        const dbBooking: DbBooking & { 
            providerBookingId: string;
            providerReferenceId: string;
            cancellationReason: string | null;
        } = {
            ...booking,
            // Map snake_case to camelCase for timestamps
            createdAt: 'created_at' in booking ? 
                this.normalizeDate((booking as any).created_at) : 
                this.normalizeDate((booking as any).createdAt || new Date()),
            updatedAt: 'updated_at' in booking ? 
                this.normalizeDate((booking as any).updated_at) :
                this.normalizeDate((booking as any).updatedAt || new Date()),
            // Ensure all required fields are present with proper types
            id: String(booking.id),
            metadata: 'metadata' in booking ? 
                (booking.metadata as Record<string, unknown> ?? {}) : {},
            // Map provider reference ID
            providerBookingId: 'provider_booking_id' in booking ? 
                String((booking as any).provider_booking_id) : 
                (booking as any).providerBookingId || '',
            providerReferenceId: 'provider_reference_id' in booking ? 
                String((booking as any).provider_reference_id) : 
                (booking as any).providerReferenceId || '',
            // Initialize cancellationReason with proper fallback
            cancellationReason: 'cancellation_reason' in booking ?
                (booking as any).cancellation_reason :
                (booking as any).cancellationReason || null
        };
        
        return this.mapToSharedBooking(dbBooking);
    }

    private getValidStatus(status?: string): BookingStatus {
        const validStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'];
        return validStatuses.includes(status as BookingStatus) ? status as BookingStatus : 'pending';
    }

    private getValidType(type?: string): BookingType {
        const validTypes: BookingType[] = ['flight', 'hotel', 'car_rental', 'activity', 'other'];
        return validTypes.includes(type as BookingType) ? type as BookingType : 'other';
    }

    /**
     * Map a database booking to the shared booking type
     * Handles snake_case to camelCase conversion and type safety
     */
    private mapToSharedBooking(
        dbBooking: DbBooking & {
            id: string | number;
            reference: string;
            type: string;
            status: string;
            bookingDate: Date | string;
            amount?: number | string | null;
            currency?: string | null;
            provider?: string;
            userId: string | number;
            organizationId: string | number;
            providerBookingId?: string;
            providerReferenceId?: string | null;
            checkInDate?: Date | string | null;
            checkOutDate?: Date | string | null;
            tripId?: string | number | null;
            activityId?: string | number | null;
            notes?: string | null;
            cancellationPolicy?: string | null;
            cancellationDeadline?: Date | string | null;
            cancellationReason?: string | null;
            metadata?: Record<string, unknown> | null;
            createdAt: Date | string;
            updatedAt: Date | string;
            deleted_at?: Date | null;
            deletedAt?: Date | null;
            // Snake case variants
            user_id?: string | number;
            organization_id?: string | number;
            booking_date?: Date | string;
            check_in_date?: Date | string | null;
            check_out_date?: Date | string | null;
            provider_booking_id?: string;
            provider_reference_id?: string | null;
            cancellation_reason?: string | null;
            created_at?: Date | string;
            updated_at?: Date | string;
        }
    ): SharedBooking {
        // Extract fields with snake_case fallbacks
        const id = String(dbBooking.id);
        const userId = String(dbBooking.user_id || dbBooking.userId || '');
        const organizationId = String(dbBooking.organization_id || dbBooking.organizationId || '');
        const reference = String(dbBooking.reference || `BOOK-${id.substring(0, 8).toUpperCase()}`);
        const type = this.getValidType(dbBooking.type);
        const status = this.getValidStatus(dbBooking.status);
        const amount = typeof dbBooking.amount === 'number' ? dbBooking.amount : 
                     typeof dbBooking.amount === 'string' ? parseFloat(dbBooking.amount) || 0 : 0;
        const currency = (dbBooking.currency || 'USD').toLowerCase();
        const bookingDate = this.normalizeDate(dbBooking.booking_date || dbBooking.bookingDate);
        const checkInDate = dbBooking.check_in_date || dbBooking.checkInDate ? 
            this.normalizeDate(dbBooking.check_in_date || dbBooking.checkInDate) : null;
        const checkOutDate = dbBooking.check_out_date || dbBooking.checkOutDate ?
            this.normalizeDate(dbBooking.check_out_date || dbBooking.checkOutDate) : null;
        const provider = dbBooking.provider ? String(dbBooking.provider) : 'unknown';
        const providerBookingId = dbBooking.provider_booking_id || dbBooking.providerBookingId ?
            String(dbBooking.provider_booking_id || dbBooking.providerBookingId) : '';
        const providerReferenceId = dbBooking.provider_reference_id || dbBooking.providerReferenceId ?
            String(dbBooking.provider_reference_id || dbBooking.providerReferenceId) : null;
        const cancellationReason = dbBooking.cancellation_reason || dbBooking.cancellationReason || null;
        const notes = dbBooking.notes || null;
        const metadata = dbBooking.metadata && typeof dbBooking.metadata === 'object' ? 
            { ...dbBooking.metadata } : {};
        const createdAt = this.normalizeDate(dbBooking.created_at || dbBooking.createdAt || new Date());
        const updatedAt = this.normalizeDate(dbBooking.updated_at || dbBooking.updatedAt || new Date());
        const deletedAt = dbBooking.deleted_at || dbBooking.deletedAt ?
            this.normalizeDate(dbBooking.deleted_at || dbBooking.deletedAt) : null;

        return {
            id,
            reference,
            type,
            status,
            bookingDate,
            amount,
            currency,
            provider,
            userId,
            organizationId,
            providerBookingId,
            providerReferenceId,
            checkInDate,
            checkOutDate,
            tripId: dbBooking.tripId ? String(dbBooking.tripId) : null,
            activityId: dbBooking.activityId ? String(dbBooking.activityId) : null,
            notes,
            cancellationPolicy: dbBooking.cancellationPolicy || null,
            cancellationDeadline: dbBooking.cancellationDeadline ? 
                this.normalizeDate(dbBooking.cancellationDeadline) : null,
            cancellationReason,
            metadata,
            createdAt,
            updatedAt,
            deletedAt
        };
    }

    /**
     * Normalize booking dates from various formats
     */
    private normalizeBookingDates(booking: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) {
        const result: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ = {
            ...booking,
            id: String(booking.id),
            createdAt: this.normalizeDate(booking.created_at || booking.createdAt || new Date()),
            updatedAt: this.normalizeDate(booking.updated_at || booking.updatedAt || new Date()),
            bookingDate: this.normalizeDate(booking.booking_date || booking.bookingDate || new Date()),
            checkInDate: booking.check_in_date || booking.checkInDate ? 
                this.normalizeDate(booking.check_in_date || booking.checkInDate) : null,
            checkOutDate: booking.check_out_date || booking.checkOutDate ? 
                this.normalizeDate(booking.check_out_date || booking.checkOutDate) : null,
            cancellationDeadline: booking.cancellation_deadline || booking.cancellationDeadline ?
                this.normalizeDate(booking.cancellation_deadline || booking.cancellationDeadline) : null
        };

        // Remove any undefined values
        Object.keys(result).forEach(key => result[key] === undefined && delete result[key]);
        return result;
    }

    async findAll(params: BookingSearchParams = {}): Promise<SharedBooking[]> {
        try {
            // Convert params to repository format
            const repoParams: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ = { ...params };
            
            // Map snake_case to camelCase for repository
            if (params.userId) repoParams.user_id = params.userId;
            if (params.organizationId) repoParams.organization_id = params.organizationId;
            if (params.status) {
                const status = Array.isArray(params.status) ? params.status[0] : params.status;
                repoParams.status = this.getValidStatus(status);
            }
            if (params.type) {
                const type = Array.isArray(params.type) ? params.type[0] : params.type;
                repoParams.type = this.getValidType(type);
            }
            
            // Fetch bookings from repository
            const dbBookings = await this.bookingRepository.searchBookings({
                ...repoParams,
                limit: params.limit || 100,
                offset: params.offset || 0,
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });

            // Map database bookings to shared bookings with proper type safety
            return dbBookings.map((booking: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
                // Normalize the booking data
                const normalized = this.normalizeBookingDates(booking);
                
                // Map to SharedBooking type with proper type safety
                const sharedBooking: SharedBooking = {
                    id: String(normalized.id || ''),
                    userId: String(normalized.user_id || normalized.userId || ''),
                    organizationId: String(normalized.organization_id || normalized.organizationId || ''),
                    reference: String(normalized.reference || ''),
                    type: this.getValidType(normalized.type),
                    status: this.getValidStatus(normalized.status),
                    amount: normalized.amount ? Number(normalized.amount) : 0,
                    currency: normalized.currency || 'USD',
                    bookingDate: this.normalizeDate(normalized.booking_date || normalized.bookingDate || new Date()),
                    checkInDate: normalized.check_in_date || normalized.checkInDate ? 
                        this.normalizeDate(normalized.check_in_date || normalized.checkInDate) : undefined,
                    checkOutDate: normalized.check_out_date || normalized.checkOutDate ?
                        this.normalizeDate(normalized.check_out_date || normalized.checkOutDate) : undefined,
                    provider: normalized.provider || undefined,
                    providerBookingId: normalized.provider_booking_id || normalized.providerBookingId || undefined,
                    providerReferenceId: normalized.provider_reference_id || normalized.providerReferenceId || undefined,
                    cancellationReason: normalized.cancellation_reason || normalized.cancellationReason || null,
                    notes: normalized.notes || null,
                    metadata: normalized.metadata && typeof normalized.metadata === 'object' ? 
                        { ...normalized.metadata } : {},
                    createdAt: this.normalizeDate(normalized.created_at || normalized.createdAt || new Date()),
                    updatedAt: this.normalizeDate(normalized.updated_at || normalized.updatedAt || new Date()),
                    deletedAt: normalized.deleted_at || normalized.deletedAt ?
                        this.normalizeDate(normalized.deleted_at || normalized.deletedAt) : undefined
                };
                
                return sharedBooking;
            });
        } catch (error) {
            this.logger.error('Error in findAll:', error);
            throw error;
        }
    }

    async remove(id: string): Promise<boolean> {
        return this.bookingRepository.delete(id);
    }

    async getBookingsByUserId(userId: string): Promise<SharedBooking[]> {
        const bookings = await this.bookingRepository.findByUserId(userId, {});
        return bookings.map(booking => {
            // Create a new object with properly typed fields
            const dbBooking: DbBooking & { 
                providerBookingId: string;
                providerReferenceId: string;
                cancellationReason: string | null;
                provider: string;
                amount: number;
                currency: string;
                bookingDate: Date;
                status: BookingStatus;
                type: BookingType;
                reference: string;
                userId: string;
                organizationId: string;
            } = {
                id: String(booking.id),
                reference: booking.reference || `BOOK-${String(booking.id).substring(0, 8).toUpperCase()}`,
                type: (booking.type || 'other') as BookingType, 
                status: (booking.status || 'pending') as BookingStatus, 
                bookingDate: this.normalizeDate(booking.bookingDate),
                checkInDate: booking.checkInDate ? this.normalizeDate(booking.checkInDate) : null,
                checkOutDate: booking.checkOutDate ? this.normalizeDate(booking.checkOutDate) : null,
                amount: Number(booking.amount) || 0,
                currency: (booking.currency || 'USD').toLowerCase(),
                provider: booking.provider || 'unknown',
                providerReferenceId: 'providerReferenceId' in booking ? 
                    String(booking.providerReferenceId) : 
                    (booking as any).provider_reference_id || '',
                userId: String(booking.userId || userId),
                organizationId: String(booking.organizationId || ''),
                tripId: booking.tripId ? String(booking.tripId) : null,
                activityId: booking.activityId ? String(booking.activityId) : null,
                notes: booking.notes || null,
                cancellationPolicy: booking.cancellationPolicy || null,
                cancellationDeadline: booking.cancellationDeadline ? 
                    this.normalizeDate(booking.cancellationDeadline) : null,
                cancellationReason: 'cancellationReason' in booking ? 
                    String((booking as any).cancellationReason || '') : null,
                metadata: booking.metadata && typeof booking.metadata === 'object' ? 
                    { ...booking.metadata } : {},
                createdAt: this.normalizeDate(
                    'createdAt' in booking ? 
                        booking.createdAt : 
                        (booking as any).created_at
                ),
                updatedAt: this.normalizeDate(
                    'updatedAt' in booking ? 
                        booking.updatedAt : 
                        (booking as any).updated_at
                ),
                providerBookingId: 'providerReferenceId' in booking ? 
                    String(booking.providerReferenceId) : 
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

    /**
     * Normalize a date input to a Date object
     * Handles string, number, or Date inputs
     */
    private normalizeDate(dateInput: string | number | Date | null | undefined): Date {
        if (!dateInput) return new Date();
        if (dateInput instanceof Date) return dateInput;
        return new Date(dateInput);
    }

    /**
     * Convert a database booking to the shared booking type
     */
    private mapToSharedBooking(
        dbBooking: DbBooking & {
            // Required fields
            id: string | number;
            reference: string;
            type: BookingType;
            status: BookingStatus;
            bookingDate: Date | string;
            amount: number | string | null;
            currency: string | null;
            provider: string;
            userId: string | number;
            organizationId: string | number;
            // Optional fields
            providerBookingId?: string;
            providerReferenceId?: string | null;
            checkInDate?: Date | string | null;
            checkOutDate?: Date | string | null;
            tripId?: string | number | null;
            activityId?: string | number | null;
            notes?: string | null;
            cancellationPolicy?: string | null;
            cancellationDeadline?: Date | string | null;
            cancellationReason?: string | null;
            metadata?: Record<string, unknown> | null;
            createdAt: Date | string;
            updatedAt: Date | string;
        }
    ): SharedBooking {
        // Convert database model to shared type with proper type handling
        const sharedBooking: SharedBooking = {
            // Required fields with proper type conversion
            id: String(dbBooking.id),
            reference: dbBooking.reference || `BOOK-${String(dbBooking.id).substring(0, 8).toUpperCase()}`,
            type: dbBooking.type || 'other',
            status: dbBooking.status || 'pending',
            
            // Date fields with proper conversion
            bookingDate: this.normalizeDate(dbBooking.bookingDate).toISOString(),
            checkInDate: dbBooking.checkInDate ? this.normalizeDate(dbBooking.checkInDate).toISOString() : null,
            checkOutDate: dbBooking.checkOutDate ? this.normalizeDate(dbBooking.checkOutDate).toISOString() : null,
            cancellationDeadline: dbBooking.cancellationDeadline ? 
                this.normalizeDate(dbBooking.cancellationDeadline).toISOString() : null,
            
            // Financial fields
            amount: dbBooking.amount !== null ? Number(dbBooking.amount) : 0,
            currency: dbBooking.currency || 'USD',
            
            // Provider information
            provider: dbBooking.provider || 'unknown',
            providerBookingId: dbBooking.providerBookingId || '',
            providerReferenceId: dbBooking.providerReferenceId || null,
            
            // User and organization
            userId: String(dbBooking.userId),
            organizationId: String(dbBooking.organizationId),
            
            // Optional references
            tripId: dbBooking.tripId ? String(dbBooking.tripId) : null,
            activityId: dbBooking.activityId ? String(dbBooking.activityId) : null,
            
            // Additional information
            notes: dbBooking.notes || null,
            cancellationPolicy: dbBooking.cancellationPolicy || null,
            cancellationReason: dbBooking.cancellationReason || null,
            
            // Metadata and timestamps
            metadata: dbBooking.metadata && typeof dbBooking.metadata === 'object' ? 
                { ...dbBooking.metadata } : {},
            createdAt: this.normalizeDate(dbBooking.createdAt).toISOString(),
            updatedAt: this.normalizeDate(dbBooking.updatedAt).toISOString(),
        };

        // Ensure we're not returning any undefined values
        Object.keys(sharedBooking).forEach(key => {
            if ((sharedBooking as any)[key] === undefined) {
                (sharedBooking as any)[key] = null;
            }
        });

        return sharedBooking;
    }}
