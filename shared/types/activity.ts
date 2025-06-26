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
  tripId: string;
  organizationId: string;
  title: string;
  date: Date | string;
  time?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  tag?: string;
  assignedTo?: string;
  order: number;
  travelMode?: string;
  completed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Computed fields for compatibility
  startDate?: string;
  endDate?: string;
  description?: string;
  type?: ActivityType;
  status: ActivityStatus;
  createdBy: string;
}
