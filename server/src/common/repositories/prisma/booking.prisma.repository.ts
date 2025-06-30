import { PrismaClient, Booking as PrismaBooking, BookingStatus as PrismaBookingStatus, BookingType as PrismaBookingType } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository.interface.js';
import { BaseBooking, BookingStatus, BookingType, AnyBooking } from '@shared/schema/types/booking';
import { logger } from '../../../../utils/logger.js';

export class PrismaBookingRepository implements BookingRepository {
    private readonly logger = logger;
    
    constructor(private readonly prisma: PrismaClient) {}

    private toDomainBooking(prismaBooking: PrismaBooking): BaseBooking {
        return {
            id: prismaBooking.id,
            reference: prismaBooking.reference,
            userId: prismaBooking.userId,
            tripId: prismaBooking.tripId,
            type: prismaBooking.type as BookingType,
            status: prismaBooking.status as BookingStatus,
            provider: prismaBooking.provider,
            providerReferenceId: prismaBooking.providerReferenceId || undefined,
            title: prismaBooking.title,
            description: prismaBooking.description || undefined,
            startDate: prismaBooking.startDate,
            endDate: prismaBooking.endDate || undefined,
            amount: prismaBooking.amount ? Number(prismaBooking.amount) : 0,
            currency: prismaBooking.currency || 'USD',
            location: prismaBooking.location || undefined,
            details: prismaBooking.details as Record<string, unknown> || {},
            notes: prismaBooking.notes || undefined,
            isRefundable: prismaBooking.isRefundable,
            cancellationPolicy: prismaBooking.cancellationPolicy || undefined,
            cancellationDeadline: prismaBooking.cancellationDeadline || undefined,
            cancellationFee: prismaBooking.cancellationFee ? Number(prismaBooking.cancellationFee) : undefined,
            cancellationFeeCurrency: prismaBooking.cancellationFeeCurrency || undefined,
            cancellationReason: prismaBooking.cancellationReason || undefined,
            cancelledAt: prismaBooking.cancelledAt || undefined,
            cancelledBy: prismaBooking.cancelledBy || undefined,
            metadata: prismaBooking.metadata as Record<string, unknown> || {},
            createdAt: prismaBooking.createdAt,
            updatedAt: prismaBooking.updatedAt
        };
    }

    async findById(id: string): Promise<BaseBooking | null> {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id }
            });

            return booking ? this.toDomainBooking(booking) : null;
        } catch (error) {
            this.logger.error(`Failed to find booking by id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find booking');
        }
    }

    async create(data: Omit<BaseBooking, 'id' | 'createdAt' | 'updatedAt' | 'reference'>): Promise<BaseBooking> {
        try {
            const booking = await this.prisma.booking.create({
                data: {
                    ...data,
                    type: data.type as PrismaBookingType,
                    status: data.status as PrismaBookingStatus,
                    amount: data.amount,
                    cancellationFee: data.cancellationFee,
                    details: data.details as Prisma.JsonObject || {},
                    metadata: data.metadata as Prisma.JsonObject || {}
                }
            });

            return this.toDomainBooking(booking);
        } catch (error) {
            this.logger.error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create booking');
        }
    }

    async update(id: string, data: Partial<Omit<BaseBooking, 'id' | 'createdAt' | 'updatedAt' | 'reference'>>): Promise<BaseBooking | null> {
        try {
            const booking = await this.prisma.booking.update({
                where: { id },
                data: {
                    ...data,
                    type: data.type as PrismaBookingType | undefined,
                    status: data.status as PrismaBookingStatus | undefined,
                    amount: data.amount,
                    cancellationFee: data.cancellationFee,
                    details: data.details as Prisma.JsonObject | undefined,
                    metadata: data.metadata as Prisma.JsonObject | undefined
                }
            });

            return this.toDomainBooking(booking);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            this.logger.error(`Failed to update booking ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update booking');
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.prisma.booking.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
                return false;
            }
            this.logger.error(`Failed to delete booking ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async findByUserId(userId: string, options?: {
        status?: BookingStatus | BookingStatus[];
        type?: BookingType | BookingType[];
        startDate?: Date;
        endDate?: Date;
    }): Promise<BaseBooking[]> {
        try {
            const where: any = { userId };

            if (options?.status) {
                where.status = {
                    in: Array.isArray(options.status) ? options.status : [options.status]
                };
            }

            if (options?.type) {
                where.type = {
                    in: Array.isArray(options.type) ? options.type : [options.type]
                };
            }

            if (options?.startDate || options?.endDate) {
                where.OR = [];
                
                if (options.startDate) {
                    where.OR.push({
                        startDate: { gte: options.startDate }
                    });
                }
                
                if (options.endDate) {
                    where.OR.push({
                        endDate: { lte: options.endDate }
                    });
                }
            }

            const bookings = await this.prisma.booking.findMany({
                where,
                orderBy: { startDate: 'asc' }
            });

            return bookings.map(booking => this.toDomainBooking(booking));
        } catch (error) {
            this.logger.error(`Failed to find bookings for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find bookings');
        }
    }

    async findByTripId(tripId: string, options?: {
        status?: BookingStatus | BookingStatus[];
        type?: BookingType | BookingType[];
    }): Promise<BaseBooking[]> {
        try {
            const where: any = { tripId };

            if (options?.status) {
                where.status = {
                    in: Array.isArray(options.status) ? options.status : [options.status]
                };
            }


            if (options?.type) {
                where.type = {
                    in: Array.isArray(options.type) ? options.type : [options.type]
                };
            }

            const bookings = await this.prisma.booking.findMany({
                where,
                orderBy: { startDate: 'asc' }
            });

            return bookings.map(booking => this.toDomainBooking(booking));
        } catch (error) {
            this.logger.error(`Failed to find bookings for trip ${tripId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find bookings');
        }
    }

    async findByProviderReferenceId(providerReferenceId: string): Promise<BaseBooking | null> {
        try {
            const booking = await this.prisma.booking.findFirst({
                where: { providerReferenceId }
            });

            return booking ? this.toDomainBooking(booking) : null;
        } catch (error) {
            this.logger.error(`Failed to find booking by provider reference ${providerReferenceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find booking');
        }
    }

    async findByStatus(status: BookingStatus | BookingStatus[]): Promise<BaseBooking[]> {
        try {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    status: {
                        in: Array.isArray(status) ? status : [status]
                    }
                },
                orderBy: { startDate: 'asc' }
            });

            return bookings.map(booking => this.toDomainBooking(booking));
        } catch (error) {
            this.logger.error(`Failed to find bookings by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find bookings');
        }
    }

    async updateStatus(id: string, status: BookingStatus, metadata?: Record<string, unknown>): Promise<BaseBooking | null> {
        try {
            const data: any = { status: status as PrismaBookingStatus };
            
            if (metadata) {
                data.metadata = metadata as Prisma.JsonObject;
            }
            
            if (status === 'CANCELLED') {
                data.cancelledAt = new Date();
            }

            const booking = await this.prisma.booking.update({
                where: { id },
                data
            });

            return this.toDomainBooking(booking);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            this.logger.error(`Failed to update booking status for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update booking status');
        }
    }

    async cancelExpiredBookings(expiryDate: Date): Promise<number> {
        try {
            const result = await this.prisma.booking.updateMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lte: expiryDate },
                    OR: [
                        { expiryDate: { not: null, lte: new Date() } },
                        { expiryDate: null }
                    ]
                },
                data: {
                    status: 'CANCELLED' as PrismaBookingStatus,
                    cancelledAt: new Date(),
                    cancellationReason: 'Expired',
                    metadata: {
                        $merge: {
                            cancellationReason: 'Automatically cancelled due to expiration'
                        }
                    } as Prisma.JsonObject
                }
            });

            return result.count;
        } catch (error) {
            this.logger.error(`Failed to cancel expired bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to cancel expired bookings');
        }
    }

    async search(params: any): Promise<BaseBooking[]> {
        try {
            const { 
                query, 
                status, 
                type, 
                startDate, 
                endDate, 
                minAmount, 
                maxAmount,
                sortBy = 'startDate',
                sortOrder = 'asc',
                limit = 50,
                offset = 0
            } = params;

            const where: any = {};

            if (query) {
                where.OR = [
                    { reference: { contains: query, mode: 'insensitive' } },
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { location: { contains: query, mode: 'insensitive' } },
                    { providerReferenceId: { contains: query, mode: 'insensitive' } }
                ];
            }

            if (status) {
                where.status = {
                    in: Array.isArray(status) ? status : [status]
                };
            }

            if (type) {
                where.type = {
                    in: Array.isArray(type) ? type : [type]
                };
            }

            if (startDate || endDate) {
                where.AND = [];
                
                if (startDate) {
                    where.AND.push({
                        startDate: { gte: new Date(startDate) }
                    });
                }
                
                if (endDate) {
                    where.AND.push({
                        endDate: { lte: new Date(endDate) }
                    });
                }
            }

            if (minAmount !== undefined || maxAmount !== undefined) {
                where.amount = {};
                
                if (minAmount !== undefined) {
                    where.amount.gte = Number(minAmount);
                }
                
                if (maxAmount !== undefined) {
                    where.amount.lte = Number(maxAmount);
                }
            }

            const bookings = await this.prisma.booking.findMany({
                where,
                orderBy: { [sortBy]: sortOrder.toLowerCase() as 'asc' | 'desc' },
                take: limit,
                skip: offset
            });

            return bookings.map(booking => this.toDomainBooking(booking));
        } catch (error) {
            this.logger.error(`Failed to search bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to search bookings');
        }
    }

    async getStats(userId: string): Promise<{
        total: number;
        byStatus: Record<BookingStatus, number>;
        byType: Record<BookingType, number>;
        totalAmount: number;
        currency: string;
    }> {
        try {
            // Get total count
            const total = await this.prisma.booking.count({
                where: { userId }
            });

            // Get count by status
            const statusCounts = await this.prisma.booking.groupBy({
                by: ['status'],
                _count: true,
                where: { userId }
            });

            // Get count by type
            const typeCounts = await this.prisma.booking.groupBy({
                by: ['type'],
                _count: true,
                where: { userId }
            });

            // Get total amount
            const amountResult = await this.prisma.booking.aggregate({
                _sum: { amount: true },
                where: { 
                    userId,
                    status: { not: 'CANCELLED' }
                }
            });

            // Get the most common currency
            const currencyResult = await this.prisma.booking.groupBy({
                by: ['currency'],
                _count: true,
                where: { 
                    userId,
                    currency: { not: null }
                },
                orderBy: { _count: { currency: 'desc' } },
                take: 1
            });

            // Format the results
            const byStatus = statusCounts.reduce((acc, { status, _count }) => ({
                ...acc,
                [status]: _count
            }), {} as Record<BookingStatus, number>);

            const byType = typeCounts.reduce((acc, { type, _count }) => ({
                ...acc,
                [type]: _count
            }), {} as Record<BookingType, number>);

            return {
                total,
                byStatus,
                byType,
                totalAmount: Number(amountResult._sum.amount) || 0,
                currency: currencyResult[0]?.currency || 'USD'
            };
        } catch (error) {
            this.logger.error(`Failed to get booking stats for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to get booking stats');
        }
    }
}
