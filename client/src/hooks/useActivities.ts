import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity } from "@/lib/types";

export default function useActivities(tripId: number) {
  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ClientActivity[]>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"],
    queryFn: async () => {
      if (!tripId) return [];
      
      const res = await fetch(`${API_ENDPOINTS.TRIPS}/${tripId}/activities`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      
      const activitiesData = await res.json();
      
      // Process activities to add travel time information
      const processedActivities = processActivities(activitiesData);
      
      return processedActivities;
    },
    enabled: !!tripId,
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
      // Add travel time estimates
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
          
          // Get travel speed based on travel mode
          let speedKmh = 5; // Default walking speed (5 km/h)
          let modeName = "walking";
          
          // Added debug logging to see what travel mode is coming from the database
          console.log(`Processing travel time for activity ${activity.id} (${activity.title}) with travel mode:`, activity.travelMode);
          
          // Use direct string comparison after converting to lowercase for consistency
          const travelMode = typeof activity.travelMode === 'string' ? activity.travelMode.toLowerCase() : 'walking';
          
          if (travelMode === 'driving') {
            speedKmh = 40; // Estimate for urban driving
            modeName = "driving";
          } else if (travelMode === 'transit') {
            speedKmh = 20; // Estimate for public transit
            modeName = "transit";
          }
          
          // Calculate travel time based on mode
          const travelTimeMinutes = Math.round(distance / speedKmh * 60);
          
          // Format travel time with appropriate mode name
          let travelTime = `${travelTimeMinutes} min ${modeName}`;
          
          // Add artificial conflict if travel time is more than 30 minutes for walking
          // or more than 60 minutes for other modes
          const conflictThreshold = activity.travelMode === "walking" ? 30 : 60;
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
