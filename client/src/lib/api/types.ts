import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiSuccessResponse, ApiErrorResponse } from '@shared/types/api';

export interface ApiConfig extends AxiosRequestConfig {
  /** Whether to include auth token (default: true) */
  auth?: boolean;
  /** Whether to retry on auth failure (default: true) */
  retryOnAuthFailure?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  response?: AxiosResponse<ApiErrorResponse>;
}

export interface ApiClientOptions {
  /** Base URL for all requests */
  baseURL: string;
  /** Default request timeout in milliseconds */
  timeout?: number;
  /** Function to get auth token */
  getAuthToken?: () => string | null;
  /** Function to refresh auth token */
  refreshToken?: () => Promise<string | null>;
  /** Handler for unauthenticated requests */
  onUnauthenticated?: () => void;
  /** Global error handler */
  onError?: (error: unknown) => void;
}
