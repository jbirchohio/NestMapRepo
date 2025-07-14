import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';
import type { ClientActivity } from '@/lib/types';

interface UseAutoCompleteProps {
  activities: ClientActivity[];
  tripId: string | number;
  onActivityCompleted?: () => void;
}

export function useAutoComplete({ activities, tripId, onActivityCompleted }: UseAutoCompleteProps) {
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
      // Trigger immediate callback for real-time updates
      if (onActivityCompleted) {
        onActivityCompleted();
      }
    },
    onError: (_, activityId) => {
      processingRef.current.delete(activityId);
    }
  });

  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const checkAutoComplete = () => {
      const now = new Date();
      console.log('🕐 Auto-completion check running at:', now.toLocaleString());
      
      // Sort activities by date first, then by startTime
      const sortedActivities = [...activities].sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateA.getTime() - dateB.getTime();
      });

      // Group activities by date
      const activitiesByDate = sortedActivities.reduce((acc, activity) => {
        const date = new Date(activity.startTime);
        const dateStr = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        ).toDateString();
        
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(activity);
        return acc;
      }, {} as Record<string, ClientActivity[]>);

      // Find activities that should be auto-completed
      for (const [_, dayActivities] of Object.entries(activitiesByDate)) {
        for (let i = 0; i < dayActivities.length; i++) {
          const activity = dayActivities[i];
          const nextActivity = dayActivities[i + 1];
          
          // Skip if already completed, no start time set, or already processed/processing
          const activityId = Number(activity.id);
          if (activity.completed || !activity.startTime || 
              processedActivityIds.has(activityId) || 
              processingRef.current.has(activityId)) {
            continue;
          }
          
          // Get activity and current dates for comparison
          const activityDate = new Date(activity.startTime);
          const today = new Date();
          activityDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          
          let shouldComplete = false;
          // Track reason for auto-completion (for debugging if needed)
          
          if (activityDate < today) {
            // Past day: auto-complete all activities
            shouldComplete = true;
            // Past day activity
          } else if (activityDate.getTime() === today.getTime()) {
            // Today: check time-based logic
            const currentTime = now.toTimeString().slice(0, 5);
            const activityTime = new Date(activity.startTime).toTimeString().slice(0, 5);
            
            if (nextActivity?.startTime) {
              // Next activity time reached
              const nextActivityTime = new Date(nextActivity.startTime).toTimeString().slice(0, 5);
              if (currentTime >= nextActivityTime) {
                shouldComplete = true;
                // Next activity time reached
              }
            } else {
              // Last activity: auto-complete 2 hours after start time
              const activityEndTime = addHoursToTime(activityTime, 2);
              if (currentTime >= activityEndTime) {
                shouldComplete = true;
                // Activity duration elapsed (2 hours)
              }
            }
          }
          
          if (shouldComplete) {
            processingRef.current.add(activityId);
            autoCompleteMutation.mutate(activityId);
          }
        }
      }
    };

    // Check immediately and set up interval
    checkAutoComplete();
    const interval = setInterval(checkAutoComplete, 60000);
    return () => clearInterval(interval);
  }, [activities, tripId, autoCompleteMutation]);

  return null; // This hook doesn't render anything
}

// Helper function to add hours to a time string (HH:MM format)
function addHoursToTime(timeString: string, hours: number): string {
  const [hoursStr, minutesStr] = timeString.split(':');
  const totalMinutes = parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10) + (hours * 60);
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}
