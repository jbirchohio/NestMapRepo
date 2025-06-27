import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/api/analyticsService';
import { useAuth } from '@/state/contexts/AuthContext';
import type { AnalyticsFilterParams, AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '@/shared/types/analytics';
import type { UserRole } from '@/shared/types/user';

type AnalyticsResponse = AgencyAnalyticsDTO | CorporateAnalyticsDTO;

interface UseAnalyticsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export const useAnalytics = (
  params?: AnalyticsFilterParams,
  options: UseAnalyticsOptions = { enabled: true }
) => {
  const { user } = useAuth();
  const isCorporate = user?.role === 'admin';
  
  return useQuery<AnalyticsResponse, Error>({
    queryKey: ['analytics', { ...params, isCorporate }],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      return isCorporate 
        ? analyticsService.getCorporateAnalytics(params)
        : analyticsService.getAgencyAnalytics(params);
    },
    enabled: !!user && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: options.refetchInterval,
  });
};

export const useAgencyAnalytics = (
  params?: AnalyticsFilterParams,
  options: UseAnalyticsOptions = {}
) => {
  return useQuery<AgencyAnalyticsDTO, Error>({
    queryKey: ['agencyAnalytics', params],
    queryFn: () => analyticsService.getAgencyAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
  });
};

export const useCorporateAnalytics = (
  params?: AnalyticsFilterParams,
  options: UseAnalyticsOptions = {}
) => {
  return useQuery<CorporateAnalyticsDTO, Error>({
    queryKey: ['corporateAnalytics', params],
    queryFn: () => analyticsService.getCorporateAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
  });
};

export const useTripAnalytics = (
  tripId: string,
  options: UseAnalyticsOptions = {}
) => {
  return useQuery<AgencyAnalyticsDTO, Error>({
    queryKey: ['tripAnalytics', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('Trip ID is required');
      return analyticsService.getTripAnalytics(tripId);
    },
    enabled: !!tripId && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: options.refetchInterval,
  });
};

export const useUserAnalytics = (
  userId: string,
  params?: Omit<AnalyticsFilterParams, 'userId'>,
  options: UseAnalyticsOptions = {}
) => {
  return useQuery<AgencyAnalyticsDTO, Error>({
    queryKey: ['userAnalytics', userId, params],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return analyticsService.getUserAnalytics(userId, params);
    },
    enabled: !!userId && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: options.refetchInterval,
  });
};
