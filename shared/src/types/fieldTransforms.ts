// Type definitions for field transformation utilities

export interface TripData {
  title?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  organizationId?: number;
  isPublic?: boolean;
  shareCode?: string;
  sharingEnabled?: boolean;
  sharePermission?: string;
  cityLatitude?: number;
  cityLongitude?: number;
  hotelLatitude?: number;
  hotelLongitude?: number;
  completedAt?: string;
  tripType?: string;
  clientName?: string;
  projectType?: string;
  city?: string;
  country?: string;
  location?: string;
  hotel?: string;
  completed?: boolean;
  budget?: number;
  collaborators?: any[]; // TODO: Define proper collaborator type
  organization?: any; // TODO: Define proper organization type
}

export interface DatabaseTripData {
  title?: string;
  start_date?: string;
  end_date?: string;
  user_id?: number;
  organization_id?: number;
  is_public?: boolean;
  share_code?: string;
  sharing_enabled?: boolean;
  share_permission?: string;
  city_latitude?: number;
  city_longitude?: number;
  hotel_latitude?: number;
  hotel_longitude?: number;
  completed_at?: string;
  trip_type?: string;
  client_name?: string;
  project_type?: string;
  city?: string;
  country?: string;
  location?: string;
  hotel?: string;
  completed?: boolean;
  budget?: number;
  collaborators?: any[];
  organization?: any;
}

export interface ActivityData {
  tripId?: number;
  locationName?: string;
  organizationId?: number;
  assignedTo?: number;
  travelMode?: string;
  title?: string;
  date?: string;
  time?: string;
  order?: number;
  completed?: boolean;
  latitude?: string;
  longitude?: string;
  day?: number;
  duration?: number;
  description?: string;
  category?: string;
  price?: number;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  status?: string;
  notes?: string;
}

export interface DatabaseActivityData {
  trip_id?: number;
  location_name?: string;
  organization_id?: number;
  assigned_to?: number;
  travel_mode?: string;
  title?: string;
  date?: string;
  time?: string;
  order?: number;
  completed?: boolean;
  latitude?: string;
  longitude?: string;
  day?: number;
  duration?: number;
  description?: string;
  category?: string;
  price?: number;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  status?: string;
  notes?: string;
}

export type TransformableObject = Record<string, any>;
export type TransformedObject = Record<string, any>;
