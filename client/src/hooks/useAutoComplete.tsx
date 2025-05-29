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
    if (!activities || activities.length === 0) return;

    const checkAutoComplete = () => {
      const now = new Date();
      console.log('🕐 Auto-completion check running at:', now.toLocaleString());
      
      // Sort activities by date first, then by time
      const sortedActivities = [...activities].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        if (!a.time || !b.time) return 0;
        return a.time.localeCompare(b.time);
      });

      // Group activities by date
      const activitiesByDate = sortedActivities.reduce((acc, activity) => {
        const dateStr = new Date(activity.date).toDateString();
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(activity);
        return acc;
      }, {} as Record<string, ClientActivity[]>);

      // Find activities that should be auto-completed
      for (const [dateStr, dayActivities] of Object.entries(activitiesByDate)) {
        for (let i = 0; i < dayActivities.length; i++) {
          const activity = dayActivities[i];
          const nextActivity = dayActivities[i + 1];
          
          // Skip if already completed, no time set, or already processed/processing
          if (activity.completed || !activity.time || 
              processedActivityIds.has(activity.id) || 
              processingRef.current.has(activity.id)) {
            continue;
          }
          
          // Get activity and current dates for comparison
          const activityDate = new Date(activity.date);
          const today = new Date();
          activityDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          
          let shouldComplete = false;
          let reason = '';
          
          if (activityDate < today) {
            // Past day: auto-complete all activities
            shouldComplete = true;
            reason = 'activity was on a previous day';
          } else if (activityDate.getTime() === today.getTime()) {
            // Today: check time-based logic
            const currentTime = now.toTimeString().slice(0, 5);
            
            if (nextActivity && nextActivity.time) {
              // Next activity time reached
              if (currentTime >= nextActivity.time) {
                shouldComplete = true;
                reason = 'next activity time reached';
              }
            } else {
              // Last activity: auto-complete 2 hours after start time
              const activityEndTime = addHoursToTime(activity.time, 2);
              if (currentTime >= activityEndTime) {
                shouldComplete = true;
                reason = 'activity duration elapsed (2 hours)';
              }
            }
          }
          
          if (shouldComplete) {
            processingRef.current.add(activity.id);
            autoCompleteMutation.mutate(activity.id);
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

// Helper function to add hours to a time string
function addHoursToTime(timeString: string, hours: number): string {
  const [hoursStr, minutesStr] = timeString.split(':');
  const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + (hours * 60);
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}