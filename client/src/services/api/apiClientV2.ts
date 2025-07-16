import getApiClient from './apiClient';

// Re-export the main apiClient with a new name
export const apiClientV2 = getApiClient();

// Re-export the types needed for consumers
import type { ApiResponse, ApiErrorResponse } from '@/types/api';
export type { ApiResponse, ApiErrorResponse };

export default apiClientV2;
