import { PrismaClient, Activity as PrismaActivity, ActivityStatus as PrismaActivityStatus, ActivityType as PrismaActivityType } from '@prisma/client';
import { ActivityRepository } from '../activity/activity.repository.interface.js';
import { Activity, ActivityStatus, ActivityType } from '@shared/schema/types/activity';
import { logger } from '../../../../utils/logger.js';

export class PrismaActivityRepository implements ActivityRepository {
    private readonly logger = logger;
    
    constructor(private readonly prisma: PrismaClient) {}

    private toDomainActivity(prismaActivity: PrismaActivity): Activity {
        return {
            id: prismaActivity.id,
            tripId: prismaActivity.tripId,
            name: prismaActivity.name,
            description: prismaActivity.description || undefined,
            type: prismaActivity.type as ActivityType,
            status: prismaActivity.status as ActivityStatus,
            startTime: prismaActivity.startTime,
            endTime: prismaActivity.endTime || undefined,
            location: prismaActivity.location || undefined,
            address: prismaActivity.address || undefined,
            cost: prismaActivity.cost ? Number(prismaActivity.cost) : undefined,
            currency: prismaActivity.currency || undefined,
            bookingReference: prismaActivity.bookingReference || undefined,
            notes: prismaActivity.notes || undefined,
            isFlexible: prismaActivity.isFlexible,
            createdAt: prismaActivity.createdAt,
            updatedAt: prismaActivity.updatedAt
        };
    }

    async findById(id: string): Promise<Activity | null> {
        try {
            const activity = await this.prisma.activity.findUnique({
                where: { id }
            });

            return activity ? this.toDomainActivity(activity) : null;
        } catch (error) {
            this.logger.error(`Failed to find activity by id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find activity');
        }
    }

    async findByTripId(tripId: string): Promise<Activity[]> {
        try {
            const activities = await this.prisma.activity.findMany({
                where: { tripId },
                orderBy: { startTime: 'asc' }
            });

            return activities.map(activity => this.toDomainActivity(activity));
        } catch (error) {
            this.logger.error(`Failed to find activities for trip ${tripId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find activities for trip');
        }
    }

    async findAll(): Promise<Activity[]> {
        try {
            const activities = await this.prisma.activity.findMany({
                orderBy: { startTime: 'desc' }
            });

            return activities.map(activity => this.toDomainActivity(activity));
        } catch (error) {
            this.logger.error(`Failed to find all activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find activities');
        }
    }

    async create(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
        try {
            const activity = await this.prisma.activity.create({
                data: {
                    tripId: activityData.tripId,
                    name: activityData.name,
                    description: activityData.description,
                    type: activityData.type as PrismaActivityType,
                    status: activityData.status as PrismaActivityStatus,
                    startTime: activityData.startTime,
                    endTime: activityData.endTime,
                    location: activityData.location,
                    address: activityData.address,
                    cost: activityData.cost,
                    currency: activityData.currency,
                    bookingReference: activityData.bookingReference,
                    notes: activityData.notes,
                    isFlexible: activityData.isFlexible ?? false
                }
            });

            return this.toDomainActivity(activity);
        } catch (error) {
            this.logger.error(`Failed to create activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create activity');
        }
    }

    async update(id: string, activityData: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | null> {
        try {
            const activity = await this.prisma.activity.update({
                where: { id },
                data: {
                    ...activityData,
                    type: activityData.type as PrismaActivityType | undefined,
                    status: activityData.status as PrismaActivityStatus | undefined
                }
            });

            return this.toDomainActivity(activity);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            this.logger.error(`Failed to update activity ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update activity');
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.prisma.activity.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
                return false;
            }
            this.logger.error(`Failed to delete activity ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async createMany(activities: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Activity[]> {
        try {
            const createdActivities = await this.prisma.$transaction(
                activities.map(activity => 
                    this.prisma.activity.create({
                        data: {
                            tripId: activity.tripId,
                            name: activity.name,
                            description: activity.description,
                            type: activity.type as PrismaActivityType,
                            status: activity.status as PrismaActivityStatus,
                            startTime: activity.startTime,
                            endTime: activity.endTime,
                            location: activity.location,
                            address: activity.address,
                            cost: activity.cost,
                            currency: activity.currency,
                            bookingReference: activity.bookingReference,
                            notes: activity.notes,
                            isFlexible: activity.isFlexible ?? false
                        }
                    })
                )
            );

            return createdActivities.map(activity => this.toDomainActivity(activity));
        } catch (error) {
            this.logger.error(`Failed to create multiple activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create activities');
        }
    }

    async updateStatus(id: string, status: ActivityStatus): Promise<Activity | null> {
        try {
            const activity = await this.prisma.activity.update({
                where: { id },
                data: { status: status as PrismaActivityStatus }
            });

            return this.toDomainActivity(activity);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            this.logger.error(`Failed to update status for activity ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update activity status');
        }
    }

    async countByTripId(tripId: string): Promise<number> {
        try {
            return await this.prisma.activity.count({
                where: { tripId }
            });
        } catch (error) {
            this.logger.error(`Failed to count activities for trip ${tripId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to count activities');
        }
    }

    async getUpcomingActivities(userId: string, limit: number = 5): Promise<Activity[]> {
        try {
            const now = new Date();
            const activities = await this.prisma.activity.findMany({
                where: {
                    trip: {
                        userId,
                        endDate: {
                            gte: now
                        }
                    },
                    startTime: {
                        gte: now
                    }
                },
                orderBy: {
                    startTime: 'asc'
                },
                take: limit
            });

            return activities.map(activity => this.toDomainActivity(activity));
        } catch (error) {
            this.logger.error(`Failed to get upcoming activities for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to get upcoming activities');
        }
    }
}
