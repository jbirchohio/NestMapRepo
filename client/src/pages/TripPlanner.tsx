import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import ItinerarySidebar from "@/components/ItinerarySidebar";
import MapView from "@/components/MapView";
import ShareTripModal from "@/components/ShareTripModal";
import ActivityModal from "@/components/ActivityModal";
import ActivityModalConsumer from "@/components/ActivityModalConsumer";
import AITripChat from "@/components/AITripChat";
import SmartTourRecommendations from "@/components/SmartTourRecommendations";
import useTrip from "@/hooks/useTrip";
import useActivities from "@/hooks/useActivities";
import { useMapboxDirections } from "@/hooks/useMapboxDirections";
import { ClientActivity, MapMarker, MapRoute } from "@/lib/types";
import { getDaysBetweenDates } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, X, Sparkles, Package, Share2, Camera } from "lucide-react";
import CreateTemplateModal from "@/components/CreateTemplateModal";
import TripPosterGenerator from "@/components/TripPosterGenerator";
import ActivityGenerator from "@/components/ActivityGenerator";

export default function TripPlanner() {
  const [match, params] = useRoute("/trip/:id");
  const [location, setLocation] = useLocation();
  
  // Ensure we have a valid string ID from params
  let tripId = "";
  if (match && params?.id) {
    // Make absolutely sure we get a string
    tripId = String(params.id);
  }
  
  const { toast } = useToast();
  const { fetchRouteDirections } = useMapboxDirections();
  
  // If no trip ID, redirect to home
  useEffect(() => {
    if (!tripId) {
      setLocation('/');
    }
  }, [tripId, setLocation]);
  
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
  
  // State for trip days
  const [tripDays, setTripDays] = useState<Date[]>([]);
  
  // State for mobile view toggle (map or itinerary)
  const [mobileView, setMobileView] = useState<'itinerary' | 'map'>('itinerary');
  
  // State for share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // State for create template modal
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
  
  // State for poster generator
  const [showPosterGenerator, setShowPosterGenerator] = useState(false);
  
  // State for activity modal management
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ClientActivity | null>(null);
  
  // State for map routes
  const [calculatedRoutes, setCalculatedRoutes] = useState<MapRoute[]>([]);
  
  // State for AI chat
  const [showAIChat, setShowAIChat] = useState(false);
  
  // State for tour recommendations
  const [showTourRecommendations, setShowTourRecommendations] = useState(false);
  
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
  
  // Set active day when trip data loads
  useEffect(() => {
    if (trip && trip.startDate && !activeDay) {
      setActiveDay(new Date(trip.startDate));
    }
  }, [trip, activeDay]);

  // Calculate days and store trip info whenever trip changes
  useEffect(() => {
    if (trip && trip.startDate && trip.endDate) {
      // Calculate days between start and end date
      const days = getDaysBetweenDates(
        new Date(trip.startDate),
        new Date(trip.endDate)
      );
      
      // Setting trip days
      
      // Set days in state
      setTripDays(days);
      
      // Store trip destination info in localStorage for geocoding context
      // This helps the map search find more relevant POIs within the trip's context
      try {
        localStorage.setItem(`trip_${tripId}`, JSON.stringify({
          city: trip.city || "", // No default city
          latitude: trip.latitude,
          longitude: trip.longitude
        }));
      } catch (e) {
        // Error saving trip geocoding context
      }
    }
  }, [trip, tripId]);
  
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
    const isCorrectDay = activityDate.toDateString() === activeDay.toDateString();
    return isCorrectDay;
  });
  
  // Sort activities by time
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  // Prepare map markers - include all activities with coordinates
  const mapMarkers: MapMarker[] = sortedActivities
    .filter(activity => {
      // Only include activities with valid coordinates
      const hasLat = activity.latitude && activity.latitude !== "0" && !isNaN(parseFloat(activity.latitude));
      const hasLng = activity.longitude && activity.longitude !== "0" && !isNaN(parseFloat(activity.longitude));
      
      // Check if activity has valid coordinates
      
      return hasLat && hasLng;
    })
    .map((activity, index) => ({
      id: activity.id,
      latitude: parseFloat(activity.latitude || "0"),
      longitude: parseFloat(activity.longitude || "0"),
      label: String(index + 1), // 1, 2, 3, etc.
      activity,
    }));
  
  // Prepare map routes - sort markers by activity time first
  const sortedMapMarkers = [...mapMarkers].sort((a, b) => {
    const timeA = a.activity?.time || "00:00";
    const timeB = b.activity?.time || "00:00";
    return timeA.localeCompare(timeB);
  });
  
  // Fetch directions when markers change
  useEffect(() => {
    if (sortedMapMarkers.length > 1) {
      // Determine travel mode based on trip context
      // For now, default to walking in cities
      const travelMode = 'walking';
      
      fetchRouteDirections(sortedMapMarkers, travelMode).then(route => {
        if (route) {
          setCalculatedRoutes([{
            id: "main-route",
            coordinates: route.geometry.coordinates,
            duration: route.duration,
            distance: route.distance,
          }]);
        } else {
          // Fallback to straight lines if directions API fails
          setCalculatedRoutes([{
            id: "main-route",
            coordinates: sortedMapMarkers.map(marker => [marker.longitude, marker.latitude]),
            duration: 0,
            distance: 0,
          }]);
        }
      });
    } else {
      setCalculatedRoutes([]);
    }
  }, [JSON.stringify(sortedMapMarkers.map(m => ({ id: m.id, lat: m.latitude, lng: m.longitude }))), fetchRouteDirections]);
  
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

  // Map center has been calculated based on markers or trip city coordinates
  
  // Handle activity marker click
  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.activity) {
      // Could open activity details modal here
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
      // Error updating share settings
      toast({
        title: "Error",
        description: "Failed to update share settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle toggling collaborative mode
  const handleToggleCollaborative = async () => {
    try {
      const newMode = !trip?.collaborativeMode;
      const response = await apiRequest('PUT', `/api/trips/${tripId}/collaborative`, {
        enabled: newMode,
        allowAnonymous: true
      });

      toast({
        title: newMode ? "Collaborative Mode Enabled" : "Collaborative Mode Disabled",
        description: newMode 
          ? "Others can now suggest activities and comment on your trip!"
          : "Collaborative features have been disabled.",
      });

      // Refetch trip to get updated state
      if (refetchActivities) refetchActivities();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle collaborative mode",
        variant: "destructive",
      });
    }
  };
  
  // Loading state
  if (isTripLoading || isActivitiesLoading) {
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
  
  // Check if trip exists
  if (!isTripLoading && !trip && tripId) {
    // Trip not found
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Trip not found</h2>
            <p className="text-gray-600 mb-4">The trip you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation('/')}>
              Go back home
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }
  
  // Check if activeDay is set
  if (!activeDay && trip) {
    // Trip loaded but no active day
    // This shouldn't happen, but if it does, set it
    if (trip.startDate) {
      setActiveDay(new Date(trip.startDate));
    }
    return null; // Wait for next render
  }
  
  // Error state
  if (!trip || tripError || activitiesError) {
    // Trip planner error state
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

  // Handle adding activities from AI chat
  const handleAddActivitiesFromAI = async (newActivities: any[]) => {
    for (const activity of newActivities) {
      try {
        await apiRequest('POST', '/api/activities', {
          ...activity,
          tripId: trip.id,
        });
      } catch (error) {
        // Error adding activity
      }
    }
    refetchActivities();
  };

  return (
    <AppShell 
      trip={trip} 
      onOpenShare={handleOpenShare}
      onCreateTemplate={() => setCreateTemplateModalOpen(true)}
      onCreatePoster={() => setShowPosterGenerator(true)}
      onToggleCollaborative={handleToggleCollaborative}
    >
      {/* Activity Generator for progressive loading */}
      <ActivityGenerator 
        tripId={tripId} 
        onActivitiesGenerated={refetchActivities}
      />
      
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
            trip={{ ...trip, days: tripDays }}
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
            routes={calculatedRoutes}
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
              trip={{ ...trip, days: tripDays }}
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
            routes={calculatedRoutes}
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
      
      {/* Trip Poster Generator */}
      {showPosterGenerator && trip && (
        <TripPosterGenerator
          trip={trip}
          activities={activities}
          onClose={() => setShowPosterGenerator(false)}
        />
      )}
      
      {/* Centralized Activity Modal */}
      {isActivityModalOpen && activeDay && (
        // Use consumer-friendly modal for better UX
        <ActivityModalConsumer
          onClose={handleCloseActivityModal}
          tripId={tripId}
          date={activeDay}
          activity={selectedActivity}
          onSave={handleActivitySaved}
        />
      )}
      
      {/* AI Chat Interface */}
      {showAIChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] z-50 shadow-2xl rounded-lg overflow-hidden animate-in slide-in-from-bottom-5">
          <AITripChat
            tripId={tripId}
            tripDetails={{
              trip: {
                id: trip.id,
                title: trip.title,
                city: trip.city,
                start_date: trip.startDate,
                end_date: trip.endDate,
              },
              activities,
            }}
            onAddActivity={handleOpenActivityModal}
            onUpdateItinerary={handleAddActivitiesFromAI}
          />
        </div>
      )}
      
      {/* Tour Recommendations Panel */}
      {showTourRecommendations && trip && (
        <div className="fixed bottom-4 left-4 w-[500px] max-h-[80vh] overflow-y-auto z-50 shadow-2xl rounded-lg bg-white animate-in slide-in-from-left-5">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Recommended Tours & Activities
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTourRecommendations(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4">
            <SmartTourRecommendations
              tripId={tripId}
              destination={trip.city || trip.location || ''}
              startDate={new Date(trip.startDate)}
              endDate={new Date(trip.endDate)}
              latitude={trip.latitude ? parseFloat(trip.latitude) : undefined}
              longitude={trip.longitude ? parseFloat(trip.longitude) : undefined}
              onTourAdded={() => refetchActivities()}
            />
          </div>
        </div>
      )}
      

      {/* Create Template Modal */}
      {trip && createTemplateModalOpen && (
        <CreateTemplateModal
          isOpen={createTemplateModalOpen}
          onClose={() => setCreateTemplateModalOpen(false)}
          trip={trip}
        />
      )}
    </AppShell>
  );
}
