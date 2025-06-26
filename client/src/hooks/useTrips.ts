import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuth } from '../contexts/auth/AuthContext';

// Define local types since we're not using @shared/schema
type BaseTrip = {
    id: number | string;
    isGuest?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type TripWithDetails = BaseTrip & {
    title: string;
    startDate: string;
    endDate: string;
    description?: string;
    [key: string]: any; // For additional properties
};

type ClientTrip = BaseTrip | TripWithDetails;

// Type guard to check if a trip has required details
const hasRequiredTripDetails = (trip: ClientTrip): trip is TripWithDetails => {
    return 'title' in trip && 'startDate' in trip && 'endDate' in trip;
};

// Types
export interface GetTripsParams {
    status?: string[];
    limit?: number;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}

export interface CreateTripDTO {
    [key: string]: any;
}

export interface UpdateTripDTO {
    [key: string]: any;
}

// Helper function to check if trip exists in localStorage (guest mode)
const getGuestTrip = (tripId: string | number): ClientTrip | null => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('nestmap_guest_trips');
    if (!stored) return null;
    
    try {
        const guestTrips = JSON.parse(stored);
        return guestTrips.find((trip: ClientTrip) => trip.id === Number(tripId)) || null;
    } catch (error) {
        console.error('Error parsing guest trips:', error);
        return null;
    }
};

// Main hook for trip-related operations
export function useTrip(tripId: string | number) {
    const { user } = useAuth();
    const isGuest = !user;

    return useQuery<ClientTrip | null>({
        queryKey: ['trip', tripId],
        queryFn: async () => {
            if (isGuest) {
                return getGuestTrip(tripId);
            }
            
            try {
                const data = await apiRequest('GET', `${API_ENDPOINTS.TRIPS}/${tripId}`);
                return data;
            } catch (error) {
                console.error('Error fetching trip:', error);
                throw error;
            }
        },
        enabled: !!tripId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useTrips(params?: GetTripsParams) {
    const { user } = useAuth();
    const isCorporate = user?.role === 'corporate';

    return useQuery<ClientTrip[]>({
        queryKey: ['trips', { ...params, isCorporate }],
        queryFn: async () => {
            if (!user) {
                // Handle guest mode
                const stored = localStorage.getItem('nestmap_guest_trips');
                return stored ? JSON.parse(stored) : [];
            }

            // For now, use the regular trips endpoint for both corporate and regular users
            // until we have a dedicated corporate endpoint
            const endpoint = API_ENDPOINTS.TRIPS;
            
            const queryParams = new URLSearchParams();
            if (params?.status?.length) {
                params.status.forEach(status => queryParams.append('status', status));
            }
            if (params?.limit) {
                queryParams.append('limit', params.limit.toString());
            }
            if (isCorporate) {
                queryParams.append('corporate', 'true');
            }

            const url = `${endpoint}?${queryParams.toString()}`;
            return await apiRequest('GET', url);
        },
        enabled: !!user || typeof window !== 'undefined',
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useCreateTrip() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (tripData: CreateTripDTO) => {
            if (!user) {
                // Handle guest mode
                const newTrip: ClientTrip = {
                    ...tripData,
                    id: Date.now(),
                    isGuest: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const stored = localStorage.getItem('nestmap_guest_trips');
                const guestTrips = stored ? JSON.parse(stored) : [];
                localStorage.setItem('nestmap_guest_trips', JSON.stringify([...guestTrips, newTrip]));
                
                return newTrip;
            }

            return await apiRequest('POST', API_ENDPOINTS.TRIPS, tripData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
}

export function useUpdateTrip(tripId: string | number) {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (tripData: UpdateTripDTO) => {
            if (!user) {
                // Handle guest mode
                const stored = localStorage.getItem('nestmap_guest_trips');
                if (!stored) throw new Error('Trip not found');
                
                const guestTrips: ClientTrip[] = JSON.parse(stored);
                const tripIndex = guestTrips.findIndex(t => t.id === (typeof tripId === 'string' ? tripId : Number(tripId)));
                
                if (tripIndex === -1) throw new Error('Trip not found');
                
                const currentTrip = guestTrips[tripIndex];
                if (!currentTrip) {
                    throw new Error('Trip not found');
                }
                
                const updatedTrip: ClientTrip = {
                    ...currentTrip,
                    ...tripData,
                    id: currentTrip.id, // Ensure ID is preserved
                    updatedAt: new Date().toISOString(),
                };
                
                guestTrips[tripIndex] = updatedTrip;
                localStorage.setItem('nestmap_guest_trips', JSON.stringify(guestTrips));
                
                return updatedTrip;
            }

            return await apiRequest('PATCH', `${API_ENDPOINTS.TRIPS}/${tripId}`, tripData);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        },
    });
}

export function useDeleteTrip() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (tripId: string | number) => {
            if (!user) {
                // Handle guest mode
                const stored = localStorage.getItem('nestmap_guest_trips');
                if (stored) {
                    const guestTrips: ClientTrip[] = JSON.parse(stored);
                    const updatedTrips = guestTrips.filter(trip => trip.id !== Number(tripId));
                    localStorage.setItem('nestmap_guest_trips', JSON.stringify(updatedTrips));
                }
                return;
            }

            await apiRequest('DELETE', `${API_ENDPOINTS.TRIPS}/${tripId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
    });
}

export function useDashboardTrips(params?: { limit?: number; status?: string[] }) {
    return useTrips({
        ...params,
        limit: params?.limit || 5,
    });
}
