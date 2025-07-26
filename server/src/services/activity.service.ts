import { db } from '../db/db';
import { activities } from '../db/schema';
import { and, eq } from '../utils/drizzle-shim';
import { sql } from '../utils/drizzle-shim';
import type { Activity } from '../types/activity';
import { v4 as uuidv4 } from 'uuid';
import type { InferSelectModel } from '../utils/drizzle-shim';

type ActivityRecord = InferSelectModel<typeof activities>;

export interface ActivityFilters {
  completed?: boolean;
  assignedTo?: string;
  date?: Date;
  organizationId?: string;
}

export interface ActivityFilters {
  status?: ActivityStatus;
  type?: ActivityType;
  startDate?: Date;
  endDate?: Date;
}

export const activityService = {
  async create(activityData: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const now = new Date();
    const newActivity = {
      id: uuidv4(),
      ...activityData,
      createdAt: now,
      updatedAt: now,
    };
    
    const [result] = await db.insert(activities)
      .values(newActivity)
      .returning();
    
    return this.mapToActivity(result);
  },

  async findById(id: string): Promise<Activity | null> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);
    
    return activity ? this.mapToActivity(activity) : null;
  },

  async findByTripId(tripId: string, filters: ActivityFilters = {}): Promise<Activity[]> {
    const conditions = [eq(activities.trip_id, tripId)];
    
    if (filters.completed !== undefined) {
      conditions.push(eq(activities.completed, filters.completed));
    }
    
    if (filters.assignedTo) {
      conditions.push(eq(activities.assigned_to, filters.assignedTo));
    }
    
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      conditions.push(
        sql`${activities.date} >= ${startOfDay} AND ${activities.date} <= ${endOfDay}`
      );
    }
    
    if (filters.organizationId) {
      conditions.push(eq(activities.organization_id, filters.organizationId));
    }
    
    const results = await db
      .select()
      .from(activities)
      .where(and(...conditions));
    
    return results as unknown as Activity[];
  },

  async update(
    id: string, 
    updates: Partial<Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Activity | null> {
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
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const exists = await this.exists(id);
    if (!exists) return null;
    
    await db
      .delete(activities)
      .where(eq(activities.id, id));
    
    return { id };
  },

  async exists(id: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(eq(activities.id, id));
    
    return Number(result?.count) > 0;
  },
};

export default activityService;



