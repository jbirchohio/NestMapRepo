import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuth } from '@/state/contexts/AuthContext';
import type { Trip, CreateTripDTO, UpdateTripDTO } from '@/shared/types/trip';

// Types
export interface GetTripsParams {
  status?: string[];
  limit?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  [key: string]: unknown; // Allow additional filter params
}

// Type guard to check if a trip has required details
const hasRequiredTripDetails = (trip: Trip): trip is Required<Trip> => {
  return 'title' in trip && 'startDate' in trip && 'endDate' in trip;
};

// Helper function to manage guest trips in localStorage
const getGuestTrip = (tripId: string | number): Trip | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('nestmap_guest_trips');
  if (!stored) return null;
  
  try {
    const guestTrips = JSON.parse(stored) as Trip[];
    return guestTrips.find(trip => trip.id === tripId) || null;
  } catch (error) {
    console.error('Error parsing guest trips:', error);
    return null;
  }
};

// Helper to get guest trips
const getGuestTrips = (): Trip[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem('nestmap_guest_trips');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as Trip[];
  } catch (error) {
    console.error('Error parsing guest trips:', error);
    return [];
  }
};

// Save guest trips to localStorage
const saveGuestTrips = (trips: Trip[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nestmap_guest_trips', JSON.stringify(trips));
};

// Main hook for trip-related operations
export function useTrip(tripId: string | number) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<Trip | null, Error>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        return getGuestTrip(tripId);
      }
      
      const response = await apiClient.get<Trip>(`${API_ENDPOINTS.TRIPS}/${tripId}`);
      return response.data;
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrips(params: GetTripsParams = {}) {
  const { isAuthenticated, user } = useAuth();
  const isCorporate = user?.role === 'admin'; // Changed to match our UserRole type

  return useQuery<Trip[], Error>({
    queryKey: ['trips', { ...params, isCorporate }],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        // Handle guest mode
        return getGuestTrips();
      }

      // Handle authenticated user
      const endpoint = API_ENDPOINTS.TRIPS;
      const queryParams = new URLSearchParams();
      
      // Add filter params
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const queryString = queryParams.toString();
      const url = queryString ? `${API_ENDPOINTS.TRIPS}?${queryString}` : API_ENDPOINTS.TRIPS;
      
      const response = await apiClient.get<Trip[]>(url);
      return response.data;
    },
    enabled: !!user || typeof window !== 'undefined',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateTrip() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, CreateTripDTO>({
    mutationFn: async (tripData) => {
      if (!isAuthenticated || !user) {
        // Handle guest mode
        const newTrip: Trip = {
          ...tripData,
          id: `guest-${Date.now()}`,
          isGuest: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const guestTrips = getGuestTrips();
        guestTrips.push(newTrip);
        saveGuestTrips(guestTrips);
        return newTrip;
      }

      // Handle authenticated user
      const response = await apiClient.post<Trip>(API_ENDPOINTS.TRIPS, tripData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip(tripId: string | number) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, UpdateTripDTO>({
    mutationFn: async (tripData) => {
      if (!isAuthenticated || !user) {
        // Handle guest mode
        const guestTrips = getGuestTrips();
        const tripIndex = guestTrips.findIndex(trip => trip.id === tripId);
        
        if (tripIndex === -1) {
          throw new Error('Trip not found in guest trips');
        }
        
        const updatedTrip: Trip = {
          ...guestTrips[tripIndex],
          ...tripData,
          updatedAt: new Date().toISOString(),
        };
        
        guestTrips[tripIndex] = updatedTrip;
        saveGuestTrips(guestTrips);
        return updatedTrip;
      }

      // Handle authenticated user
      const response = await apiClient.patch<Trip>(`${API_ENDPOINTS.TRIPS}/${tripId}`, tripData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      
      // Also invalidate any dashboard queries that might include this trip
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTrip() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string | number>({
    mutationFn: async (tripId) => {
      if (!isAuthenticated || !user) {
        // Handle guest mode
        const guestTrips = getGuestTrips();
        const updatedTrips = guestTrips.filter(trip => trip.id !== tripId);
        saveGuestTrips(updatedTrips);
        return;
      }

      // Handle authenticated user
      await apiClient.delete(`${API_ENDPOINTS.TRIPS}/${tripId}`);
    },
    onSuccess: (_, tripId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.removeQueries({ queryKey: ['trip', tripId] });
      
      // Also invalidate any dashboard queries that might include this trip
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDashboardTrips(params?: { limit?: number; status?: string[] }) {
    return useTrips({
        ...params,
        limit: params?.limit || 5,
    });
}
