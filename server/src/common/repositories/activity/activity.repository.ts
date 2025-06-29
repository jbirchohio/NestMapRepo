import { and, eq, gte, lte, inArray, SQL } from 'drizzle-orm';
import { db } from '../../../db/db.js';
import { activities } from '../../../db/schema/index.js'; // Using path alias with .js extension
import { BaseRepositoryImpl } from '../base.repository.js';
import type { ActivityRepository } from './activity.repository.interface.js';
import type { Activity, ActivityStatus, ActivityType } from '@shared/types/activity.js';
import logger from '../../utils/logger.js';

@Injectable()
export class ActivityRepositoryImpl 
  extends BaseRepositoryImpl<Activity, string, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>> 
  implements ActivityRepository {
  
  constructor() {
    super('activity', activities, activities.id);
  }

  protected async mapToModel(row: any): Promise<Activity> {
    if (!row) {
      throw new Error('Activity data is required');
    }
    
    if (!row.id || !row.tripId || !row.title || !row.date) {
      throw new Error('Invalid activity data: missing required fields');
    }
    
    return {
      id: row.id,
      tripId: row.tripId,
      organizationId: row.organizationId || '',
      title: row.title,
      date: row.date,
      time: row.time || undefined,
      locationName: row.locationName || undefined,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      notes: row.notes || undefined,
      tag: row.tag || undefined,
      assignedTo: row.assignedTo || undefined,
      order: row.order || 0,
      travelMode: row.travelMode || undefined,
      completed: row.completed || false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Computed fields
      startDate: row.date ? new Date(row.date).toISOString() : undefined,
      endDate: row.date ? new Date(row.date).toISOString() : undefined,
      description: row.notes || undefined,
      type: (row.tag as ActivityType) || 'other',
      status: row.completed ? 'completed' : 'pending',
      createdBy: row.createdBy || 'system'
    };
  }
  /**
   * Implementation of the ActivityRepository interface
   * Handles all database operations for activities
   */

  async findById(id: string): Promise<Activity | null> {
    this.logger.info(`Finding activity by id: ${id}`);
    
    try {
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);
      
      if (!activity) {
        this.logger.info(`Activity not found: ${id}`);
        return null;
      }
      
      return this.mapToModel(activity);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding activity by id ${id}: ${errorMessage}`);
      throw error;
    }
  }

  async findAll(): Promise<Activity[]> {
    this.logger.info({ message: 'Finding all activities' });
    
    try {
      const result = await db
        .select()
        .from(activities)
        .orderBy(activities.date);
        
        return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
    } catch (error) {
      this.logger.error({ 
        message: 'Error finding all activities', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async findByTripId(tripId: string): Promise<Activity[]> {
    this.logger.info(`Finding activities for trip: ${tripId}`);
    
    try {
      const result = await db
        .select()
        .from(activities)
        .where(eq(activities.tripId, tripId))
        .orderBy(activities.date);
        
      return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding activities for trip ${tripId}: ${errorMessage}`);
      throw error;
    }
  }

  async findByType(type: ActivityType, status?: ActivityStatus): Promise<Activity[]> {
    this.logger.info({ 
      message: 'Finding activities by type',
      type,
      status
    });
    
    try {
      const conditions = [eq(activities.tag, type)];
      
      if (status) {
        // Map status to completed field since our schema doesn't have status
        conditions.push(eq(activities.completed, status === 'completed'));
      }
      
      const results = await db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(activities.date);
        
      const mapped = [];
      for (const row of results) {
        const mappedRow = await this.mapToModel(row);
        if (mappedRow) {
          mapped.push(mappedRow);
        }
      }
      return mapped;
    } catch (error) {
      this.logger.error({
        message: 'Error finding activities by type',
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        status
      });
      throw error;
    }
  }

  async create(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const logData = {
      ...activityData,
      notes: (activityData.notes || '').substring(0, 100) + ((activityData.notes || '').length > 100 ? '...' : '')
    };
    this.logger.info(`Creating new activity: ${JSON.stringify(logData)}`);
    
    try {
      const [newActivity] = await db
        .insert(activities)
        .values({
          ...activityData,
          date: activityData.startDate ? new Date(activityData.startDate) : new Date(), // Default to current date if startDate is not provided
          time: activityData.time || null,
          locationName: activityData.locationName || null,
          latitude: activityData.latitude?.toString() || null,
          longitude: activityData.longitude?.toString() || null,
          notes: activityData.notes || null,
          tag: activityData.tag || null,
          assignedTo: activityData.assignedTo || null,
          travelMode: activityData.travelMode || null,
          completed: activityData.completed || false,
          order: activityData.order || 0,
          organizationId: activityData.organizationId || null,
          tripId: activityData.tripId
        })
        .returning();
        
      return this.mapToModel(newActivity);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating activity for trip ${activityData.tripId}: ${errorMessage}`);
      throw error;
    }
  }

  async createMany(activitiesData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Activity[]> {
    this.logger.info({ 
      message: 'Creating multiple activities', 
      count: activitiesData.length 
    });
    
    try {
      const insertData = activitiesData.map(activity => ({
        tripId: activity.tripId,
        organizationId: activity.organizationId,
        title: activity.title,
        date: activity.startDate ? new Date(activity.startDate) : new Date(),
        time: activity.time || null,
        locationName: activity.locationName || null,
        latitude: activity.latitude?.toString(),
        longitude: activity.longitude?.toString(),
        notes: activity.notes || null,
        tag: activity.tag || null,
        assignedTo: activity.assignedTo || null,
        travelMode: activity.travelMode || null,
        completed: activity.completed || false,
        order: activity.order || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await db
        .insert(activities)
        .values(insertData)
        .returning();
        
        return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
    } catch (error) {
      this.logger.error({ 
        message: 'Error creating multiple activities', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async update(id: string, activityData: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | null> {
    this.logger.info({ 
      message: 'Updating activity',
      activityId: id,
      updates: Object.keys(activityData)
    });
    
    try {
      const updateData: any /** FIXANYERROR: Replace 'any' */ = { updatedAt: new Date() };
      
      // Map update fields to schema
      if (activityData.title) updateData.title = activityData.title;
      if (activityData.startDate) updateData.date = new Date(activityData.startDate);
      if ('time' in activityData) updateData.time = activityData.time !== undefined ? activityData.time : null;
      if ('locationName' in activityData) updateData.locationName = activityData.locationName !== undefined ? activityData.locationName : null;
      if ('latitude' in activityData) updateData.latitude = activityData.latitude !== undefined ? activityData.latitude?.toString() : null;
      if ('longitude' in activityData) updateData.longitude = activityData.longitude !== undefined ? activityData.longitude?.toString() : null;
      const notes = activityData.notes && activityData.notes.length > 0 ? activityData.notes : null;
      if ('tag' in activityData) updateData.tag = activityData.tag !== undefined ? activityData.tag : null;
      if ('assignedTo' in activityData) updateData.assignedTo = activityData.assignedTo !== undefined ? activityData.assignedTo : null;
      if ('travelMode' in activityData) updateData.travelMode = activityData.travelMode !== undefined ? activityData.travelMode : null;
      if ('completed' in activityData) updateData.completed = activityData.completed !== undefined ? activityData.completed : false;
      if ('order' in activityData) updateData.order = activityData.order !== undefined ? activityData.order : 0;
      if ('notes' in activityData) updateData.notes = notes;
      
      const [result] = await db
        .update(activities)
        .set(updateData)
        .where(eq(activities.id, id))
        .returning();
        
      if (!result) {
        this.logger.warn({
          message: 'Activity not found for update',
          activityId: id
        });
        return null;
      }
      
      return this.mapToModel(result);
    } catch (error) {
      this.logger.error({
        message: 'Error updating activity',
        error: error instanceof Error ? error.message : 'Unknown error',
        activityId: id
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logger.info({ 
      message: 'Deleting activity',
      activityId: id
    });
    
    try {
      const result = await db
        .delete(activities)
        .where(eq(activities.id, id));
        
      const deleted = result.rowCount ? result.rowCount > 0 : false;
      
      this.logger.info({
        message: deleted ? 'Successfully deleted activity' : 'Activity not found',
        activityId: id
      });
      
      return deleted;
    } catch (error) {
      this.logger.error({
        message: 'Error deleting activity',
        error: error instanceof Error ? error.message : 'Unknown error',
        activityId: id
      });
      throw error;
    }
  }

  async deleteByTripId(tripId: string): Promise<boolean> {
    this.logger.info({ 
      message: 'Deleting activities by trip id', 
      tripId 
    });
    
    try {
      const result = await db
        .delete(activities)
        .where(eq(activities.tripId, tripId));
        
      const deleted = result.rowCount ? result.rowCount > 0 : false;
      
      this.logger.info({
        message: deleted ? 'Successfully deleted activities' : 'No activities found to delete',
        tripId,
        count: result.rowCount || 0
      });
      
      return deleted;
    } catch (error) {
      this.logger.error({ 
        message: 'Error deleting activities by trip id', 
        error: error instanceof Error ? error.message : 'Unknown error', 
        tripId 
      });
      throw error;
    }
  }

  async findByDateRange(tripId: string, startDate: Date, endDate: Date): Promise<Activity[]> {
    this.logger.info({ 
      message: 'Finding activities by date range', 
      tripId, 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });
    
    try {
      const result = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.tripId, tripId), 
          gte(activities.date, startDate), 
          lte(activities.date, endDate)
        ))
        .orderBy(activities.date);
        
        return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
    } catch (error) {
      this.logger.error({ 
        message: 'Error finding activities by date range', 
        error: error instanceof Error ? error.message : 'Unknown error', 
        tripId, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
      throw error;
    }
  }

  async reschedule(activityId: string, startDate: Date, endDate: Date): Promise<Activity | null> {
    this.logger.info({ 
      message: 'Rescheduling activity', 
      activityId, 
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    try {
      const [result] = await db
        .update(activities)
        .set({ 
          date: startDate, 
          updatedAt: new Date() 
        })
        .where(eq(activities.id, activityId))
        .returning();
        
      if (!result) {
        this.logger.warn({ 
          message: 'Activity not found for rescheduling', 
          activityId 
        });
        return null;
      }
      
      return this.mapToModel(result);
    } catch (error) {
      this.logger.error({ 
        message: 'Error rescheduling activity', 
        error: error instanceof Error ? error.message : 'Unknown error', 
        activityId 
      });
      throw error;
    }
  }

  async updateStatus(id: string, status: ActivityStatus): Promise<Activity | null> {
    this.logger.info(`Updating activity ${id} status to ${status}`);
    
    try {
      const [result] = await db
        .update(activities)
        .set({ 
          // Map status to completed flag for now since our schema doesn't have status
          completed: status === 'completed',
          updatedAt: new Date() 
        })
        .where(eq(activities.id, id))
        .returning();
        
      if (!result) {
        this.logger.warn(`Activity not found for status update: ${id}`);
        return null;
      }
      
      return this.mapToModel(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating status for activity ${id}: ${errorMessage}`);
      throw error;
    }
  }
}
