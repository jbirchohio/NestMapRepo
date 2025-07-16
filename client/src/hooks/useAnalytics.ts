import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/api/analyticsService';
import { useAuth } from '../hooks/useAuth';
import { AnalyticsFilterParams, AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '../types/dtos/analytics';

export const useAnalytics = (params?: AnalyticsFilterParams) => {
  const { user, isAuthenticated } = useAuth();
  const isCorporate = user?.role === 'corporate';

  return useQuery({
    queryKey: ['analytics', { ...params, isCorporate }],
    queryFn: () => 
      isCorporate 
        ? analyticsService.getCorporateAnalytics(params)
        : analyticsService.getAgencyAnalytics(params),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAgencyAnalytics = (params?: AnalyticsFilterParams) => {
  return useQuery<AgencyAnalyticsDTO>({
    queryKey: ['agencyAnalytics', params],
    queryFn: () => analyticsService.getAgencyAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCorporateAnalytics = (params?: AnalyticsFilterParams) => {
  return useQuery<CorporateAnalyticsDTO>({
    queryKey: ['corporateAnalytics', params],
    queryFn: () => analyticsService.getCorporateAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTripAnalytics = (tripId: string) => {
  return useQuery({
    queryKey: ['tripAnalytics', tripId],
    queryFn: () => analyticsService.getTripAnalytics(tripId),
    enabled: !!tripId,
  });
};

export const useUserAnalytics = (userId: string, params?: Omit<AnalyticsFilterParams, 'userId'>) => {
  return useQuery({
    queryKey: ['userAnalytics', userId, params],
    queryFn: () => analyticsService.getUserAnalytics(userId, params),
    enabled: !!userId,
  });
};
