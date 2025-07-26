import type { Activity } from '../types/activity';

type ActivityInput = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;

export const transformActivityToFrontend = (activity: Activity): Activity => {
  const transformed = { ...activity };
  
  // Ensure dates are properly formatted as strings
  if (activity.startDate) {
    transformed.startDate = activity.startDate instanceof Date 
      ? activity.startDate.toISOString() 
      : activity.startDate;
  }
  
  if (activity.endDate) {
    transformed.endDate = activity.endDate instanceof Date 
      ? activity.endDate.toISOString() 
      : activity.endDate;
  }
  
  if (activity.createdAt) {
    transformed.createdAt = activity.createdAt instanceof Date 
      ? activity.createdAt.toISOString() 
      : activity.createdAt;
  }
  
  if (activity.updatedAt) {
    transformed.updatedAt = activity.updatedAt instanceof Date 
      ? activity.updatedAt.toISOString() 
      : activity.updatedAt;
  }
  
  return transformed;
};

export const transformActivityToDatabase = (activity: Partial<Activity>): Partial<ActivityInput> => {
  const { id, createdAt, updatedAt, ...rest } = activity;
  
  return {
    ...rest,
    // Add any necessary transformations here
    // For example, converting string dates to Date objects
    startDate: rest.startDate ? new Date(rest.startDate).toISOString() : undefined,
    endDate: rest.endDate ? new Date(rest.endDate).toISOString() : undefined,
  };
};

export const transformActivitiesToFrontend = (activities: Activity[]): Activity[] => 
  activities.map(transformActivityToFrontend);

export default {
  toFrontend: transformActivityToFrontend,
  toDatabase: transformActivityToDatabase,
  manyToFrontend: transformActivitiesToFrontend,
};

