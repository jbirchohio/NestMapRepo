// Type definitions for the application

// Base Todo interface
interface Todo {
  id: string;
  task: string;
  completed: boolean;
  tripId: string;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: string;
}

// Base Note interface
interface Note {
  id: string;
  content: string;
  tripId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Re-export shared types for easier imports
export type { Todo, Note };

// Base Trip interface
interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  cityLatitude?: number;
  cityLongitude?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Base Activity interface
interface Activity {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Extended types with additional client-side properties
export interface ClientTrip extends Omit<Trip, 'cityLatitude' | 'cityLongitude'> {
  country: string;
  days?: Date[];
  city?: string;
  location?: string;
  completed?: boolean;
  status?: 'Active' | 'Completed';
  startDate: string;
  endDate: string;
  // City coordinates for map centering
  cityLatitude?: number;
  cityLongitude?: number;
  // Hotel/accommodation information
  hotel?: string;
  hotelLatitude?: number;
  hotelLongitude?: number;
  // Legacy coordinates (for backward compatibility)
  latitude?: number;
  longitude?: number;
  // Sharing-related properties
  isPublic?: boolean;
  sharingEnabled?: boolean;
  shareCode?: string;
  sharePermission?: 'view' | 'edit' | 'admin';
  collaborators?: Record<string, any>;
}

export interface ClientActivity extends Activity {
  date: string; // Make date required for client-side activities
  time?: string; // Time of the activity (used in ActivityItem and ActivityTimeline)
  travelTimeFromPrevious?: string;
  travelDistanceFromPrevious?: string;
  conflict?: boolean;
  timeConflict?: boolean; // For identical time conflicts
  completed?: boolean; // Track completion status of activities
  tag?: string; // Activity tag/category for display
  notes?: string; // Additional notes for the activity
  travelMode?: 'driving' | 'walking' | 'transit' | 'cycling' | string; // Mode of travel to this activity
}

export interface DayActivities {
  date: Date;
  activities: ClientActivity[];
}

// Map-related types
export interface MapMarker {
  id: number | string;
  longitude: number;
  latitude: number;
  label?: string;
  activity?: ClientActivity;
  completed?: boolean;
  color?: string; // Added color property for marker styling
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  duration: number;
  distance: number;
  color?: string; // Added color property for route styling
  geometry?: {
    type: string;
    coordinates: [number, number][];
  }; // Added geometry property for GeoJSON compatibility
}

// AI Assistant types
export interface AIResponse {
  summary?: string;
  suggestions?: FoodSuggestion[];
  conflicts?: Conflict[];
  themedItinerary?: ThemedItinerary;
  answer?: string;
  // For itinerary import
  activities?: ParsedActivity[];
}

export interface FoodSuggestion {
  name: string;
  type: string;
  description: string;
  priceRange: string;
  distance: string;
}

export interface Conflict {
  activityId1: number;
  activityId2: number;
  type: 'overlap' | 'tight_connection' | 'long_distance';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ThemedItinerary {
  title: string;
  description: string;
  activities: ThemedActivity[];
}

export interface ThemedActivity {
  time: string;
  title: string;
  location: string;
  description: string;
  tag: string;
}

export interface ParsedActivity {
  title: string;
  time: string;
  date: string;
  locationName: string;
  notes?: string;
  tag?: string;
  latitude?: string;
  longitude?: string;
}

// Form types
export interface ActivityFormData {
  title: string;
  date: Date;
  time: string;
  locationName: string;
  notes?: string;
  tag?: string;
  assignedTo?: string;
}

export interface TodoFormData {
  task: string;
  completed?: boolean;
  assignedTo?: string;
}

export interface NoteFormData {
  content: string;
}

// User-related types
export interface Collaborator {
  id: number;
  username: string;
  role: 'viewer' | 'editor' | 'commenter';
}

export interface ActivityModalProps {
  tripId: string;
  date: Date;
  activity?: ClientActivity;
  onClose: () => void;
  onSave: () => void;
}

// AI Trip Generation related types
export interface GeneratedTrip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  travelers: number;
  summary: string;
  days: TripDay[];
  flights: Flight[];
  accommodations: Accommodation[];
  activities: TripActivity[];
  meals: Meal[];
  tripSummary: TripSummary;
  trip_summary?: TripSummary; // Keep for backward compatibility
  client_access?: ClientAccess;
  created_at: string;
}

export interface TripDay {
  date: string;
  activities: TripActivity[];
}

export interface Flight {
  id: string;
  departure: string;
  arrival: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  price: number;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  check_in: string;
  check_out: string;
  price_per_night: number;
  rating: number;
}

export interface TripActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: number;
  location: string;
  price: number;
  category: string;
}

export interface Meal {
  id: string;
  name: string;
  restaurant: string;
  time: string;
  price: number;
  cuisine: string;
}

export interface TripSummary {
  total_cost: number;
  duration_days: number;
  activities_count: number;
  meals_count: number;
  flights_count: number;
  accommodations_count: number;
}

export interface ClientAccess {
  email: string;
  phone?: string;
  access_level: 'view' | 'edit';
}
