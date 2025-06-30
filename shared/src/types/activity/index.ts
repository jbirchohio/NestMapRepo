import { z } from 'zod';

// Import specific types from ActivityTypes to avoid conflicts
import type {
  ActivityData,
  ActivityFilterOptions,
  ActivityPaginationOptions,
  PaginatedActivityResponse,
  CreateActivityPayload,
  CollaborationEventType,
  CollaborationEvent,
  ActivityCreatedPayload,
  UserPresencePayload,
  SectionLockPayload
} from './ActivityTypes.js';

export const activityStatuses = [
  'pending',
  'confirmed',
  'cancelled',
  'in_progress',
  'completed'
] as const;

// Re-export specific types from ActivityTypes
export type { 
  ActivityData, 
  ActivityFilterOptions, 
  ActivityPaginationOptions, 
  PaginatedActivityResponse, 
  CreateActivityPayload, 
  CollaborationEventType, 
  CollaborationEvent, 
  ActivityCreatedPayload, 
  UserPresencePayload, 
  SectionLockPayload 
} from './ActivityTypes.js';

/**
 * Status of an activity
 */
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

/**
 * Type of activity
 */
export type ActivityType = typeof activityTypes[number];

/**
 * Activity interface containing all common fields
 * This is the main interface for activity-related types
 */
export interface Activity {
  // Core identifiers
  /** Unique identifier for the activity */
  id: string;
  
  /** ID of the trip this activity belongs to */
  tripId: string;
  
  /** ID of the organization this activity belongs to */
  organizationId: string;
  
  // Basic information
  /** Title or name of the activity */
  title: string;
  
  /** Detailed description of the activity */
  description?: string;
  
  /** Current status of the activity */
  status: ActivityStatus;
  
  // Timing information
  /** Date of the activity in ISO string format */
  date: string;
  
  /** Time of the activity in HH:mm format (legacy, prefer startTime/endTime) */
  time: string;
  
  /** Start time of the activity in HH:mm format */
  startTime?: string;
  
  /** End time of the activity in HH:mm format */
  endTime?: string;
  
  // Location information
  /** Display name of the location */
  locationName: string;
  
  /** Full address of the location */
  location?: string;
  
  /** Unique identifier for the location */
  locationId?: string;
  
  /** Latitude coordinate (decimal degrees) */
  latitude?: number | string;
  
  /** Longitude coordinate (decimal degrees) */
  longitude?: number | string;
  
  // Activity metadata
  /** Cost of the activity in the smallest currency unit (e.g., cents) */
  cost?: number;
  
  /** Whether the activity has been completed */
  completed: boolean;
  
  /** Order of the activity in the itinerary */
  order: number;
  
  /** Type of activity */
  type?: ActivityType;
  
  /** Mode of transportation to this activity */
  travelMode?: string;
  
  // User assignments and metadata
  /** ID of the user who created the activity */
  createdBy: string;
  
  /** ID of the user assigned to this activity */
  assignedTo?: string;
  
  /** When the activity was created */
  createdAt: string | Date;
  
  /** When the activity was last updated */
  updatedAt: string | Date;
  
  // Additional information
  /** Additional notes about the activity */
  notes?: string;
  
  /** Category or tag for grouping/organization */
  tag?: string;
  
  /** External URL for more information */
  url?: string;
  
  /** Whether the activity is private */
  isPrivate?: boolean;
  
  /** Priority level (1-5) */
  priority?: number;
  
  /** External ID if synced from another service */
  externalId?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Client-specific extensions to the base Activity type
 * Contains UI-specific or client-only fields that should not be sent to the server
 */
export interface ClientActivity extends Activity {
  // UI state fields
  /** Whether the activity is currently being edited */
  isEditing?: boolean;
  
  /** Whether the activity is currently loading */
  isLoading?: boolean;
  
  /** Whether the activity is selected in the UI */
  isSelected?: boolean;
  
  // Travel information
  /** Estimated travel time from previous activity (formatted string) */
  travelTimeFromPrevious?: string;
  
  /** Distance from previous activity (formatted string) */
  travelDistanceFromPrevious?: string;
  
  // Conflict detection
  /** Whether there's a scheduling conflict */
  conflict?: boolean;
  
  /** Whether there's a time conflict with other activities */
  timeConflict?: boolean;
  
  // UI state for expanded/collapsed views
  /** Whether details are expanded in the UI */
  isExpanded?: boolean;
  
  // Client-side only metadata
  /** Client-side only metadata */
  clientMetadata?: {
    /** When the activity was last viewed by the user */
    lastViewed?: Date;
    
    /** User preferences for this activity */
    preferences?: Record<string, unknown>;
    
    /** Temporary UI state */
    uiState?: Record<string, unknown>;
  };
}

/**
 * Schema for validating activity form data
 */
export const activityFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Invalid date format',
  }),
  time: z.string().min(1, 'Time is required'),
  locationName: z.string().min(1, 'Location is required'),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(activityStatuses).optional(),
  cost: z.number().optional(),
  completed: z.boolean().optional(),
  order: z.number().optional(),
  type: z.enum(activityTypes).optional(),
  travelMode: z.string().min(1, 'Travel mode is required'),
  createdBy: z.string().optional(),
  assignedTo: z.string().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
  notes: z.string().optional(),
  tag: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  organizationId: z.string().optional(),
  tripId: z.string().optional(),
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
