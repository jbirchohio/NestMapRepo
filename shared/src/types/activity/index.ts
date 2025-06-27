import { z } from 'zod';

/**
 * Base activity interface containing all common fields
 * This should be used as the source of truth for activity-related types
 */
export interface Activity {
  /** Unique identifier for the activity */
  id: string;
  
  /** Title or name of the activity */
  title: string;
  
  /** Date of the activity in ISO string format */
  date: string;
  
  /** Time of the activity in HH:mm format */
  time: string;
  
  /** Display name of the location */
  locationName: string;
  
  /** Optional unique identifier for the location */
  locationId?: string;
  
  /** Latitude coordinate (decimal degrees) */
  latitude?: string;
  
  /** Longitude coordinate (decimal degrees) */
  longitude?: string;
  
  /** Mode of transportation to this activity */
  travelMode: string;
  
  /** Additional notes about the activity */
  notes?: string;
  
  /** Category or tag for grouping/organization */
  tag?: string;
  
  /** User ID of the person this activity is assigned to */
  assignedTo?: string;
}

/**
 * Client-specific extensions to the base Activity type
 * Contains UI-specific or client-only fields
 */
export interface ClientActivity extends Activity {
  /** Estimated travel time from previous activity */
  travelTimeFromPrevious?: string;
  
  /** Distance from previous activity */
  travelDistanceFromPrevious?: string;
  
  /** Flag indicating if this activity has a scheduling conflict */
  conflict?: boolean;
  
  /** Flag indicating if this activity has a time conflict */
  timeConflict?: boolean;
}

/**
 * Schema for validating activity form data
 */
export const activityFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Invalid date format',
  }),
  time: z.string().min(1, 'Time is required'),
  locationName: z.string().min(1, 'Location is required'),
  travelMode: z.string().min(1, 'Travel mode is required'),
  notes: z.string().optional(),
  tag: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  assignedTo: z.string().optional(),
});

/**
 * Type inferred from the activity form schema
 */
export type ActivityFormValues = z.infer<typeof activityFormSchema>;

/**
 * Props for the ActivityModal component
 */
export interface ActivityModalProps {
  /** ID of the trip this activity belongs to */
  tripId: string;
  
  /** Date of the activity */
  date: Date;
  
  /** Optional existing activity data for editing */
  activity?: ClientActivity;
  
  /** Callback when the modal is closed */
  onClose: () => void;
  
  /** Callback when the activity is saved */
  onSave: () => void;
}

/**
 * Type guard to check if an object is a valid Activity
 */
export function isActivity(obj: unknown): obj is Activity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'date' in obj &&
    'time' in obj &&
    'locationName' in obj &&
    'travelMode' in obj
  );
}

/**
 * Type guard to check if an object is a valid ClientActivity
 */
export function isClientActivity(obj: unknown): obj is ClientActivity {
  return isActivity(obj);
}
