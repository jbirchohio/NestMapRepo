import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import ItinerarySidebar from "@/components/ItinerarySidebar";
import MapView from "@/components/MapView";
import useTrip from "@/hooks/useTrip";
import useActivities from "@/hooks/useActivities";
import { ClientActivity, MapMarker, MapRoute } from "@/lib/types";
import { getDaysBetweenDates } from "@/lib/constants";

export default function TripPlanner() {
  const [, params] = useRoute("/trip/:id");
  const tripId = params ? parseInt(params.id) : 0;
  const { toast } = useToast();
  
  // Fetch trip data
  const { 
    trip, 
    todos, 
    notes, 
    isLoading: isTripLoading, 
    error: tripError 
  } = useTrip(tripId);
  
  // Fetch activities
  const { 
    activities, 
    isLoading: isActivitiesLoading, 
    error: activitiesError,
    refetchActivities 
  } = useActivities(tripId);
  
  // State for currently active day
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  
  // Set active day when trip data loads and store trip destination info for geocoding
  useEffect(() => {
    if (trip && trip.startDate && !activeDay) {
      setActiveDay(new Date(trip.startDate));
      
      // Calculate days between start and end date
      const days = getDaysBetweenDates(
        new Date(trip.startDate),
        new Date(trip.endDate)
      );
      
      // Add days array to trip object
      trip.days = days;
      
      // Store trip destination info in localStorage for geocoding context
      // This helps the map search find more relevant POIs within the trip's context
      try {
        localStorage.setItem(`trip_${tripId}`, JSON.stringify({
          city: trip.city || "New York City", // Default to NYC if no city specified
          latitude: trip.latitude,
          longitude: trip.longitude
        }));
      } catch (e) {
        console.error("Error saving trip geocoding context:", e);
      }
    }
  }, [trip, activeDay, tripId]);
  
  // Show errors
  useEffect(() => {
    if (tripError) {
      toast({
        title: "Error",
        description: "Failed to load trip details. Please try again.",
        variant: "destructive",
      });
    }
    
    if (activitiesError) {
      toast({
        title: "Error",
        description: "Failed to load activities. Please try again.",
        variant: "destructive",
      });
    }
  }, [tripError, activitiesError, toast]);
  
  // Filter activities for current day
  const filteredActivities = activities.filter((activity) => {
    if (!activeDay) return false;
    const activityDate = new Date(activity.date);
    return activityDate.toDateString() === activeDay.toDateString();
  });
  
  // Sort activities by time
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  // Prepare map markers
  const mapMarkers: MapMarker[] = sortedActivities
    .filter(activity => activity.latitude && activity.longitude)
    .map((activity, index) => ({
      id: activity.id,
      latitude: parseFloat(activity.latitude || "0"),
      longitude: parseFloat(activity.longitude || "0"),
      label: String.fromCharCode(65 + index), // A, B, C, etc.
      activity,
    }));
  
  // Prepare map routes (simplified for now)
  const mapRoutes: MapRoute[] = mapMarkers.length > 1 
    ? [{
        id: "main-route",
        coordinates: mapMarkers.map(marker => [marker.longitude, marker.latitude]),
        duration: 0,
        distance: 0,
      }]
    : [];
  
  // Calculate map center based on markers
  const mapCenter = mapMarkers.length > 0
    ? [
        mapMarkers.reduce((sum, marker) => sum + marker.longitude, 0) / mapMarkers.length,
        mapMarkers.reduce((sum, marker) => sum + marker.latitude, 0) / mapMarkers.length,
      ] as [number, number]
    : undefined;
  
  // Handle activity marker click
  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.activity) {
      // Could open activity details modal here
      console.log("Clicked activity:", marker.activity);
    }
  };
  
  // Handle share modal (not implemented for simplicity)
  const handleOpenShare = () => {
    toast({
      title: "Share",
      description: "Sharing functionality would open here.",
    });
  };
  
  // Loading state
  if (isTripLoading || isActivitiesLoading || !activeDay) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading trip planner...</p>
          </div>
        </div>
      </AppShell>
    );
  }
  
  // Error state
  if (!trip || tripError || activitiesError) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[hsl(var(--destructive))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mt-4">Could not load trip</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              There was an error loading the trip details. Please try again or return to the home page.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell trip={trip} onOpenShare={handleOpenShare}>
      <div className="flex flex-col md:flex-row w-full h-[calc(100vh-70px)] overflow-hidden">
        <div className="w-full md:w-[350px] min-w-[300px] max-w-[400px] flex-shrink-0 overflow-y-auto border-r bg-white dark:bg-[hsl(var(--background))]">
          <ItinerarySidebar
            trip={trip}
            activities={activities}
            todos={todos}
            notes={notes}
            activeDay={activeDay}
            onChangeDayClick={setActiveDay}
            onActivitiesUpdated={refetchActivities}
          />
        </div>
        
        <div className="w-full flex-1 relative md:h-full overflow-hidden">
          <MapView
            markers={mapMarkers}
            routes={mapRoutes}
            center={mapCenter}
            zoom={13}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      </div>
    </AppShell>
  );
}
