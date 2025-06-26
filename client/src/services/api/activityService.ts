import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/api';
import type { ClientActivity } from '@/lib/types';
import type { ActivityStatus, ActivityType } from '@shared/types/activity';

// Server-side activity type (uses string dates for API)
export interface Activity {
  // Required properties
  id: string;
  tripId: string;
  organizationId: string;
  title: string;
  date: string;  // ISO string format
  status: string;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Optional properties
  time?: string;
  locationName?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  tag?: string;
  assignedTo?: string;
  travelMode?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CreateActivityDto {
  // Required fields
  title: string;
  date: string;
  time: string;
  locationName: string;
  travelMode: string;
  
  // Optional fields
  locationId?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  tag?: string;
  assignedTo?: string;
  tripId?: string; // Made optional as it's handled in toCreateDto
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {
  id: string;
}

export const activityService = {
  async getActivities(tripId: string): Promise<ApiResponse<Activity[]>> {
    if (!tripId) {
      throw new Error('tripId is required for getActivities');
    }
    return apiClient.get(`/activities/trip/${tripId}`);
  },

  async getActivity(activityId: string): Promise<ApiResponse<Activity>> {
    return apiClient.get(`/activities/${activityId}`);
  },

  async createActivity(data: CreateActivityDto): Promise<ApiResponse<Activity>> {
    return apiClient.post('/activities', data);
  },

  async updateActivity(data: UpdateActivityDto): Promise<ApiResponse<Activity>> {
    const { id, ...updateData } = data;
    return apiClient.put(`/activities/${id}`, updateData);
  },

  async deleteActivity(activityId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/activities/${activityId}`);
  },

  // Helper to transform client activity to DTO
  toCreateDto(activity: ClientActivity, tripId: string): CreateActivityDto {
    // Ensure we have a valid date - use current date if not provided
    const activityDate = activity.date || new Date();
    
    // Ensure required string fields have values
    const title = activity.title || 'Untitled Activity';
    const time = activity.time || '12:00';
    const locationName = activity.locationName || '';
    const travelMode = activity.travelMode || 'walking';
    const tripIdValue = tripId || activity.tripId || '';
    
    if (!tripIdValue) {
      console.warn('No tripId provided to toCreateDto');
    }
    
    const dto: CreateActivityDto = {
      title,
      date: activityDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
      time,
      locationName,
      travelMode,
      tripId: tripIdValue,
    };

    // Handle latitude and longitude with proper type checking
    if (typeof activity.latitude === 'number' && !isNaN(activity.latitude)) {
      dto.latitude = activity.latitude.toString();
    } else if (activity.latitude !== undefined) {
      console.warn('Invalid latitude value:', activity.latitude);
    }
    
    if (typeof activity.longitude === 'number' && !isNaN(activity.longitude)) {
      dto.longitude = activity.longitude.toString();
    } else if (activity.longitude !== undefined) {
      console.warn('Invalid longitude value:', activity.longitude);
    }
    if (activity.notes) {
      dto.notes = activity.notes;
    }
    if (activity.tag) {
      dto.tag = activity.tag;
    }
    if (activity.assignedTo) {
      dto.assignedTo = activity.assignedTo;
    }

    return dto;
  },

  // Helper to transform DTO to client activity
  toClientActivity(activity: Activity): ClientActivity {
    // Convert string dates to Date objects with safe defaults
    const createdAt = activity.createdAt ? new Date(activity.createdAt) : new Date();
    const updatedAt = activity.updatedAt ? new Date(activity.updatedAt) : new Date();
    
    // Ensure all required string fields have non-null values
    const safeString = (value: string | undefined, defaultValue: string): string => 
      (value !== undefined && value !== null && value.trim() !== '') ? value.trim() : defaultValue;
      
    // Parse numeric values with safe defaults
    const safeNumber = (value: string | undefined): number | undefined => {
      if (!value) return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    };
    
    // Create a new object with all required properties
    const clientActivity: ClientActivity = {
      // Required properties from Activity with safe defaults
      id: activity.id,
      tripId: activity.tripId,
      organizationId: safeString(activity.organizationId, 'default-org'),
      title: safeString(activity.title, 'Untitled Activity'),
      date: activity.date ? new Date(activity.date) : new Date(),
      status: (activity.status as ActivityStatus) || 'pending',
      order: activity.order || 0,
      completed: activity.completed || false,
      createdAt,
      updatedAt,
      createdBy: safeString(activity.createdBy, 'system'),
      
      // Required string fields with explicit defaults
      time: safeString(activity.time, '12:00'),
      locationName: safeString(activity.locationName, 'Location not specified'),
      
      // Optional properties with proper type handling
      latitude: safeNumber(activity.latitude),
      longitude: safeNumber(activity.longitude),
      notes: activity.notes ? String(activity.notes) : undefined,
      tag: activity.tag ? String(activity.tag) : undefined,
      assignedTo: activity.assignedTo ? String(activity.assignedTo) : undefined,
      travelMode: safeString(activity.travelMode, 'walking'),
      type: (activity.type as ActivityType) || 'other',
      
      // Client-side specific properties with explicit defaults
      travelTimeFromPrevious: undefined,
      travelDistanceFromPrevious: undefined,
      conflict: false,
      timeConflict: false
    };

    return clientActivity;
  },
};
