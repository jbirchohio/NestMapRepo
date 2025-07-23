import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService } from '../services/api/tripService';
import { useAuth } from '@/providers/AuthProvider';
import { CreateTripDTO, UpdateTripDTO, GetTripsParams, TripCardDTO } from '../types/dtos/trip';

export const useTrips = (params?: GetTripsParams) => {
  const { user, isAuthenticated } = useAuth();
  const isCorporate = user?.role === 'corporate';

  return useQuery({
    queryKey: ['trips', { ...params, isCorporate }],
    queryFn: () => 
      isCorporate 
        ? tripService.getCorporateTrips(params)
        : tripService.getTrips(params),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTrip = (id: string) => {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getTripById(id),
    enabled: !!id,
  });
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tripData: CreateTripDTO) => tripService.createTrip(tripData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

export const useUpdateTrip = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: UpdateTripDTO) => tripService.updateTrip(id, updates),
    onSuccess: (updatedTrip) => {
      // Update the trip in the query cache
      queryClient.setQueryData(['trip', id], updatedTrip);
      // Invalidate the trips list to refetch
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => tripService.deleteTrip(id),
    onSuccess: (_, id) => {
      // Remove the trip from the cache
      queryClient.removeQueries({ queryKey: ['trip', id] });
      // Invalidate the trips list to refetch
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

export const useDashboardTrips = (params?: { limit?: number; status?: string[] }) => {
  return useQuery<TripCardDTO[]>({
    queryKey: ['dashboardTrips', params],
    queryFn: () => tripService.getDashboardTrips(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
