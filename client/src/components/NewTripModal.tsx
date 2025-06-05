import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/JWTAuthContext";
import useMapbox from "@/hooks/useMapbox";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tripSchema = z.object({
  title: z.string().min(1, "Trip name is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  city: z.string().min(1, "Please select a city"),
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
  hotel: z.string().optional(),
  hotelLatitude: z.string().optional(),
  hotelLongitude: z.string().optional(),
  // B2B specific fields
  tripType: z.enum(["personal", "business"]).default("personal"),
  clientName: z.string().optional(),
  projectType: z.string().optional(),
  organization: z.string().optional(),
  budget: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tripId: number) => void;
  userId: number;
  isGuestMode?: boolean;
}

export default function NewTripModal({ isOpen, onClose, onSuccess, userId, isGuestMode = false }: NewTripModalProps) {
  const { toast } = useToast();
  const { roleType } = useAuth();
  const { geocodeLocation } = useMapbox();
  
  // Set default dates (today to 3 days from now)
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 3);
  
  const defaultValues: TripFormValues = {
    title: "New Trip",
    startDate: today,
    endDate: endDate,
    city: "",
    cityLatitude: "",
    cityLongitude: "",
    hotel: "",
    hotelLatitude: "",
    hotelLongitude: "",
    tripType: "personal",
    clientName: "",
    projectType: "",
    organization: "",
    budget: "",
  };
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues,
  });
  
  const city = watch("city");
  const hotel = watch("hotel");
  const tripType = watch("tripType");
  
  // Hotel search state
  const [hotelSearchTerm, setHotelSearchTerm] = useState("");
  const [hotelResults, setHotelResults] = useState<Array<{
    name: string;
    address?: string;
    city: string;
    region?: string;
    country?: string;
    description?: string;
    latitude?: string;
    longitude?: string;
  }>>([]);
  
  // Look up city coordinates when city field changes
  useEffect(() => {
    if (city && city.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const result = await geocodeLocation(city, true);
          if (result) {
            setValue("cityLatitude", result.latitude.toString());
            setValue("cityLongitude", result.longitude.toString());
            
            // Show success message
            toast({
              title: "City found",
              description: result.fullAddress,
              duration: 2000,
            });
          }
        } catch (error) {
          console.error("Error geocoding city:", error);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [city, geocodeLocation, setValue, toast]);

  // Look up hotel coordinates when hotel field changes
  useEffect(() => {
    if (hotel && hotel.length > 3 && city) {
      const timer = setTimeout(async () => {
        try {
          // Search for hotel in the context of the city
          const searchTerm = hotel.includes(city) ? hotel : `${hotel}, ${city}`;
          const result = await geocodeLocation(searchTerm);
          if (result) {
            setValue("hotelLatitude", result.latitude.toString());
            setValue("hotelLongitude", result.longitude.toString());
            
            toast({
              title: "Hotel found",
              description: result.fullAddress,
              duration: 2000,
            });
          }
        } catch (error) {
          console.error("Error geocoding hotel:", error);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [hotel, city, geocodeLocation, setValue, toast]);
  
  const createTrip = useMutation({
    mutationFn: async (data: TripFormValues) => {
      // Prepare the trip data with proper location information
      const tripData = {
        title: data.title,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        userId,
        city: data.city, // This is the primary field we use for location search
        location: data.city, // Also store in location field for backward compatibility
        collaborators: [],
        // Include city coordinates for map centering
        cityLatitude: data.cityLatitude,
        cityLongitude: data.cityLongitude,
        // Include hotel information
        hotel: data.hotel,
        hotelLatitude: data.hotelLatitude,
        hotelLongitude: data.hotelLongitude,
      };
      
      console.log("Creating trip with data:", tripData);
      console.log("Current userId from auth context:", userId);
      console.log("Is guest mode:", isGuestMode);
      
      // Handle guest mode with localStorage
      if (isGuestMode) {
        const guestTrip = {
          id: -(Math.floor(Date.now() / 1000) % 100000), // Smaller negative ID for guest trips
          ...tripData,
          userId: -1,
          createdAt: new Date().toISOString(),
          // Include city coordinates for map centering
          latitude: data.cityLatitude,
          longitude: data.cityLongitude,
          cityLatitude: data.cityLatitude,
          cityLongitude: data.cityLongitude,
        };
        
        // Store in localStorage
        const existingTrips = JSON.parse(localStorage.getItem("nestmap_guest_trips") || "[]");
        const updatedTrips = [...existingTrips, guestTrip];
        localStorage.setItem("nestmap_guest_trips", JSON.stringify(updatedTrips));
        
        return guestTrip;
      }
      
      // For authenticated users, ensure we have a valid userId
      if (!userId || userId === null) {
        throw new Error("Authentication not complete. Please wait a moment and try again.");
      }
      
      // Regular authenticated user flow
      const res = await apiRequest("POST", API_ENDPOINTS.TRIPS, tripData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trip created",
        description: "Your new trip has been created successfully.",
      });
      // Invalidate trips cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS] });
      onSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not create trip. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating trip:", error);
    }
  });
  
  const onSubmit = (data: TripFormValues) => {
    createTrip.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Enter your trip details to get started with planning.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Trip Name</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g., Summer Vacation"
              />
              {errors.title && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.title.message}</p>
              )}
            </div>

            {/* B2B Trip Type Toggle */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tripType" className="text-sm font-medium">Trip Type</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600">Personal</span>
                  <Switch
                    id="tripType"
                    checked={tripType === "business"}
                    onCheckedChange={(checked) => setValue("tripType", checked ? "business" : "personal")}
                  />
                  <span className="text-sm text-slate-600">Business</span>
                </div>
              </div>
            </div>

            {/* Business-specific fields */}
            {tripType === "business" && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  🏢 Business Trip Details
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roleType === 'agency' ? (
                    <div className="grid gap-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        {...register("clientName")}
                        placeholder="e.g., Acme Corp, Johnson & Associates"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="clientName">Department/Team</Label>
                      <Input
                        id="clientName"
                        {...register("clientName")}
                        placeholder="e.g., Sales Team, Engineering Dept"
                      />
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="projectType">Project Type</Label>
                    <Select onValueChange={(value) => setValue("projectType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleType === 'agency' ? (
                          <>
                            <SelectItem value="client_meeting">Client Meeting</SelectItem>
                            <SelectItem value="leisure_travel">Leisure Travel</SelectItem>
                            <SelectItem value="corporate_travel">Corporate Travel</SelectItem>
                            <SelectItem value="destination_wedding">Destination Wedding</SelectItem>
                            <SelectItem value="group_travel">Group Travel</SelectItem>
                            <SelectItem value="luxury_travel">Luxury Travel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="conference">Conference/Event</SelectItem>
                            <SelectItem value="team_meeting">Team Meeting</SelectItem>
                            <SelectItem value="sales_trip">Sales Trip</SelectItem>
                            <SelectItem value="team_building">Team Building</SelectItem>
                            <SelectItem value="training">Training/Workshop</SelectItem>
                            <SelectItem value="site_visit">Site Visit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="organization">Organization/Department</Label>
                    <Input
                      id="organization"
                      {...register("organization")}
                      placeholder="e.g., Sales Team, Marketing Dept"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget (Optional)</Label>
                    <Input
                      id="budget"
                      {...register("budget")}
                      placeholder="e.g., $5,000, €3,000"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="city">Destination City</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="e.g., New York, Paris, Tokyo"
              />
              {errors.city && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.city.message}</p>
              )}
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Enter your main destination city to center your trip map
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="hotel">Hotel/Accommodation (Optional)</Label>
              <div className="flex w-full space-x-2">
                <Input
                  id="hotel"
                  {...register("hotel")}
                  placeholder="e.g., Hotel Name, Airbnb address"
                  onChange={(e) => setHotelSearchTerm(e.target.value)}
                />
                <Button 
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap px-3"
                  onClick={async () => {
                    const hotelName = hotelSearchTerm || watch("hotel");
                    if (!hotelName || !city) return;
                    
                    try {
                      setHotelResults([]);
                      
                      const aiResponse = await fetch("/api/ai/find-location", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ 
                          searchQuery: hotelName,
                          cityContext: city
                        })
                      });
                      
                      if (!aiResponse.ok) {
                        throw new Error("Error searching for hotel");
                      }
                      
                      const aiData = await aiResponse.json();
                      
                      if (aiData.locations && Array.isArray(aiData.locations)) {
                        const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
                        
                        const processedLocations = await Promise.all(
                          aiData.locations.map(async (loc: any) => {
                            try {
                              const fullAddress = (loc.address || loc.name) + ", " + 
                                               (loc.city || city) + ", " + 
                                               (loc.region || "");
                              
                              const mapboxResponse = await fetch(
                                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1`
                              );
                              
                              if (mapboxResponse.ok) {
                                const mapboxData = await mapboxResponse.json();
                                
                                if (mapboxData.features && mapboxData.features.length > 0) {
                                  const feature = mapboxData.features[0];
                                  
                                  // Check if center exists and is an array with at least 2 elements
                                  if (feature.center && Array.isArray(feature.center) && feature.center.length >= 2) {
                                    return {
                                      ...loc,
                                      latitude: feature.center[1].toString(),
                                      longitude: feature.center[0].toString()
                                    };
                                  }
                                }
                              }
                              
                              return loc;
                            } catch (e) {
                              console.error("Error geocoding hotel:", e);
                              return loc;
                            }
                          })
                        );
                        
                        const validLocations = processedLocations.filter(loc => 
                          loc.latitude && loc.longitude
                        );
                        
                        if (validLocations.length > 0) {
                          setHotelResults(validLocations);
                          toast({
                            title: "Hotel search results",
                            description: `Found ${validLocations.length} matching hotels`,
                          });
                        } else {
                          toast({
                            title: "No hotels found",
                            description: "Try a different search term",
                            variant: "destructive",
                          });
                        }
                      }
                    } catch (error) {
                      console.error("Error searching for hotel:", error);
                      toast({
                        title: "Search error",
                        description: "Could not search for hotels. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  🔍 Search
                </Button>
              </div>
              
              {hotelResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                  {hotelResults.map((hotel, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="ghost"
                      className="w-full p-2 h-auto text-left justify-start border-b last:border-b-0 rounded-none"
                      onClick={() => {
                        setValue("hotel", hotel.name, { shouldValidate: true });
                        setValue("hotelLatitude", hotel.latitude);
                        setValue("hotelLongitude", hotel.longitude);
                        setHotelSearchTerm(hotel.name);
                        setHotelResults([]);
                        toast({
                          title: "Hotel selected",
                          description: hotel.address || hotel.name,
                        });
                      }}
                    >
                      <div className="font-medium">{hotel.name}</div>
                      {hotel.address && (
                        <div className="text-xs text-muted-foreground">{hotel.address}</div>
                      )}
                      {hotel.description && (
                        <div className="text-xs text-muted-foreground mt-1">{hotel.description}</div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Where you're staying - this will appear as a pin on your map
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate", {
                    valueAsDate: true,
                  })}
                  defaultValue={format(today, "yyyy-MM-dd")}
                />
                {errors.startDate && (
                  <p className="text-xs text-[hsl(var(--destructive))]">{errors.startDate.message}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate", {
                    valueAsDate: true,
                  })}
                  defaultValue={format(endDate, "yyyy-MM-dd")}
                />
                {errors.endDate && (
                  <p className="text-xs text-[hsl(var(--destructive))]">{errors.endDate.message}</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createTrip.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTrip.isPending}
            >
              {createTrip.isPending ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}