import Activity from '../../db/schema';
type ActivityType = typeof Activity;
import { BaseRepository } from '../base.repository.interface';

export interface ActivityRepository extends BaseRepository<ActivityType, string, Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'>>> {
  findById(id: string): Promise<ActivityType | null>;
  findById(id: string): Promise<ActivityType | null>;
  findByTripId(tripId: string): Promise<ActivityType[]>;
  findAll(): Promise<ActivityType[]>;

  // Activity management
  create(activityData: Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActivityType>;
  update(id: string, activityData: Partial<Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ActivityType | null>;
  delete(id: string): Promise<boolean>;
  
  // Batch operations
  createMany(activitiesData: Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<ActivityType[]>;
  deleteByTripId(tripId: string): Promise<boolean>;
  
  // Activity scheduling
  findByDateRange(tripId: string, startDate: Date, endDate: Date): Promise<ActivityType[]>;
  reschedule(activityId: string, startTime: Date, endTime: Date): Promise<ActivityType | null>;
}
