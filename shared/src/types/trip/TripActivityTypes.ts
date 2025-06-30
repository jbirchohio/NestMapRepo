/**
 * Types related to trip activities
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
