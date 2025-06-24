// Shared activity types for client and server
export const activityStatuses = [
  'pending',
  'confirmed',
  'cancelled',
  'in_progress',
  'completed'
] as const;
export type ActivityStatus = typeof activityStatuses[number];

export const activityTypes = [
  'flight',
  'hotel',
  'restaurant',
  'attraction',
  'transport',
  'event',
  'other'
] as const;
export type ActivityType = typeof activityTypes[number];

export interface Activity {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  locationName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  type?: ActivityType;
  status: ActivityStatus;
  notes?: string;
  tripId: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
