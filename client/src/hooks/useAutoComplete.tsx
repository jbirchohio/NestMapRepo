import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { ClientActivity } from '@/lib/types';

interface UseAutoCompleteProps {
  activities: ClientActivity[];
  tripId: number;
}

export function useAutoComplete({ activities, tripId }: UseAutoCompleteProps) {
  const [processedActivityIds, setProcessedActivityIds] = useState<Set<number>>(new Set());
  const processingRef = useRef<Set<number>>(new Set());

  const autoCompleteMutation = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activityId}/toggle-complete`, {
        completed: true
      });
    },
    onSuccess: (_, activityId) => {
      // Mark this activity as processed to prevent re-processing
      setProcessedActivityIds(prev => new Set(prev).add(activityId));
      processingRef.current.delete(activityId);
      // Invalidate activities query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
    },
    onError: (_, activityId) => {
      processingRef.current.delete(activityId);
    }
  });

  useEffect(() => {
    // Temporarily disabled auto-completion to debug the completion status issue
    // The activities should show as pending (orange markers) by default
    return;
  }, [activities, tripId, autoCompleteMutation]);

  return null; // This hook doesn't render anything
}

// Helper function to add hours to a time string
function addHoursToTime(timeString: string, hours: number): string {
  const [hoursStr, minutesStr] = timeString.split(':');
  const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + (hours * 60);
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}