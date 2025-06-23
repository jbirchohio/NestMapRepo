import apiClient from './apiClient'; // Default import
import type { AgencyAnalyticsDTO, CorporateAnalyticsDTO, AnalyticsFilterParams } from '../../types/dtos/analytics.js';
import type { RequestConfig } from './types.js';
// Define local types since they're not in the DTOs
type TripAnalyticsDTO = any; // Replace with actual type when available
type UserAnalyticsDTO = any; // Replace with actual type when available
class AnalyticsService {
    private static instance: AnalyticsService;
    private basePath = '/analytics';
    private constructor() { }
    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }
    // Get agency analytics
    public async getAgencyAnalytics(params?: AnalyticsFilterParams, config?: RequestConfig): Promise<AgencyAnalyticsDTO> {
        return apiClient.get<AgencyAnalyticsDTO>(`${this.basePath}/agency`, { ...config, params });
    }
    // Get corporate analytics
    public async getCorporateAnalytics(params?: AnalyticsFilterParams, config?: RequestConfig): Promise<CorporateAnalyticsDTO> {
        return apiClient.get<CorporateAnalyticsDTO>(`${this.basePath}/corporate`, { ...config, params });
    }
    // Get analytics for a specific trip
    public async getTripAnalytics(tripId: string, config?: RequestConfig): Promise<TripAnalyticsDTO> {
        return apiClient.get<TripAnalyticsDTO>(`${this.basePath}/trips/${tripId}`, config);
    }
    // Get user-specific analytics
    public async getUserAnalytics(userId: string, params?: Omit<AnalyticsFilterParams, 'userId'>, config?: RequestConfig): Promise<UserAnalyticsDTO> {
        return apiClient.get<UserAnalyticsDTO>(`${this.basePath}/users/${userId}`, { ...config, params });
    }
}
export const analyticsService = AnalyticsService.getInstance();
