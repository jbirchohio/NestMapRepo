import { Injectable } from '@nestjs/common.js';
import { eq, and, between } from 'drizzle-orm';
import { db } from '../../shared/src/schema.js'/../../db.js';
import { activities, type Activity } from '../../shared/src/schema.js'/../../db/schema.js';
import { ActivityRepository } from './activity.repository.interface.js';
import { BaseRepositoryImpl } from '../base.repository.js';

@Injectable()
export class ActivityRepositoryImpl extends BaseRepositoryImpl<Activity, string, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>> implements ActivityRepository {
  constructor() {
    super('Activity', activities, activities.id);
  }

  async findByTripId(tripId: string): Promise<Activity[]> {
    this.logger.log(`Finding activities for trip: ${tripId}`);
    
    return db
      .select()
      .from(activities)
      .where(eq(activities.tripId, tripId))
      .orderBy(activities.startTime);
  }

  async createMany(activitiesData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Activity[]> {
    this.logger.log(`Creating ${activitiesData.length} activities`);
    
    if (activitiesData.length === 0) {
      return [];
    }
    
    return db
      .insert(activities)
      .values(activitiesData as any[])
      .returning();
  }

  async deleteByTripId(tripId: string): Promise<boolean> {
    this.logger.log(`Deleting all activities for trip: ${tripId}`);
    
    const result = await db
      .delete(activities)
      .where(eq(activities.tripId, tripId));
    
    return result.rowCount > 0;
  }

  async findByDateRange(tripId: string, startDate: Date, endDate: Date): Promise<Activity[]> {
    this.logger.log(`Finding activities for trip ${tripId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    return db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.tripId, tripId),
          between(activities.startTime, startDate, endDate)
        )
      )
      .orderBy(activities.startTime);
  }

  async reschedule(activityId: string, startTime: Date, endTime: Date): Promise<Activity | null> {
    this.logger.log(`Rescheduling activity ${activityId} to ${startTime.toISOString()} - ${endTime.toISOString()}`);
    
    const [updatedActivity] = await db
      .update(activities)
      .set({
        startTime,
        endTime,
        updatedAt: new Date()
      })
      .where(eq(activities.id, activityId))
      .returning();
    
    return updatedActivity || null;
  }
}
