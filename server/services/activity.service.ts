import { db } from '../db/db.js';
import { activities } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import type { Activity, ActivityStatus, ActivityType } from '@shared/types/activity.js';
import { v4 as uuidv4 } from 'uuid';
import type { InferSelectModel } from 'drizzle-orm';

type ActivityRecord = InferSelectModel<typeof activities>;

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

    async create(activityData: Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>): Promise<Activity> {
        const now = new Date();
        const newActivity = {
            id: uuidv4(),
            ...activityData,
            created_at: now,
            updated_at: now,
        };
        const [result] = await db.insert(activities)
            .values(newActivity)
            .returning();
        return this.mapToActivity(result);
    }

    async findById(id: string): Promise<Activity | null> {
        const [activity] = await db
            .select()
            .from(activities)
            .where(eq(activities.id, id))
            .limit(1);
        return activity ? this.mapToActivity(activity) : null;
    }

    async findByTripId(tripId: string, filters: ActivityFilters = {}): Promise<Activity[]> {
        const conditions = [eq(activities.tripId, tripId)];
        if (filters.completed !== undefined) {
            conditions.push(eq(activities.completed, filters.completed));
        }
        if (filters.assignedTo) {
            conditions.push(eq(activities.assignedTo, filters.assignedTo));
        }
        if (filters.date) {
            const startOfDay = new Date(filters.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filters.date);
            endOfDay.setHours(23, 59, 59, 999);
            conditions.push(sql`${activities.date} >= ${startOfDay} AND ${activities.date} <= ${endOfDay}`);
        }
        if (filters.organizationId) {
            conditions.push(eq(activities.organizationId, filters.organizationId));
        }
        const results = await db
            .select()
            .from(activities)
            .where(and(...conditions));
        return results.map(activity => this.mapToActivity(activity));
    }

    async update(id: string, updates: Partial<Omit<ActivityRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<Activity | null> {
        const existing = await this.findById(id);
        if (!existing) return null;
        
        const updateData = {
            ...updates,
            updated_at: new Date(),
        };
        
        const [updated] = await db
            .update(activities)
            .set(updateData)
            .where(eq(activities.id, id))
            .returning();
            
        return updated ? this.mapToActivity(updated) : null;
    }

    async delete(id: string): Promise<{ id: string } | null> {
        const exists = await this.exists(id);
        if (!exists) return null;
        
        await db
            .delete(activities)
            .where(eq(activities.id, id));
            
        return { id };
    }

    async exists(id: string): Promise<boolean> {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(activities)
            .where(eq(activities.id, id));
            
        return Number(result?.count) > 0;
    }


}

const activityService = new ActivityService();
export default activityService;
