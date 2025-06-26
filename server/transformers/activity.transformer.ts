import { Activity } from '../../shared/types/activity';

type ActivityInput = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;

// Helper function to safely convert Date to ISO string
const toISOString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : date;
};

export const transformActivityToFrontend = (activity: Activity): Activity => {
  return {
    ...activity,
    startDate: toISOString(activity.startDate),
    endDate: toISOString(activity.endDate),
    createdAt: toISOString(activity.createdAt) || '',
    updatedAt: toISOString(activity.updatedAt) || '',
    date: toISOString(activity.date) || ''
  };
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
export const transformActivitiesToFrontend = (activities: Activity[]): Activity[] => activities.map(transformActivityToFrontend);
export default {
    toFrontend: transformActivityToFrontend,
    toDatabase: transformActivityToDatabase,
    manyToFrontend: transformActivitiesToFrontend,
};
