import { apiClient } from './apiClient';

// Re-export the main apiClient with a new name
export const apiClientV2 = apiClient;

// Re-export the types needed for consumers
import type { ApiResponse, ApiErrorResponse } from '@/types/api';
export type { ApiResponse, ApiErrorResponse };

export default apiClientV2;
