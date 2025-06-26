import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/api/analyticsService';
import { useAuth } from '../contexts/auth/NewAuthContext';
import { AnalyticsFilterParams, AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '../types/dtos/analytics';
import { UserRole } from '../types/dtos/common';

type AnalyticsResponse = AgencyAnalyticsDTO | CorporateAnalyticsDTO;

export const useAnalytics = (params?: AnalyticsFilterParams) => {
    const { user } = useAuth();
    const isCorporate = user?.role === 'admin'; // Changed from UserRole.CORPORATE to match User interface
    
    return useQuery<AnalyticsResponse, Error>({
        queryKey: ['analytics', { ...params, isCorporate }],
        queryFn: async () => {
            if (isCorporate) {
                return analyticsService.getCorporateAnalytics(params);
            }
            return analyticsService.getAgencyAnalytics(params);
        },
        enabled: !!user,
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
