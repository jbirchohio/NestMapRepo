import { prisma } from '../src/core/database/prisma';
import type { Activity, ActivityStatus, ActivityType } from '@shared/schema/types/activity';
import { v4 as uuidv4 } from 'uuid';
import { Activity as PrismaActivity } from '@prisma/client';

type ActivityRecord = PrismaActivity;

export interface ActivityFilters {
    completed?: boolean;
    assignedTo?: string;
    date?: Date;
    organizationId?: string;
    status?: ActivityStatus;
    type?: ActivityType;
    startDate?: Date;
    endDate?: Date;
}

class ActivityService {
    // Map database record to Activity model
    private mapToActivity(record: ActivityRecord): Activity {
        return {
            id: record.id,
            tripId: record.tripId,
            organizationId: record.organizationId || '',
            title: record.title,
            date: record.date,
            time: record.time || undefined,
            locationName: record.locationName || undefined,
            latitude: record.latitude ? parseFloat(record.latitude) : undefined,
            longitude: record.longitude ? parseFloat(record.longitude) : undefined,
            notes: record.notes || undefined,
            tag: (record.tag as ActivityType) || 'other',
            assignedTo: record.assignedTo || undefined,
            order: record.order || 0,
            travelMode: record.travelMode || undefined,
            completed: record.completed || false,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            // Computed fields for compatibility
            startDate: record.date ? record.date.toISOString() : undefined,
            endDate: record.date ? record.date.toISOString() : undefined,
            description: record.notes || undefined,
            type: (record.tag as ActivityType) || 'other',
            status: record.completed ? 'completed' : 'pending',
            createdBy: 'system' // Default value since createdBy is not in the database
        };
    }

    async create(activityData: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
        const result = await prisma.activity.create({
            data: {
                ...activityData,
                // Prisma handles id, createdAt, and updatedAt automatically with @default(uuid()) and @default(now()) / @updatedAt
            },
        });
        return this.mapToActivity(result);
    }

    async findById(id: string): Promise<Activity | null> {
        const activity = await prisma.activity.findUnique({
            where: { id },
        });
        return activity ? this.mapToActivity(activity) : null;
    }

    async findByTripId(tripId: string, filters: ActivityFilters = {}): Promise<Activity[]> {
        const where: any = { tripId };
        if (filters.completed !== undefined) {
            where.completed = filters.completed;
        }
        if (filters.assignedTo) {
            where.assignedTo = filters.assignedTo;
        }
        if (filters.date) {
            const startOfDay = new Date(filters.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filters.date);
            endOfDay.setHours(23, 59, 59, 999);
            where.date = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        if (filters.organizationId) {
            where.organizationId = filters.organizationId;
        }
        const results = await prisma.activity.findMany({
            where,
        });
        return results.map(activity => this.mapToActivity(activity));
    }

    async update(id: string, updates: Partial<Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | null> {
        const updated = await prisma.activity.update({
            where: { id },
            data: updates,
        });
        return this.mapToActivity(updated);
    }

    async delete(id: string): Promise<{ id: string } | null> {
        const deleted = await prisma.activity.delete({
            where: { id },
        });
        return deleted ? { id: deleted.id } : null;
    }

    async exists(id: string): Promise<boolean> {
        const count = await prisma.activity.count({
            where: { id },
        });
        return count > 0;
    }


}

const activityService = new ActivityService();
export default activityService;
