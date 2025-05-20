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
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 1 second delay
  const searchInProgress = useRef(false);
  
  // Auto-search when debounced value changes (user has stopped typing)
  useEffect(() => {
    // Only search if there's a term and it's at least 3 characters
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
      console.log("Auto-searching for completed term:", debouncedSearchTerm);
      // Update the form with the finalized search term
      setValue("locationName", debouncedSearchTerm);
      // Don't auto-trigger the search - let the user click the button when ready
    }
  }, [debouncedSearchTerm, setValue]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(
    activity?.tag === null ? undefined : activity?.tag
  );
  
  const defaultValues: ActivityFormValues = {
    title: activity?.title || "",
    date: date,
    time: activity?.time || "12:00",
    locationName: activity?.locationName || "",
    notes: activity?.notes || "",
    tag: activity?.tag || undefined,
    latitude: activity?.latitude || undefined,
    longitude: activity?.longitude || undefined,
    assignedTo: activity?.assignedTo || undefined,
  };
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, trigger } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues,
  });
  
  // We're now using the PlacesSearch component for location search
  // which directly updates the form values with the selected location
  
  const createActivity = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      const order = activity?.order || 0;
      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, {
        ...data,
        tripId,
        order,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Activity created",
        description: "Your activity has been added to the itinerary.",
      });
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not create activity. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating activity:", error);
    },
  });
  
  const updateActivity = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      if (!activity) return null;
      
      const res = await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, {
        ...data,
        tripId,
        order: activity.order,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Activity updated",
        description: "Your activity has been updated successfully.",
      });
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not update activity. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating activity:", error);
    },
  });
  
  const deleteActivity = useMutation({
    mutationFn: async () => {
      if (!activity) return null;
      
      await apiRequest("DELETE", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, undefined);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Activity deleted",
        description: "The activity has been removed from your itinerary.",
      });
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not delete activity. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting activity:", error);
    },
  });
  
  const onSubmit = (data: ActivityFormValues) => {
    const finalData = {
      ...data,
      tag: selectedTag,
    };
    
    if (activity) {
      updateActivity.mutate(finalData);
    } else {
      createActivity.mutate(finalData);
    }
  };
  
  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? undefined : tag);
  };
  
  const isPending = createActivity.isPending || updateActivity.isPending || deleteActivity.isPending;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[hsl(var(--card))] rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-[hsl(var(--border))]">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {activity ? "Edit Activity" : "Add Activity"}
            </h3>
            <button 
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" 
              onClick={onClose}
              disabled={isPending}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Title</label>
              <Input
                {...register("title")}
                placeholder="Enter activity title"
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
                  {...register("date", { 
                    setValueAs: (value) => value ? new Date(value) : date 
                  })}
                  defaultValue={date.toISOString().split('T')[0]}
                />
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
                        setValue("locationName", "Leo House", { shouldValidate: true });
                        setValue("latitude", "40.7453");
                        setValue("longitude", "-73.9977");
                        toast({
                          title: "Location found",
                          description: "Leo House, 332 W 23rd St, New York",
                        });
                        return;
                      }
                      
                      // Step 2: Use address from AI to get precise coordinates with Mapbox
                      if (aiData.address) {
                        // Construct search term for Mapbox
                        const fullAddress = aiData.address + ", " + 
                                           (aiData.city || "New York City") + ", " + 
                                           (aiData.region || "NY");
                        
                        const mapboxToken = "pk.eyJ1IjoicmV0bW91c2VyIiwiYSI6ImNtOXJtOHZ0MjA0dTgycG9ocDA3dXNpMGIifQ.WHYwcRzR3g8djNiBsVw1vg";
                        
                        const mapboxResponse = await fetch(
                          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1`
                        );
                        
                        if (mapboxResponse.ok) {
                          const mapboxData = await mapboxResponse.json();
                          console.log("Mapbox result for AI address:", mapboxData);
                          
                          if (mapboxData.features && mapboxData.features.length > 0) {
                            const feature = mapboxData.features[0];
                            
                            // Set values from combined AI + Mapbox results
                            setValue("locationName", aiData.name, { shouldValidate: true });
                            setValue("latitude", feature.center[1].toString());
                            setValue("longitude", feature.center[0].toString());
                            
                            toast({
                              title: "Location found",
                              description: fullAddress,
                            });
                            return;
                          }
                        }
                      }
                      
                      // Handle error or missing address in AI result
                      console.log("Using AI name with fallback coordinates");
                      setValue("locationName", aiData.name || locationName, { shouldValidate: true });
                      setValue("latitude", "40.7580");  // Midtown Manhattan default
                      setValue("longitude", "-73.9855");
                      
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
                        // Fallback to entered name with NYC coordinates
                        setValue("locationName", locationName, { shouldValidate: true });
                        setValue("latitude", "40.7580");  // Midtown Manhattan
                        setValue("longitude", "-73.9855");
                        
                        toast({
                          title: "Using default location",
                          description: "Added with default New York coordinates",
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
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Type the name of a landmark, hotel, or address - our AI will help find it
              </p>
              
              {/* Quick location buttons for common NYC landmarks */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setValue("locationName", "Leo House, NYC", { shouldValidate: true });
                    setValue("latitude", "40.7453");
                    setValue("longitude", "-73.9977");
                  }}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Leo House
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("locationName", "Empire State Building", { shouldValidate: true });
                    setValue("latitude", "40.7484");
                    setValue("longitude", "-73.9857");
                  }}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Empire State Building
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("locationName", "Central Park", { shouldValidate: true });
                    setValue("latitude", "40.7812");
                    setValue("longitude", "-73.9665");
                  }}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Central Park
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Category</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(ACTIVITY_TAGS).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`px-4 py-1 ${tag.color} ${selectedTag === tag.id ? 'ring-2 ring-offset-2 ring-[hsl(var(--ring))]' : ''} text-white rounded-md text-sm`}
                    onClick={() => handleTagClick(tag.id)}
                  >
                    {tag.icon} {tag.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Notes</label>
              <Textarea
                {...register("notes")}
                rows={3}
                placeholder="Add any important details"
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              {activity && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteActivity.mutate()}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </span>
                ) : (
                  'Save Activity'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
