import type { CollaboratorPresence } from './src/types/CollaboratorPresence';

/**
 * Shared interface definitions used across the application
 * This file centralizes common types to eliminate redundancy
 */

export interface Activity {
  id: number;
  title: string;
  time: string;
  duration?: number;
  locationName: string;
  latitude?: string;
  longitude?: string;
  day: number;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
  tag?: string;
  tripId?: number;
  completed?: boolean;
}

export interface Trip {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  city?: string;
  country?: string;
  duration?: number;
  budget?: string;
  accommodationType?: 'luxury' | 'business' | 'budget';
  groupSize?: number;
  userId: number;
  isPublic: boolean;
  sharingEnabled: boolean;
  completed: boolean;
  tripType: string;
  shareCode?: string;
  sharePermission?: 'read-only' | 'edit';
  collaborators?: CollaboratorPresence[];
}

export interface ConflictDetection {
  type: 'time_overlap' | 'location_conflict' | 'capacity_issue' | 'schedule_gap';
  severity: 'low' | 'medium' | 'high';
  activities: Activity[];
  description: string;
  suggestion: string;
  autoFixAvailable?: boolean;
}

export interface OptimizedSchedule {
  originalActivities: Activity[];
  optimizedActivities: Activity[];
  improvements: {
    timeSaved: number;
    conflictsResolved: number;
    efficiencyGain: number;
    travelTimeReduced: number;
  };
  recommendations: string[];
  conflicts: ConflictDetection[];
}

export interface BusinessTripRequest {
  clientName: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  workSchedule: {
    workDays: string[];
    workHours: string;
    meetingBlocks?: string[];
  };
  preferences: {
    foodTypes: string[];
    accommodationType: 'luxury' | 'business' | 'budget';
    activityTypes: string[];
    dietaryRestrictions?: string[];
    accessibility?: string[];
  };
  companyInfo: {
    name: string;
    industry: string;
    travelPolicy?: Record<string, unknown>;
  };
  tripPurpose: string;
  groupSize: number;
}

export interface LocationMatch {
  name: string;
  address?: string;
  fullAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  description?: string;
  confidence?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface TripCostBreakdown {
  flights: number;
  accommodation: number;
  meals: number;
  transportation: number;
  activities: number;
  contingency: number;
  total: number;
}

export interface WeatherInfo {
  temperature: {
    min: number;
    max: number;
    unit: string;
  };
  conditions: string;
  humidity: number;
  precipitation: number;
  recommendations: string[];
}

import type { UserRole } from './types/auth/permissions.js';

export interface User {
  id: number;
  auth_id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: UserRole;
  organization_id?: number;
  company?: string;
  job_title?: string;
  team_size?: string;
  use_case?: string;
  created_at: Date;
}