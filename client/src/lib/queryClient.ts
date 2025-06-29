
import { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api/client';

export const queryClient = new QueryClient();

export const apiRequest = async (method: string, url: string, data?: any) => {
  const response = await apiClient.request({
    method,
    url,
    data,
  });
  return response.data;
};

export const getQueryFn = (url: string) => async () => {
  const response = await apiClient.get(url);
  return response.data;
};
