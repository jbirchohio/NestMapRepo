import { PerformanceMetrics } from '@/types/api';

// Augment AxiosRequestConfig to include metrics
declare module 'axios' {
  interface AxiosRequestConfig {
    metrics?: PerformanceMetrics;
  }

  interface InternalAxiosRequestConfig {
    metrics?: PerformanceMetrics;
  }
}
