// Type definitions for the application
import { Trip, Activity, Todo, Note } from "@shared/schema";
// Re-export shared types for easier imports
export { Todo, Note };
// Extended types with additional client-side properties
export interface ClientTrip extends Trip {
    id: number | string;
    title: string;
    days?: Date[];
    city?: string;
    location?: string;
    // City coordinates for map centering
    cityLatitude?: string;
    cityLongitude?: string;
    // Hotel/accommodation information
    hotel?: string;
    hotelLatitude?: string;
    hotelLongitude?: string;
    // Legacy coordinates (for backward compatibility)
    latitude?: string;
    longitude?: string;
    // Sharing related fields
    isPublic?: boolean;
    sharingEnabled?: boolean;
    shareCode?: string | null;
    sharePermission?: 'read-only' | 'edit';
    collaborators?: Record<string, string> | string[];
}
export interface ClientActivity extends Activity {
    travelTimeFromPrevious?: string;
    travelDistanceFromPrevious?: string;
    conflict?: boolean;
    timeConflict?: boolean; // For identical time conflicts
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
}
export interface MapRoute {
    id: string;
    coordinates: [
        number,
        number
    ][];
    duration: number;
    distance: number;
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
