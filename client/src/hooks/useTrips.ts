import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/schema/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuth } from '@/contexts/auth/useAuth';
import type { CreateTripDTO, UpdateTripDTO, TripQueryParams } from '@shared/types/trip/trip.dto';

import type { SharedTripType } from '@shared/schema/types/trip/SharedTripType';

// Client-side trip type with additional properties
export interface Trip extends SharedTripType {
  // Client-only property for guest mode
  isGuest?: boolean;
  
  // Client-side UI state
  sharingEnabled: boolean;
  completed: boolean;
  isPublic: boolean;
  sharePermission: 'view' | 'edit' | 'admin';
}

// Re-export the DTO types for consistency
export type { CreateTripDTO, UpdateTripDTO, TripQueryParams };

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

export function useTrips(params: TripQueryParams = {}) {
  const { isAuthenticated, user } = useAuth();
  const isCorporate = user?.role === 'admin'; // Matches UserRole type from shared types

  return useQuery<Trip[], Error>({
    queryKey: ['trips', { ...params, isCorporate }],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        // Handle guest mode
        return getGuestTrips();
      }

      // Handle authenticated user
      const queryParams = new URLSearchParams();
      
      // Add filter params with type safety
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        
        if (Array.isArray(value)) {
          value.forEach(v => v !== undefined && v !== null && queryParams.append(key, v.toString()));
        } else if (value instanceof Date) {
          queryParams.append(key, value.toISOString());
        } else if (typeof value === 'object') {
          // Handle nested objects (e.g., sorting)
          queryParams.append(key, JSON.stringify(value));
        } else {
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
        // Create a new guest trip with all required fields and defaults
        const now = new Date().toISOString();
        const defaultEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Create base trip data
        const baseTrip: SharedTripType = {
          id: Date.now(),
          userId: 0,
          title: tripData.title || 'New Trip',
          startDate: tripData.startDate || now,
          endDate: tripData.endDate || defaultEndDate,
          organizationId: 0,
          collaborators: {},
          updatedAt: now,
          createdAt: now,
          deletedAt: null,
          department: '',
          cost: 0,
          status: 'draft',
          city: '',
          country: '',
          location: ''
        };
        
        // Create the full trip with client properties
        const newTrip: Trip = {
          ...baseTrip,
          isGuest: true,
          sharingEnabled: false,
          completed: false,
          isPublic: false,
          sharePermission: 'view'
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
        
        // Get current trip with all required fields
        const currentTrip = guestTrips[tripIndex];
        if (!currentTrip) {
          throw new Error('Current trip not found');
        }

        // Create updated trip with all required fields
        const now = new Date().toISOString();
        const updatedTrip: Trip = {
          ...currentTrip,
          ...tripData,
          // Ensure required fields are preserved with proper types
          id: Number(currentTrip.id),
          userId: Number(currentTrip.userId),
          organizationId: Number(currentTrip.organizationId),
          title: currentTrip.title || 'Updated Trip',
          startDate: currentTrip.startDate || now,
          endDate: currentTrip.endDate || now,
          collaborators: currentTrip.collaborators || {},
          updatedAt: now,
          createdAt: currentTrip.createdAt || now,
          deletedAt: currentTrip.deletedAt || null,
          department: currentTrip.department || '',
          cost: currentTrip.cost || 0,
          status: currentTrip.status || 'draft',
          city: currentTrip.city || '',
          country: currentTrip.country || '',
          location: currentTrip.location || '',
          // Client-side properties
          sharingEnabled: currentTrip.sharingEnabled ?? false,
          completed: currentTrip.completed ?? false,
          isPublic: currentTrip.isPublic ?? false,
          sharePermission: currentTrip.sharePermission || 'view'
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
