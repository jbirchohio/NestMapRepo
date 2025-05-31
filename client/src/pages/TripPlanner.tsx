import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import ItinerarySidebar from "@/components/ItinerarySidebar";
import MapView from "@/components/MapView";
import ShareTripModal from "@/components/ShareTripModal";
import ActivityModal from "@/components/ActivityModal";
import useTrip from "@/hooks/useTrip";
import useActivities from "@/hooks/useActivities";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { ClientActivity, MapMarker, MapRoute } from "@/lib/types";
import { getDaysBetweenDates } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";

export default function TripPlanner() {
  const [, params] = useRoute("/trip/:id");
  const tripId = params?.id || "";
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
  
  // Auto-complete activities based on time with immediate updates
  useAutoComplete({ activities, tripId, onActivityCompleted: refetchActivities });
  
  // State for currently active day
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  
  // State for mobile view toggle (map or itinerary)
  const [mobileView, setMobileView] = useState<'itinerary' | 'map'>('itinerary');
  
  // State for share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // State for activity modal management
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ClientActivity | null>(null);
  
  // Centralized activity modal handlers
  const handleOpenActivityModal = (activity: ClientActivity | null = null, day: Date | null = null) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  };
  
  const handleCloseActivityModal = () => {
    setSelectedActivity(null);
    setIsActivityModalOpen(false);
  };
  
  const handleActivitySaved = () => {
    refetchActivities();
    handleCloseActivityModal();
  };
  
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
          city: trip.city || "", // No default city
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
  
  // Filter activities for current day AND exclude completed activities from map
  const filteredActivities = activities.filter((activity) => {
    if (!activeDay) return false;
    const activityDate = new Date(activity.date);
    const isCorrectDay = activityDate.toDateString() === activeDay.toDateString();
    const isNotCompleted = !activity.completed; // Only show pending activities on map
    return isCorrectDay && isNotCompleted;
  });
  
  // Sort activities by time
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  // Prepare map markers - include all activities with coordinates (both completed and pending)
  const mapMarkers: MapMarker[] = sortedActivities
    .filter(activity => {
      // Only include activities with valid coordinates
      const hasLat = activity.latitude && activity.latitude !== "0" && !isNaN(parseFloat(activity.latitude));
      const hasLng = activity.longitude && activity.longitude !== "0" && !isNaN(parseFloat(activity.longitude));
      return hasLat && hasLng;
    })
    .map((activity, index) => ({
      id: activity.id,
      latitude: parseFloat(activity.latitude || "0"),
      longitude: parseFloat(activity.longitude || "0"),
      label: String.fromCharCode(65 + index), // A, B, C, etc.
      activity,
      completed: activity.completed || false, // Pass completion status to map component
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
  
  // Calculate map center based on markers or trip city coordinates
  const mapCenter = mapMarkers.length > 0
    ? [
        mapMarkers.reduce((sum, marker) => sum + marker.longitude, 0) / mapMarkers.length,
        mapMarkers.reduce((sum, marker) => sum + marker.latitude, 0) / mapMarkers.length,
      ] as [number, number]
    : (trip?.cityLatitude && trip?.cityLongitude && 
       !isNaN(parseFloat(trip.cityLatitude)) && !isNaN(parseFloat(trip.cityLongitude)))
    ? [parseFloat(trip.cityLongitude), parseFloat(trip.cityLatitude)] as [number, number]
    : [-74.006, 40.7128] as [number, number]; // Default to NYC coordinates instead of undefined

  // Debug map center calculation
  console.log('Map center calculation debug:', {
    hasMarkers: mapMarkers.length > 0,
    markerCount: mapMarkers.length,
    tripCityLat: trip?.cityLatitude,
    tripCityLng: trip?.cityLongitude,
    tripObject: trip,
    parsedLat: trip?.cityLatitude ? parseFloat(trip.cityLatitude) : 'no lat',
    parsedLng: trip?.cityLongitude ? parseFloat(trip.cityLongitude) : 'no lng',
    isValidLat: trip?.cityLatitude ? !isNaN(parseFloat(trip.cityLatitude)) : false,
    isValidLng: trip?.cityLongitude ? !isNaN(parseFloat(trip.cityLongitude)) : false,
    calculatedCenter: mapCenter
  });
  
  // Handle activity marker click
  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.activity) {
      // Could open activity details modal here
      console.log("Clicked activity:", marker.activity);
    }
  };
  
  // Handle share modal
  const handleOpenShare = () => {
    setShareModalOpen(true);
  };

  // Handle saving share settings
  const handleSaveShareSettings = async (tripId: number, updates: any) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Share settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating share settings:", error);
      toast({
        title: "Error",
        description: "Failed to update share settings",
        variant: "destructive",
      });
      throw error;
    }
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
  
  // Toggle view function for mobile
  const toggleMobileView = () => {
    setMobileView(mobileView === 'itinerary' ? 'map' : 'itinerary');
  };

  return (
    <AppShell trip={trip} onOpenShare={handleOpenShare}>
      {/* Mobile view toggle buttons */}
      <div className="md:hidden flex border rounded-md overflow-hidden shadow-sm m-2 relative z-50 bg-white dark:bg-[hsl(var(--card))]">
        <Button
          onClick={() => setMobileView('itinerary')}
          variant={mobileView === 'itinerary' ? 'default' : 'outline'}
          className="flex-1 py-3 px-4 font-medium h-auto rounded-r-none"
        >
          Itinerary
        </Button>
        <Button
          onClick={() => setMobileView('map')}
          variant={mobileView === 'map' ? 'default' : 'outline'}
          className="flex-1 py-3 px-4 font-medium h-auto rounded-l-none"
        >
          Map
        </Button>
      </div>

      {/* Desktop view: side-by-side layout */}
      <div className="hidden md:grid h-[calc(100vh-110px)]" style={{ gridTemplateColumns: '400px calc(100vw - 400px)' }}>
        <div className="h-full overflow-y-auto">
          <ItinerarySidebar
            trip={trip}
            activities={activities}
            todos={todos}
            notes={notes}
            activeDay={activeDay}
            onChangeDayClick={setActiveDay}
            onActivitiesUpdated={refetchActivities}
            onAddActivity={handleOpenActivityModal}
            mobileView={mobileView}
            setMobileView={setMobileView}
          />
        </div>
        
        <div className="h-full">
          <MapView
            markers={mapMarkers}
            routes={mapRoutes}
            center={mapCenter}
            zoom={13}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      </div>
      
      {/* Mobile view: conditional content */}
      <div className="md:hidden">
        {/* Itinerary view */}
        {mobileView === 'itinerary' && (
          <div className="h-[calc(100vh-120px)] overflow-y-auto">
            <ItinerarySidebar
              trip={trip}
              activities={activities}
              todos={todos}
              notes={notes}
              activeDay={activeDay}
              onChangeDayClick={setActiveDay}
              onActivitiesUpdated={refetchActivities}
              onAddActivity={handleOpenActivityModal}
              mobileView={mobileView}
              setMobileView={setMobileView}
            />
          </div>
        )}
      </div>
      
      {/* Mobile map view - must be outside other containers to be full screen */}
      {mobileView === 'map' && (
        <div className="md:hidden fixed inset-0 top-[108px] z-10" style={{ height: 'calc(100vh - 108px)' }}>
          <MapView
            markers={mapMarkers}
            routes={mapRoutes}
            center={mapCenter}
            zoom={13}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      )}
      
      {/* Share Trip Modal */}
      <ShareTripModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        trip={trip}
        onSave={handleSaveShareSettings}
      />
      
      {/* Centralized Activity Modal */}
      {isActivityModalOpen && activeDay && (
        <ActivityModal
          onClose={handleCloseActivityModal}
          tripId={tripId}
          date={activeDay}
          activity={selectedActivity}
          onSave={handleActivitySaved}
        />
      )}
    </AppShell>
  );
}
