import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS, ACTIVITY_TAGS } from "@/lib/constants";
import { ClientActivity, ClientTrip } from "@/lib/types";

interface LocationResult {
  name: string;
  address?: string;
  city: string;
  region?: string;
  country?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import PlacesSearch from "@/components/PlacesSearch";
import { Search } from "lucide-react";
import useTrip from "@/hooks/useTrip";
import { useDebounce } from "@/hooks/use-debounce";
import useActivities from "@/hooks/useActivities";
import TripDatePicker from "@/components/TripDatePicker";
import BookableActivity from "@/components/BookableActivity";

interface ActivityModalProps {
  tripId: string | number;
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
  const { activities } = useActivities(tripId);

  // Debug hotel data
  useEffect(() => {
    if (trip) {
      // Hotel data is available in trip object
    }
  }, [trip]);

  // State variables for location search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 1 second delay
  const searchInProgress = useRef(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);

  // Selected tag state
  const [selectedTag, setSelectedTag] = useState<string | undefined>(
    activity?.tag === null ? undefined : activity?.tag
  );

  // Selected date state for trip day pills
  const [selectedDate, setSelectedDate] = useState<string>(
    activity?.date ? new Date(activity.date).toISOString().split('T')[0] : date.toISOString().split('T')[0]
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

  // Smart time scheduling
  const getSmartDefaultTime = (): string => {
    if (activity?.time) return activity.time; // Keep existing time if editing

    // Get activities for the selected date
    const activitiesForDate = activities.filter(a => {
      const actDate = new Date(a.date).toISOString().split('T')[0];
      const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
      return actDate === selectedDateStr;
    });

    // Get occupied times
    const occupiedTimes = activitiesForDate.map(a => a.time).filter(Boolean);

    // Define ideal time slots throughout the day
    const timeSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
    ];

    // Find first available slot
    for (const time of timeSlots) {
      if (!occupiedTimes.includes(time)) {
        return time;
      }
    }

    // If all slots taken, default to 12:00
    return "12:00";
  };

  const defaultFormValues: ActivityFormValues = {
    title: activity?.title || "",
    date: new Date(selectedDate),
    time: getSmartDefaultTime(),
    locationName: activity?.locationName || "",
    notes: activity?.notes || "",
    tag: activity?.tag || "",
    latitude: activity?.latitude || "",
    longitude: activity?.longitude || "",
    assignedTo: activity?.assignedTo || "",
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
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);

      if (isGuestTrip) {

        // For guest mode, store in localStorage
        const newActivity = {
          ...activityData,
          id: Date.now(),
          date: data.date.toISOString(),
        };

        // Get existing guest activities
        const existingActivities = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');

        existingActivities.push(newActivity);
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(existingActivities));

        return newActivity;
      }

      // For authenticated users, use API
      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, activityData);
      return res;
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
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);

      if (isGuestTrip) {

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
        const existingActivities: ClientActivity[] = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        const updatedActivities = existingActivities.map((act: ClientActivity) =>
          act.id === activity.id ? updatedActivity : act
        );
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(updatedActivities));

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

      const res = await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, updateData);
      return res;
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

  // Handle date selection from pills
  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setValue("date", new Date(dateString));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-background rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Fixed header */}
        <div className="p-4 sm:p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold">
              {activity ? "Edit Activity" : "Add Activity"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              ✕
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} id="activity-form">
            <div className="space-y-3 sm:space-y-4">
              <div>
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

              {/* Trip Date Pills */}
              {trip?.startDate && trip?.endDate && (
                <div>
                  <TripDatePicker
                    startDate={new Date(trip.startDate)}
                    endDate={new Date(trip.endDate)}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    label="Select Trip Day"
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.date.message}</p>
                  )}
                </div>
              )}

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

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Location</label>
                <div className="flex w-full gap-1 sm:gap-2">
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
                      className="whitespace-nowrap px-2 text-xs flex-shrink-0"
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
                    className="whitespace-nowrap px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0"
                    onClick={async () => {
                      // Force use the current input value (not the debounced one)
                      const locationName = searchTerm || watch("locationName");
                      if (!locationName) return;

                      // Show what we're actually searching for in the logs

                      try {
                        // Clear existing location results
                        setLocationResults([]);

                        // Step 1: Use our AI-powered location API to get structured data with trip city context
                        // Print full trip object to debug

                        // Extract city from trip - try multiple properties
                        let cityContext = "New York City"; // Default
                        if (trip?.city && trip.city !== "") {
                          cityContext = trip.city;

                        } else if (trip?.location && trip.location !== "") {
                          cityContext = trip.location;

                        } else {

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

                        // Remove hardcoded location - let AI handle all location searches

                        // Process the multiple locations returned by the API
                        if (aiData.locations && Array.isArray(aiData.locations)) {
                          const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

                          // Process each location to get coordinates
                          const processedLocations = await Promise.all(
                            aiData.locations.map(async (loc: LocationResult) => {
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

                                  if (mapboxData.features && mapboxData.features.length > 0) {
                                    const feature = mapboxData.features[0];

                                    // Check if center exists and is an array with at least 2 elements
                                    if (feature.center && Array.isArray(feature.center) && feature.center.length >= 2) {
                                      // Return location with coordinates
                                      return {
                                        ...loc,
                                        latitude: feature.center[1].toString(),
                                        longitude: feature.center[0].toString()
                                      };
                                    }
                                  }
                                }

                                // Return the original location without valid coordinates
                                return loc;
                              } catch (e) {
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
                              latitude: "",  // No default coordinates
                              longitude: ""
                            }]);

                            toast({
                              title: "Location added",
                              description: "Using approximate coordinates",
                            });
                          }

                          return;
                        }

                        // Fallback for old API response format or errors

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

              <div>
                <input type="hidden" {...register("latitude")} />
                <input type="hidden" {...register("longitude")} />
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Notes</label>
                <Textarea
                  {...register("notes")}
                  placeholder="Add any details or special instructions"
                  className="min-h-[60px] max-h-[80px]"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {Object.values(ACTIVITY_TAGS).map((tag) => (
                    <Button
                      key={tag.id}
                      type="button"
                      variant={selectedTag === tag.id ? "default" : "outline"}
                      className="px-2 py-1 h-7 text-xs"
                      onClick={() => handleTagChange(tag.id)}
                    >
                      {tag.icon && <span className="mr-0.5 text-sm">{tag.icon}</span>}
                      <span>{tag.label}</span>
                    </Button>
                  ))}
                </div>
                <input type="hidden" {...register("tag")} value={selectedTag} />
              </div>

              {/* Travel Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Travel Mode</label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={watch("travelMode") === "walking" ? "default" : "outline"}
                    className="px-2 py-1 h-7 text-xs"
                    onClick={() => setValue("travelMode", "walking")}
                  >
                    🚶 Walk
                  </Button>
                  <Button
                    type="button"
                    variant={watch("travelMode") === "driving" ? "default" : "outline"}
                    className="px-2 py-1 h-7 text-xs"
                    onClick={() => setValue("travelMode", "driving")}
                  >
                    🚗 Drive
                  </Button>
                  <Button
                    type="button"
                    variant={watch("travelMode") === "transit" ? "default" : "outline"}
                    className="px-2 py-1 h-7 text-xs"
                    onClick={() => setValue("travelMode", "transit")}
                  >
                    🚌 Transit
                  </Button>
                </div>
              </div>

              {/* Bookable Activity Section - only show after title and location are set */}
              {watch("title") && watch("locationName") && (
                <div className="border-t pt-3">
                  <BookableActivity
                    activityTitle={watch("title")}
                    latitude={watch("latitude")}
                    longitude={watch("longitude")}
                    city={trip?.city || trip?.location}  // Pass the trip's city for better search results
                    onBook={(product) => {
                      // Track booking click
                      // Optionally add booking info to notes
                      const currentNotes = watch("notes") || "";
                      const bookingNote = `\n\n📍 Bookable tour: ${product.productName} (from $${product.fromPrice})`;
                      if (!currentNotes.includes(bookingNote)) {
                        setValue("notes", currentNotes + bookingNote);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Fixed footer */}
        <div className="p-4 sm:p-6 border-t bg-background flex-shrink-0">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="activity-form"
              disabled={createActivity.isPending || updateActivity.isPending}
              className="flex-1"
            >
              {activity ? (
                updateActivity.isPending ? "Updating..." : "Update"
              ) : (
                createActivity.isPending ? "Adding..." : "Add Activity"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}