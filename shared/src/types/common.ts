// Common types used across the application

export type Timezone = string; // e.g., 'America/New_York'
export type Locale = string; // e.g., 'en-US'
export type Currency = string; // e.g., 'USD', 'EUR'

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  socialMedia?: {
    [platform: string]: string; // e.g., twitter: 'username', facebook: 'username'
  };
}

export interface Image {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  type?: string;
  thumbnailUrl?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  path?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TimeRange {
  start: Date | string;
  end: Date | string;
  timezone?: Timezone;
  isAllDay?: boolean;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike' | 'isNull' | 'isNotNull';
  value: unknown;
}

export interface SearchOptions {
  query: string;
  fields: string[];
  limit?: number;
  offset?: number;
  highlight?: boolean;
  highlightPreTag?: string;
  highlightPostTag?: string;
  filter?: FilterCondition | FilterCondition[];
  sort?: SortOption | SortOption[];
}

export interface SearchResult<T> {
  hits: T[];
  total: number;
  query: string;
  took: number;
  highlights?: {
    [field: string]: string[];
  }[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[];
  noCache?: boolean;
  noStore?: boolean;
  revalidate?: boolean;
  staleWhileRevalidate?: boolean;
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per windowMs
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  handler?: (req: any, res: any) => void;
  onLimitReached?: (req: any, res: any, options: any) => void;
}
