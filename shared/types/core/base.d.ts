/**
 * Core type definitions that serve as the foundation for all other types
 */

declare namespace SharedTypes {
  // Primitive types
  type ID = string;
  type UUID = string;
  type ISO8601DateTime = string;
  type Email = string;
  type URL = string;
  type Nullable<T> = T | null;
  type Optional<T> = T | undefined;

  // Common interfaces
  interface Timestamps {
    created_at: ISO8601DateTime;
    updated_at: ISO8601DateTime;
    deleted_at?: ISO8601DateTime | null;
  }

  // Pagination
  interface PaginationParams {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }

  interface PaginatedResponse<T> {
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
  interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    meta?: Record<string, unknown>;
  }

  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  }

  // Helpers
  type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
  type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
}
