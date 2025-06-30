import { PrismaClient, Trip as PrismaTrip, User as PrismaUser } from '@prisma/client';
import { TripRepository } from '../interfaces/trip.repository.interface.js';
import { CorporateTripDto } from '../interfaces/trip.service.interface.js';
import { logger } from '../../../utils/logger.js';

export class PrismaTripRepository implements TripRepository {
    private readonly logger = logger;
    
    constructor(private readonly prisma: PrismaClient) {}

    private toDomainTrip(prismaTrip: PrismaTrip & { user?: PrismaUser }): any {
        return {
            id: prismaTrip.id,
            userId: prismaTrip.userId,
            organizationId: prismaTrip.organizationId,
            title: prismaTrip.title,
            description: prismaTrip.description || undefined,
            startDate: prismaTrip.startDate,
            endDate: prismaTrip.endDate || undefined,
            destination: prismaTrip.destination || undefined,
            status: prismaTrip.status,
            isBusiness: prismaTrip.isBusiness,
            budget: prismaTrip.budget ? Number(prismaTrip.budget) : undefined,
            currency: prismaTrip.currency || 'USD',
            notes: prismaTrip.notes || undefined,
            tags: prismaTrip.tags || [],
            isRecurring: prismaTrip.isRecurring,
            recurrencePattern: prismaTrip.recurrencePattern || undefined,
            parentTripId: prismaTrip.parentTripId || undefined,
            isPublic: prismaTrip.isPublic,
            createdAt: prismaTrip.createdAt,
            updatedAt: prismaTrip.updatedAt,
            user: prismaTrip.user ? {
                id: prismaTrip.user.id,
                email: prismaTrip.user.email,
                firstName: prismaTrip.user.firstName || undefined,
                lastName: prismaTrip.user.lastName || undefined,
                // Add other user fields as needed
            } : undefined
        };
    }

    async findById(id: string): Promise<any | null> {
        try {
            const trip = await this.prisma.trip.findUnique({
                where: { id },
                include: { user: true }
            });
            return trip ? this.toDomainTrip(trip) : null;
        } catch (error) {
            this.logger.error(`Failed to find trip by id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find trip');
        }
    }

    async findAll(): Promise<any[]> {
        try {
            const trips = await this.prisma.trip.findMany({
                include: { user: true }
            });
            return trips.map(trip => this.toDomainTrip(trip));
        } catch (error) {
            this.logger.error(`Failed to find all trips: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find trips');
        }
    }

    async create(data: Omit<any, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
        try {
            const trip = await this.prisma.trip.create({
                data: {
                    ...data,
                    budget: data.budget,
                    tags: data.tags || [],
                    isBusiness: data.isBusiness || false,
                    isPublic: data.isPublic || false,
                    isRecurring: data.isRecurring || false,
                },
                include: { user: true }
            });
            return this.toDomainTrip(trip);
        } catch (error) {
            this.logger.error(`Failed to create trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create trip');
        }
    }

    async update(id: string, data: Partial<Omit<any, 'id' | 'createdAt' | 'updatedAt'>>): Promise<any | null> {
        try {
            const trip = await this.prisma.trip.update({
                where: { id },
                data: {
                    ...data,
                    budget: data.budget,
                    tags: data.tags,
                },
                include: { user: true }
            });
            return this.toDomainTrip(trip);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            this.logger.error(`Failed to update trip ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update trip');
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.prisma.trip.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
                return false;
            }
            this.logger.error(`Failed to delete trip ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async getTripsByUserId(userId: string, orgId: string): Promise<any[]> {
        try {
            const trips = await this.prisma.trip.findMany({
                where: {
                    userId,
                    organizationId: orgId
                },
                include: { user: true },
                orderBy: { startDate: 'desc' }
            });
            return trips.map(trip => this.toDomainTrip(trip));
        } catch (error) {
            this.logger.error(`Failed to find trips for user ${userId} in organization ${orgId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find trips');
        }
    }

    async getTripsByOrganizationId(orgId: string): Promise<any[]> {
        try {
            const trips = await this.prisma.trip.findMany({
                where: { organizationId: orgId },
                include: { user: true },
                orderBy: { startDate: 'desc' }
            });
            return trips.map(trip => this.toDomainTrip(trip));
        } catch (error) {
            this.logger.error(`Failed to find trips for organization ${orgId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find trips');
        }
    }

    async getTripById(tripId: string): Promise<any | null> {
        return this.findById(tripId);
    }

    async createTrip(tripData: Omit<any, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
        return this.create(tripData);
    }

    async updateTrip(tripId: string, tripData: Partial<Omit<any, 'id' | 'createdAt' | 'updatedAt'>>): Promise<any | null> {
        return this.update(tripId, tripData);
    }

    async deleteTrip(tripId: string): Promise<boolean> {
        return this.delete(tripId);
    }

    async getCorporateTrips(orgId: string): Promise<CorporateTripDto[]> {
        try {
            const trips = await this.prisma.trip.findMany({
                where: {
                    organizationId: orgId,
                    isBusiness: true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            role: true
                        }
                    }
                },
                orderBy: { startDate: 'desc' }
            });

            return trips.map(trip => ({
                ...this.toDomainTrip(trip),
                user: {
                    id: trip.user.id,
                    email: trip.user.email,
                    firstName: trip.user.firstName || '',
                    lastName: trip.user.lastName || '',
                    avatarUrl: trip.user.avatarUrl || undefined,
                    role: trip.user.role
                },
                // Add any additional fields needed for CorporateTripDto
            }));
        } catch (error) {
            this.logger.error(`Failed to get corporate trips for organization ${orgId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to get corporate trips');
        }
    }

    async checkTripAccess(tripId: string, user: any): Promise<boolean> {
        try {
            if (user.role === 'ADMIN') {
                return true;
            }

            const trip = await this.prisma.trip.findUnique({
                where: { id: tripId },
                select: { userId: true, organizationId: true, isPublic: true }
            });

            if (!trip) {
                return false;
            }

            // Check if the trip is public and the user is in the same organization
            if (trip.isPublic && trip.organizationId === user.organizationId) {
                return true;
            }

            // Check if the user is the owner of the trip
            return trip.userId === user.id;
        } catch (error) {
            this.logger.error(`Failed to check trip access for user ${user.id} on trip ${tripId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async count(filter?: any): Promise<number> {
        try {
            const where: any = {};
            
            if (filter) {
                if (filter.userId) where.userId = filter.userId;
                if (filter.organizationId) where.organizationId = filter.organizationId;
                if (filter.status) where.status = filter.status;
                if (filter.isBusiness !== undefined) where.isBusiness = filter.isBusiness;
            }

            return await this.prisma.trip.count({ where });
        } catch (error) {
            this.logger.error(`Failed to count trips: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to count trips');
        }
    }

    async exists(id: string): Promise<boolean> {
        try {
            const count = await this.prisma.trip.count({
                where: { id }
            });
            return count > 0;
        } catch (error) {
            this.logger.error(`Failed to check if trip exists ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    // Note: The withTransaction method is not implemented as Prisma handles transactions differently
    // You would typically use Prisma's transaction API directly in the service layer
}
