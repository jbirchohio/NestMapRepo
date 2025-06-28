/**
 * API client types and interfaces
 */

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export interface ApiConfig extends RequestInit {
  /** Request body */
  data?: unknown;
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'formData';
  /** Whether to include credentials */
  withCredentials?: boolean;
  /** Base URL for the API */
  baseURL?: string;
  /** Request headers */
  headers?: HeadersInit;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Optional pagination info */
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Standard paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: unknown;
  /** Validation errors */
  errors?: Record<string, string[]>;
}
