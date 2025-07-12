import { Activity } from '../../shared/src/schema.js';

export interface ActivityRepository {
  // Activity retrieval
  findById(id: string): Promise<Activity | null>;
  findByTripId(tripId: string): Promise<Activity[]>;
  findAll(): Promise<Activity[]>;
  
  // Activity management
  create(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity>;
  update(id: string, activityData: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | null>;
  delete(id: string): Promise<boolean>;
  
  // Batch operations
  createMany(activitiesData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Activity[]>;
  deleteByTripId(tripId: string): Promise<boolean>;
  
  // Activity scheduling
  findByDateRange(tripId: string, startDate: Date, endDate: Date): Promise<Activity[]>;
  reschedule(activityId: string, startTime: Date, endTime: Date): Promise<Activity | null>;
}
