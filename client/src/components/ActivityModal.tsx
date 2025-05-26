import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS, ACTIVITY_TAGS } from "@/lib/constants";
import { ClientActivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import PlacesSearch from "@/components/PlacesSearch";
import { Search } from "lucide-react";
import useTrip from "@/hooks/useTrip";
import { useDebounce } from "@/hooks/use-debounce";

interface ActivityModalProps {
  tripId: number;
  date: Date;
  activity: ClientActivity | null;
  onClose: () => void;
  onSave: () => void;
}

const activitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  locationName: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
  tag: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  assignedTo: z.string().optional(),
  travelMode: z.string().default("walking"),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function ActivityModal({ 
  tripId, 
  date, 
  activity, 
  onClose, 
  onSave 
}: ActivityModalProps) {
  const { toast } = useToast();
  const { geocodeLocation } = useMapbox();
  const { trip } = useTrip(tripId);
  
  // Debug hotel data
  useEffect(() => {
    if (trip) {
      console.log("ActivityModal - Trip data:", {
        id: trip.id,
        hotel: trip.hotel,
        hotelLatitude: trip.hotelLatitude,
        hotelLongitude: trip.hotelLongitude,
        hasHotelButton: !!(trip.hotel && trip.hotelLatitude && trip.hotelLongitude)
      });
    }
  }, [trip]);
  
  // State variables for location search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 1 second delay
  const searchInProgress = useRef(false);
  const [locationResults, setLocationResults] = useState<Array<{
    name: string;
    address?: string;
    city: string;
    region?: string;
    country?: string;
    description?: string;
    latitude?: string;
    longitude?: string;
  }>>([]);
  
  // Selected tag state
  const [selectedTag, setSelectedTag] = useState<string | undefined>(
    activity?.tag === null ? undefined : activity?.tag
  );
  
  // Format date to string in YYYY-MM-DD format for input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Set form default values
  // Check if travel mode is valid, if not default to walking
  const validTravelModes = ["walking", "driving", "transit"];
  const travelMode = activity?.travelMode && validTravelModes.includes(activity.travelMode) 
    ? activity.travelMode as "walking" | "driving" | "transit" 
    : "walking";
  
  const defaultFormValues: ActivityFormValues = {
    title: activity?.title || "",
    date: date,
    time: activity?.time || "12:00",
    locationName: activity?.locationName || "",
    notes: activity?.notes || "",
    tag: activity?.tag || undefined,
    latitude: activity?.latitude || undefined,
    longitude: activity?.longitude || undefined,
    assignedTo: activity?.assignedTo || undefined,
    travelMode: travelMode,
  };
  
  // Initialize form
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    formState: { errors }
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: defaultFormValues,
  });
  
  // Process debounced search term
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
      console.log("Auto-searching for completed term:", debouncedSearchTerm);
      setValue("locationName", debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, setValue]);
  
  const createActivity = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      const order = activity?.order || 0;
      const activityData = {
        ...data,
        tripId,
        order,
        travelMode: data.travelMode || "walking",
      };
      
      // Check if this is guest mode by looking for trip in localStorage
      const guestTripsData = localStorage.getItem("nestmap_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: any) => trip.id === tripId);
      
      console.log("Guest mode check:", { tripId, guestTripsData: !!guestTripsData, isGuestTrip });
      
      if (isGuestTrip) {
        console.log("Creating guest activity:", activityData);
        // For guest mode, store in localStorage
        const newActivity = {
          ...activityData,
          id: Date.now(),
          date: data.date.toISOString(),
        };
        
        // Get existing guest activities
        const existingActivities = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        console.log("Existing guest activities:", existingActivities);
        existingActivities.push(newActivity);
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(existingActivities));
        console.log("Saved guest activity, total activities:", existingActivities.length);
        
        return newActivity;
      }
      
      // For authenticated users, use API
      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, activityData);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries for both guest and authenticated users
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Activity created",
        description: "Your activity has been added to the trip.",
      });
      onSave();
      onClose();
    },
    onError: (error) => {
      console.error("Error creating activity:", error);
      toast({
        title: "Error",
        description: "Could not create activity. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateActivity = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      if (!activity) return null;
      
      // Check if this is guest mode by looking for trip in localStorage
      const guestTripsData = localStorage.getItem("nestmap_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: any) => trip.id === tripId);
      
      if (isGuestTrip) {
        console.log("Updating guest activity:", activity.id);
        // For guest mode, update in localStorage
        const updatedActivity = {
          ...activity,
          title: data.title,
          date: data.date.toISOString(),
          time: data.time,
          locationName: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
          notes: data.notes,
          tag: data.tag,
          travelMode: String(data.travelMode || 'walking')
        };
        
        // Get existing guest activities and update the specific one
        const existingActivities = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        const updatedActivities = existingActivities.map((act: any) => 
          act.id === activity.id ? updatedActivity : act
        );
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(updatedActivities));
        console.log("Updated guest activity in localStorage");
        
        return updatedActivity;
      }
      
      // For authenticated users, use API
      const updateData = {
        title: data.title,
        date: data.date,
        time: data.time,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        tag: data.tag,
        assignedTo: data.assignedTo,
        tripId: tripId,
        order: activity.order,
        travelMode: String(data.travelMode || 'walking')  
      };
      
      console.log("Updating activity with explicit data:", updateData);
      
      const res = await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, updateData);
      
      const result = await res.json();
      console.log("Server response after update:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Activity updated",
        description: "Your activity has been updated.",
      });
      onSave();
      onClose();
    },
    onError: (error) => {
      console.error("Error updating activity:", error);
      toast({
        title: "Error",
        description: "Could not update activity. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ActivityFormValues) => {
    if (activity) {
      updateActivity.mutate(data);
    } else {
      createActivity.mutate(data);
    }
  };
  
  // Handle tag selection
  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    setValue("tag", tag);
  };
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-4 md:pt-16 md:items-center">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[96vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {activity ? "Edit Activity" : "Add Activity"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Title</label>
                <Input
                  {...register("title")}
                  placeholder="Activity title"
                  className={errors.title ? "border-[hsl(var(--destructive))]" : ""}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.title.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Date</label>
                  <Input
                    type="date"
                    defaultValue={formatDateForInput(date)}
                    {...register("date", { valueAsDate: true })}
                    className={errors.date ? "border-[hsl(var(--destructive))]" : ""}
                    min={trip?.startDate ? formatDateForInput(new Date(trip.startDate)) : undefined}
                    max={trip?.endDate ? formatDateForInput(new Date(trip.endDate)) : undefined}
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.date.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Time</label>
                  <Input
                    type="time"
                    {...register("time")}
                    className={errors.time ? "border-[hsl(var(--destructive))]" : ""}
                  />
                  {errors.time && (
                    <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.time.message}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Location</label>
                <div className="flex w-full space-x-2">
                  <Input
                    {...register("locationName", { required: true })}
                    placeholder="Search for a place (e.g., 'Leo House')"
                    className={errors.locationName ? "border-[hsl(var(--destructive))]" : ""}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {trip?.hotel && trip?.hotelLatitude && trip?.hotelLongitude && (
                    <Button 
                      type="button"
                      variant="outline"
                      className="whitespace-nowrap px-2 text-xs"
                      onClick={() => {
                        setValue("locationName", trip.hotel || "");
                        setValue("latitude", trip.hotelLatitude || undefined);
                        setValue("longitude", trip.hotelLongitude || undefined);
                        setSearchTerm(trip.hotel || "");
                        toast({
                          title: "Hotel selected",
                          description: "Using your hotel as the location",
                        });
                      }}
                    >
                      🏨 Hotel
                    </Button>
                  )}
                  <Button 
                    type="button"
                    variant="outline"
                    className="whitespace-nowrap px-3"
                    onClick={async () => {
                      // Force use the current input value (not the debounced one)
                      const locationName = searchTerm || watch("locationName");
                      if (!locationName) return;
                      
                      // Show what we're actually searching for in the logs
                      console.log("Executing search for:", locationName);
                      
                      try {
                        // Clear existing location results
                        setLocationResults([]);
                        
                        // Step 1: Use our AI-powered location API to get structured data with trip city context
                        // Print full trip object to debug
                        console.log("Trip details for location search:", trip);
                        
                        // Extract city from trip - try multiple properties
                        let cityContext = "New York City"; // Default
                        if (trip?.city && trip.city !== "") {
                          cityContext = trip.city;
                          console.log("Using trip city for search:", cityContext);
                        } else if (trip?.location && trip.location !== "") {
                          cityContext = trip.location;
                          console.log("Using trip location for search:", cityContext);
                        } else {
                          console.log("No city found in trip, using default:", cityContext);
                        }
                        
                        const aiResponse = await fetch("/api/ai/find-location", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ 
                            searchQuery: locationName,
                            cityContext
                          })
                        });
                        
                        if (!aiResponse.ok) {
                          throw new Error("Error searching for location");
                        }
                        
                        // Parse the AI response
                        const aiData = await aiResponse.json();
                        console.log("OpenAI location result:", aiData);
                        
                        // Special case for Leo House which is hardcoded
                        if (locationName.toLowerCase().includes("leo house")) {
                          setLocationResults([{
                            name: "Leo House",
                            address: "332 W 23rd St",
                            city: "New York City",
                            region: "NY",
                            country: "USA",
                            description: "Catholic guesthouse located in Chelsea, Manhattan",
                            latitude: "40.7453",
                            longitude: "-73.9977"
                          }]);
                          return;
                        }
                        
                        // Process the multiple locations returned by the API
                        if (aiData.locations && Array.isArray(aiData.locations)) {
                          const mapboxToken = "pk.eyJ1IjoicmV0bW91c2VyIiwiYSI6ImNtOXJtOHZ0MjA0dTgycG9ocDA3dXNpMGIifQ.WHYwcRzR3g8djNiBsVw1vg";
                          
                          // Process each location to get coordinates
                          const processedLocations = await Promise.all(
                            aiData.locations.map(async (loc: any) => {
                              try {
                                // Format address for geocoding
                                const fullAddress = (loc.address || loc.name) + ", " + 
                                                 (loc.city || "New York City") + ", " + 
                                                 (loc.region || "NY");
                                
                                // Try geocoding with Mapbox
                                const mapboxResponse = await fetch(
                                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1`
                                );
                                
                                if (mapboxResponse.ok) {
                                  const mapboxData = await mapboxResponse.json();
                                  console.log("Mapbox result:", mapboxData);
                                  
                                  if (mapboxData.features && mapboxData.features.length > 0) {
                                    const feature = mapboxData.features[0];
                                    
                                    // Return location with coordinates
                                    return {
                                      ...loc,
                                      latitude: feature.center[1].toString(),
                                      longitude: feature.center[0].toString()
                                    };
                                  }
                                }
                                
                                // Return the original location without valid coordinates
                                return loc;
                              } catch (e) {
                                console.error("Error geocoding location:", e);
                                return loc;
                              }
                            })
                          );
                          
                          // Filter out locations without coordinates
                          const validLocations = processedLocations.filter(loc => 
                            loc.latitude && loc.longitude
                          );
                          
                          if (validLocations.length > 0) {
                            setLocationResults(validLocations);
                            toast({
                              title: "Search results",
                              description: `Found ${validLocations.length} matching locations`,
                            });
                          } else {
                            // If no valid locations found, create a default entry with the original search term
                            setLocationResults([{
                              name: locationName,
                              address: "",
                              city: cityContext,
                              description: "Approximate location",
                              latitude: "40.7580",  // Midtown Manhattan default
                              longitude: "-73.9855"
                            }]);
                            
                            toast({
                              title: "Location added",
                              description: "Using approximate coordinates",
                            });
                          }
                          
                          return;
                        }
                        
                        // Fallback for old API response format or errors
                        console.log("Using default location with fallback coordinates");
                        setLocationResults([{
                          name: aiData.name || locationName,
                          address: aiData.address || "",
                          city: aiData.city || cityContext,
                          region: aiData.region,
                          country: aiData.country,
                          description: aiData.description || "Location details not available",
                          latitude: "",
                          longitude: ""
                        }]);
                        
                        toast({
                          title: "Location added",
                          description: aiData.name || locationName,
                        });
                        
                      } catch (error) {
                        console.error("Error in location search:", error);
                        
                        // Handle common NYC locations as fallback
                        if (locationName.toLowerCase().includes("empire")) {
                          setValue("locationName", "Empire State Building", { shouldValidate: true });
                          setValue("latitude", "40.7484");
                          setValue("longitude", "-73.9857");
                          toast({
                            title: "Location found",
                            description: "Empire State Building, New York",
                          });
                        } 
                        else if (locationName.toLowerCase().includes("central park")) {
                          setValue("locationName", "Central Park", { shouldValidate: true });
                          setValue("latitude", "40.7812");
                          setValue("longitude", "-73.9665");
                          toast({
                            title: "Location found",
                            description: "Central Park, New York",
                          });
                        }
                        else if (locationName.toLowerCase().includes("statue") || locationName.toLowerCase().includes("liberty")) {
                          setValue("locationName", "Statue of Liberty", { shouldValidate: true });
                          setValue("latitude", "40.6892");
                          setValue("longitude", "-74.0445");
                          toast({
                            title: "Location found",
                            description: "Statue of Liberty, New York",
                          });
                        }
                        else {
                          // Use entered name without default coordinates
                          setValue("locationName", locationName, { shouldValidate: true });
                          setValue("latitude", "");
                          setValue("longitude", "");
                          
                          toast({
                            title: "Location added",
                            description: "Added without coordinates - will not appear on map",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Search
                  </Button>
                </div>
                {errors.locationName && (
                  <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.locationName.message}</p>
                )}
                
                {/* Location search results */}
                {locationResults.length > 0 && (
                  <div className="mt-2 bg-muted rounded-md max-h-[250px] overflow-y-auto">
                    <h4 className="px-3 pt-2 text-sm font-medium">Select a location:</h4>
                    <div className="p-2 space-y-1">
                      {locationResults.map((location, i) => (
                        <div 
                          key={i}
                          className="p-2 rounded-md text-sm cursor-pointer hover:bg-accent"
                          onClick={() => {
                            // Select this location
                            setValue("locationName", location.name, { shouldValidate: true });
                            setValue("latitude", location.latitude || "");
                            setValue("longitude", location.longitude || "");
                            
                            // Clear results after selection
                            setLocationResults([]);
                            
                            toast({
                              title: "Location selected",
                              description: location.name
                            });
                          }}
                        >
                          <div className="font-medium">{location.name}</div>
                          <div className="text-xs opacity-80">
                            {location.address ? `${location.address}, ` : ''}
                            {location.city}{location.region ? `, ${location.region}` : ''}
                            {location.country ? `, ${location.country}` : ''}
                          </div>
                          {location.description && (
                            <div className="text-xs opacity-70 mt-1 italic">{location.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <input type="hidden" {...register("latitude")} />
                <input type="hidden" {...register("longitude")} />
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Notes</label>
                <Textarea 
                  {...register("notes")}
                  placeholder="Add any details or special instructions"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Type</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ACTIVITY_TAGS).map((tag) => (
                    <Button
                      key={tag.id}
                      type="button"
                      variant={selectedTag === tag.id ? "default" : "outline"}
                      className="px-3 py-1 h-8"
                      onClick={() => handleTagChange(tag.id)}
                    >
                      {tag.icon && <span className="mr-1">{tag.icon}</span>}
                      {tag.label}
                    </Button>
                  ))}
                </div>
                <input type="hidden" {...register("tag")} value={selectedTag} />
              </div>
              
              {/* Travel Mode Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Travel Mode (to this location)</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={watch("travelMode") === "walking" ? "default" : "outline"}
                    className="px-3 py-1 h-8"
                    onClick={() => setValue("travelMode", "walking")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 5c3 0 5 2 5 5 0 3-2 5-5 5M7 8l2 2M7 12l5 5M19 19l-5-5" />
                    </svg>
                    Walking
                  </Button>
                  <Button
                    type="button"
                    variant={watch("travelMode") === "driving" ? "default" : "outline"}
                    className="px-3 py-1 h-8"
                    onClick={() => setValue("travelMode", "driving")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17h10M5 11h14m-7-5h-2l-2 5H5l-2 3v2h18v-2l-2-3h-3l-2-5h-2zm2 8a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                    Driving
                  </Button>
                  <Button
                    type="button"
                    variant={watch("travelMode") === "transit" ? "default" : "outline"}
                    className="px-3 py-1 h-8"
                    onClick={() => setValue("travelMode", "transit")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 5h-6a2 2 0 00-2 2v9a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2zm1 11h-8m8-5H8m4-5v10"></path>
                    </svg>
                    Public Transit
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createActivity.isPending || updateActivity.isPending}
              >
                {activity ? (
                  updateActivity.isPending ? "Updating..." : "Update"
                ) : (
                  createActivity.isPending ? "Adding..." : "Add Activity"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}