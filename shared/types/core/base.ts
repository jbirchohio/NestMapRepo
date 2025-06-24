/**
 * Core type definitions that serve as the foundation for all other types
 */

// Primitive types
export type ID = string;
export type UUID = string;
export type ISO8601DateTime = string;
export type Email = string;
export type URL = string;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Common interfaces
export interface Timestamps {
  created_at: ISO8601DateTime;
  updated_at: ISO8601DateTime;
  deleted_at?: ISO8601DateTime | null;
}

// Base model with common fields
export interface BaseModel {
  id: ID;
  created_at?: ISO8601DateTime;
  updated_at?: ISO8601DateTime;
  deleted_at?: ISO8601DateTime | null;
}

// Pagination
export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
  };
}

// API Response
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// Helpers
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
