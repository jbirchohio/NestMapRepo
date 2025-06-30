/**
 * Core trip-related types
 */

import type { CollaboratorPresence } from '../CollaboratorPresence.js';

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
