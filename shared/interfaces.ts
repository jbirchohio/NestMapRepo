/**
 * @deprecated This file is maintained for backward compatibility only.
 * Please import types directly from their respective module paths:
 * - User types: './src/types/user'
 * - Trip types: './src/types/trip'
 * - Activity types: './src/types/trip/TripActivityTypes'
 * - Business trip types: './src/types/trip/BusinessTripTypes'
 */

import { WeatherInfo, Trip, Activity, BusinessTripRequest, LocationMatch, TripCostBreakdown, ConflictDetection, OptimizedSchedule  } from './src/types/trip';

// Re-export all types from their new locations
export type { Trip, LocationMatch, TripCostBreakdown, WeatherInfo } from './src/types/trip';
export type { Activity, ConflictDetection, OptimizedSchedule } from './src/types/trip/TripActivityTypes';
export type { BusinessTripRequest } from './src/types/trip/BusinessTripTypes';

// For backward compatibility with existing code
export type {
  Trip as ITrip,
  Activity as IActivity,
  BusinessTripRequest as IBusinessTripRequest,
  LocationMatch as ILocationMatch,
  TripCostBreakdown as ITripCostBreakdown,
  WeatherInfo as IWeatherInfo,
  ConflictDetection as IConflictDetection,
  OptimizedSchedule as IOptimizedSchedule
};