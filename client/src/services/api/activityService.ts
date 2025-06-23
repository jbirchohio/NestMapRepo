import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/api';
import type { ClientActivity } from '@/types/activity';

export interface Activity extends Omit<ClientActivity, 'id' | 'date' | 'time'> {
  id: string;
  date: string;
  time: string;
}

export interface CreateActivityDto {
  title: string;
  date: string;
  time: string;
  locationName: string;
  locationId?: string;
  latitude?: string;
  longitude?: string;
  travelMode: string;
  notes?: string;
  tag?: string;
  assignedTo?: string;
  tripId: string;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {
  id: string;
}

export const activityService = {
  async getActivities(tripId: string): Promise<ApiResponse<Activity[]>> {
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
    return {
      title: activity.title,
      date: activity.date,
      time: activity.time,
      locationName: activity.locationName,
      locationId: activity.locationId,
      latitude: activity.latitude,
      longitude: activity.longitude,
      travelMode: activity.travelMode,
      notes: activity.notes,
      tag: activity.tag,
      assignedTo: activity.assignedTo,
      tripId,
    };
  },

  // Helper to transform DTO to client activity
  toClientActivity(activity: Activity): ClientActivity {
    return {
      ...activity,
      date: activity.date,
      time: activity.time,
    };
  },
};
