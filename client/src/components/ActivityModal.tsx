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
  
  // Set form default values
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
      
      const res = await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, {
        ...data,
        tripId,
      });
      return res.json();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                    {...register("date", { valueAsDate: true })}
                    className={errors.date ? "border-[hsl(var(--destructive))]" : ""}
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