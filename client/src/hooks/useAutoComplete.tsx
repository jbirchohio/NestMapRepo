import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { ClientActivity } from '@/lib/types';

interface UseAutoCompleteProps {
  activities: ClientActivity[];
  tripId: number;
}

export function useAutoComplete({ activities, tripId }: UseAutoCompleteProps) {
  const autoCompleteMutation = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activityId}/toggle-complete`, {
        completed: true
      });
    },
    onSuccess: () => {
      // Invalidate activities query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
    },
  });

  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const checkAutoComplete = () => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      console.log(`Checking auto-completion at ${currentTime} on ${currentDate}`);
      
      // Sort activities by date first, then by time
      const sortedActivities = [...activities].sort((a, b) => {
        // Sort by date first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        // Then by time
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
        const activityDate = new Date(dateStr);
        
        for (let i = 0; i < dayActivities.length; i++) {
          const activity = dayActivities[i];
          const nextActivity = dayActivities[i + 1]; // Next activity same day
          
          // Skip if already completed or no time set
          if (activity.completed || !activity.time) continue;
          
          // Get the dates for comparison
          const activityDateStr = new Date(activity.date).toDateString();
          const currentDateStr = now.toDateString();
          
          // Get activity date for comparison
          const activityDate = new Date(activity.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day
          activityDate.setHours(0, 0, 0, 0); // Reset time to start of day
          
          // Determine if we should auto-complete this activity
          let shouldComplete = false;
          let reason = '';
          
          if (activityDate < today) {
            // Past day: auto-complete all activities
            shouldComplete = true;
            reason = 'activity was on a previous day';
          } else if (activityDate.getTime() === today.getTime()) {
            // Today: check time-based logic
            if (nextActivity && nextActivity.time) {
              // Same day: next activity time reached
              if (currentTime >= nextActivity.time) {
                shouldComplete = true;
                reason = 'next activity time reached (same day)';
              }
            } else {
              // Last activity of the day: auto-complete 2 hours after start time
              const activityEndTime = addHoursToTime(activity.time, 2);
              if (currentTime >= activityEndTime) {
                shouldComplete = true;
                reason = 'activity duration elapsed (2 hours)';
              }
            }
          }
          
          if (shouldComplete) {
            console.log(`Auto-completing activity "${activity.title}" on ${activityDateStr} - ${reason}`);
            autoCompleteMutation.mutate(activity.id);
          }
        }
      }
    };

    // Check immediately
    checkAutoComplete();

    // Set up interval to check every minute
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