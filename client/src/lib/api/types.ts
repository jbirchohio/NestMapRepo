import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiSuccessResponse, ApiErrorResponse } from '@shared/schema/types/api';

export interface ApiConfig extends AxiosRequestConfig {
  /** Skip authentication for this request */
  skipAuth?: boolean;
  /** Skip error handling for this request */
  skipErrorHandling?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  config?: AxiosRequestConfig;
  response?: AxiosResponse<ApiErrorResponse>;
}

export interface ApiClientOptions extends AxiosRequestConfig {
  /** Base URL for all requests */
  baseURL: string;
  /** Default request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials with requests */
  withCredentials?: boolean;
  /** Handler for unauthenticated requests */
  onUnauthenticated?: () => void;
  /** Global error handler */
  onError?: (error: ApiError) => void;
}
