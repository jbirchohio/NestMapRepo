// Type definitions for the application
import { Trip, Activity, Todo, Note } from "@shared/schema";

// Re-export shared types for easier imports
export { Todo, Note };

// ======================================
// CREATOR ECONOMY TYPES
// ======================================

export interface ClientTemplate {
  id: number;
  userId: number;
  title: string;
  slug: string;
  description?: string;
  price: string;
  currency: string;
  coverImage?: string;
  destinations: string[];
  duration?: number;
  tripData?: any;
  tags: string[];
  salesCount: number;
  rating?: string;
  reviewCount: number;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Additional client fields
  creator?: ClientCreatorProfile;
  hasPurchased?: boolean;
  reviews?: ClientTemplateReview[];
}

export interface ClientTemplatePurchase {
  id: number;
  templateId: number;
  buyerId: number;
  sellerId: number;
  price: string;
  platformFee: string;
  sellerEarnings: string;
  stripeFee?: string; // Stripe processing fee
  status: 'pending' | 'completed' | 'refunded';
  purchasedAt: Date;
  // Additional fields
  templateTitle?: string;
  templateSlug?: string;
}

export interface ClientCreatorProfile {
  userId: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  specialties: string[];
  socialTwitter?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  websiteUrl?: string;
  verified: boolean;
  featured: boolean;
  followerCount: number;
  totalTemplates: number;
  totalSales: number;
  averageRating?: string;
}

export interface ClientCreatorBalance {
  userId: number;
  availableBalance: string;
  pendingBalance: string;
  lifetimeEarnings: string;
  lifetimePayouts: string;
  totalSales: number;
  lastPayoutAt?: Date;
  payoutMethod?: string;
  payoutEmail?: string;
  taxInfoSubmitted: boolean;
  w9OnFile: boolean;
}

export interface ClientTemplateReview {
  id: number;
  templateId: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  rating: number;
  review?: string;
  helpfulCount: number;
  verifiedPurchase: boolean;
  creatorResponse?: string;
  creatorRespondedAt?: Date;
  createdAt: Date;
}

export interface ClientCreatorDashboard {
  profile: ClientCreatorProfile;
  balance: ClientCreatorBalance;
  metrics: {
    totalTemplates: number;
    publishedTemplates: number;
    totalViews: number;
    totalSales: number;
    totalRevenue: number;
    averagePrice: number;
    conversionRate: string;
  };
  templates: ClientTemplate[];
  recentSales: ClientTemplatePurchase[];
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

// Extended types with additional client-side properties
export interface ClientTrip {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  userId: number;
  organizationId?: number;
  isPublic?: boolean;
  shareCode?: string;
  sharingEnabled?: boolean;
  sharePermission?: string;
  city?: string;
  country?: string;
  location?: string;
  cityLatitude?: string;
  cityLongitude?: string;
  hotel?: string;
  hotelLatitude?: string;
  hotelLongitude?: string;
  tripType?: string;
  clientName?: string;
  projectType?: string;
  budget?: number;
  completed?: boolean;
  status?: string;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // Additional client-side properties
  days?: Date[];
  // Legacy coordinates (for backward compatibility)
  latitude?: string;
  longitude?: string;
}

export interface ClientActivity {
  id: number;
  tripId: number;
  organizationId?: number;
  title: string;
  date: Date;
  time: string;
  locationName: string;
  latitude?: string | null;
  longitude?: string | null;
  notes?: string | null;
  tag?: string | null;
  assignedTo?: string | null;
  order: number;
  travelMode?: string | null;
  completed?: boolean;
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
  coordinates: [number, number][];
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
