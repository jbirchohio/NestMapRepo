import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity, ClientTrip } from "@/lib/types";

export default function useActivities(tripId: string | number) {
  console.log('useActivities - Received tripId:', tripId, 'type:', typeof tripId);
  
  // Ensure tripId is a string or number, not an object
  const validTripId = typeof tripId === 'object' ? (tripId as any)?.id || String(tripId) : tripId;
  
  if (tripId !== validTripId) {
    console.warn('useActivities: tripId was an object, extracted ID:', validTripId, 'from:', tripId);
  }
  
  // Use validTripId for all operations
  tripId = validTripId;
  
  console.log('useActivities - Using tripId:', tripId, 'type:', typeof tripId);
  
  // Helper function to check if trip exists in localStorage (guest mode)
  const getGuestTrip = (): ClientTrip | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("remvana_guest_trips");
    if (!stored) return null;
    
    const guestTrips: ClientTrip[] = JSON.parse(stored);
    return guestTrips.find((trip: ClientTrip) => trip.id === tripId) || null;
  };

  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ClientActivity[]>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"],
    queryFn: async () => {
      if (!tripId) return [];
      
      // Check if this is guest mode by looking for trip in localStorage
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);
      
      if (isGuestTrip) {
        // For guest trips, get activities from localStorage
        const guestActivities = localStorage.getItem(`guest_activities_${tripId}`);
        if (guestActivities) {
          const activities: ClientActivity[] = JSON.parse(guestActivities);
          // Convert date strings back to Date objects for consistency
          const processedActivities = activities.map((activity: ClientActivity) => ({
            ...activity,
            date: new Date(activity.date)
          }));
          return processActivities(processedActivities);
        }
        return [];
      }
      
      console.log('useActivities - Fetching activities for tripId:', tripId, 'type:', typeof tripId);
      const activitiesUrl = `${API_ENDPOINTS.TRIPS}/${tripId}/activities`;
      console.log('useActivities - Activities URL:', activitiesUrl);
      const res = await apiRequest("GET", activitiesUrl);
      const activitiesData = res; // apiRequest already parses JSON
      
      // Process activities to add travel time information
      const processedActivities = processActivities(activitiesData);
      
      return processedActivities;
    },
    enabled: !!tripId,
    staleTime: 0, // Always refetch for guest mode activities
  });

  // Process activities to add travel time information and detect conflicts
  const processActivities = (rawActivities: ClientActivity[]): ClientActivity[] => {
    if (!rawActivities || rawActivities.length === 0) return [];
    
    // First sort by date and time
    const sortedActivities = [...rawActivities].sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Then sort by time
      return a.time.localeCompare(b.time);
    });
    
    // Process by day
    const activitiesByDay: { [dateStr: string]: ClientActivity[] } = {};
    
    sortedActivities.forEach(activity => {
      const dateStr = new Date(activity.date).toDateString();
      if (!activitiesByDay[dateStr]) {
        activitiesByDay[dateStr] = [];
      }
      activitiesByDay[dateStr].push(activity);
    });
    
    // For each day, calculate travel times and detect conflicts
    const processedActivities: ClientActivity[] = [];
    
    Object.values(activitiesByDay).forEach(dayActivities => {
      // First pass: detect time overlap conflicts
      dayActivities.forEach((activity, index) => {
        let hasTimeConflict = false;
        
        // Check if this activity's time overlaps with any other activity on the same day
        for (let i = 0; i < dayActivities.length; i++) {
          if (i !== index) {
            const otherActivity = dayActivities[i];
            if (activity.time === otherActivity.time) {
              hasTimeConflict = true;
              break;
            }
          }
        }
        
        // Add time conflict flag to activity
        activity.timeConflict = hasTimeConflict;
      });
      
      // Second pass: Add travel time estimates
      dayActivities.forEach((activity, index) => {
        if (index === 0) {
          // First activity of the day has no previous activity
          processedActivities.push(activity);
          return;
        }
        
        const prevActivity = dayActivities[index - 1];
        
        // Only add travel time if both activities have coordinates
        if (
          prevActivity.latitude && 
          prevActivity.longitude && 
          activity.latitude && 
          activity.longitude
        ) {
          // Simple distance-based travel time estimation
          const distance = calculateDistance(
            parseFloat(prevActivity.latitude), 
            parseFloat(prevActivity.longitude),
            parseFloat(activity.latitude), 
            parseFloat(activity.longitude)
          );
          
          // Get travel speed based on travel mode and distance
          let speedKmh = 4.8; // Default walking speed - average person walks at 3-4 mph (4.8-6.4 km/h)
          let modeName = "walking";
          
          // Use direct string comparison after converting to lowercase for consistency
          const travelMode = typeof activity.travelMode === 'string' ? activity.travelMode.toLowerCase() : 'walking';
          
          // Calculate more accurate speeds based on distance
          const isLongDistance = distance > 50; // More than 50km is considered long distance
          const isMediumDistance = distance > 10 && distance <= 50; // 10-50km is medium distance
          
          // Get trip city from localStorage to determine traffic patterns
          let tripCity = "";
          try {
            const tripData = localStorage.getItem(`trip_${tripId}`);
            if (tripData) {
              const parsed = JSON.parse(tripData);
              tripCity = parsed.city?.toLowerCase() || "";
            }
          } catch (e) {
            // Ignore errors
          }
          
          // Determine if this is a high-traffic city
          const isHighTrafficCity = tripCity.includes('new york') || 
                                   tripCity.includes('nyc') ||
                                   tripCity.includes('los angeles') ||
                                   tripCity.includes('chicago') ||
                                   tripCity.includes('san francisco') ||
                                   tripCity.includes('boston') ||
                                   tripCity.includes('washington') ||
                                   tripCity.includes('seattle') ||
                                   tripCity.includes('london') ||
                                   tripCity.includes('paris') ||
                                   tripCity.includes('tokyo');
          
          if (travelMode === 'driving') {
            if (isLongDistance) {
              // Highway speeds for long distances
              speedKmh = 90; 
            } else if (isMediumDistance) {
              // Mix of highways and urban for medium distances
              speedKmh = isHighTrafficCity ? 40 : 60;
            } else {
              // Urban driving
              speedKmh = isHighTrafficCity ? 15 : 30;
            }
            modeName = "driving";
          } else if (travelMode === 'transit') {
            if (isLongDistance) {
              // Intercity trains or express buses
              speedKmh = 90;
            } else if (isMediumDistance) {
              // Regional/express transit options
              speedKmh = isHighTrafficCity ? 35 : 50;
            } else {
              // Local transit with stops
              speedKmh = isHighTrafficCity ? 15 : 25;
            }
            modeName = "transit";
          } else {
            // Walking
            if (isLongDistance) {
              // Very long walks aren't realistic, suggest transit
              speedKmh = isHighTrafficCity ? 35 : 50;
              modeName = "transit (suggested)";
            } else if (isMediumDistance) {
              // Medium distance walks also unlikely
              speedKmh = isHighTrafficCity ? 25 : 35;
              modeName = "transit (suggested)";
            } else {
              // Reasonable walking distance
              speedKmh = isHighTrafficCity ? 4.5 : 5.0;
              modeName = "walking";
            }
          }
          
          // Calculate travel time based on mode
          const travelTimeMinutes = Math.round(distance / speedKmh * 60);
          
          // Format travel time with appropriate mode name
          let travelTime = "";
          
          // Format as hours and minutes for times over 60 minutes
          if (travelTimeMinutes >= 60) {
            const hours = Math.floor(travelTimeMinutes / 60);
            const minutes = travelTimeMinutes % 60;
            
            if (minutes > 0) {
              travelTime = `${hours} hr ${minutes} min ${modeName}`;
            } else {
              travelTime = `${hours} hr ${modeName}`;
            }
          } else {
            travelTime = `${travelTimeMinutes} min ${modeName}`;
          }
          
          // Add artificial conflict if travel time exceeds reasonable thresholds
          // Different thresholds based on travel mode and distance
          let conflictThreshold = 30; // Default for walking (30 minutes)
          
          if (travelMode === 'driving') {
            // More forgiving threshold for driving
            conflictThreshold = isLongDistance ? 480 : 60; // 8 hours for long trips, 1 hour for urban
          } else if (travelMode === 'transit') {
            // Middle ground for transit
            conflictThreshold = isLongDistance ? 360 : 45; // 6 hours for long trips, 45 min for urban
          } else {
            // Walking threshold based on distance
            conflictThreshold = distance > 2 ? 30 : 20; // 30 min for > 2km, 20 min for shorter
          }
          
          const conflict = travelTimeMinutes > conflictThreshold;
          
          // Add travel information to current activity
          processedActivities.push({
            ...activity,
            travelTimeFromPrevious: travelTime,
            travelDistanceFromPrevious: `${(distance).toFixed(1)} km`,
            conflict: conflict,
          });
        } else {
          processedActivities.push(activity);
        }
      });
    });
    
    return processedActivities;
  };
  
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  // Refetch activities
  const refetchActivities = () => {
    return refetch();
  };

  // Invalidate activities cache
  const invalidateActivities = () => {
    return queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
  };

  return {
    activities,
    isLoading,
    error,
    refetchActivities,
    invalidateActivities,
  };
}
