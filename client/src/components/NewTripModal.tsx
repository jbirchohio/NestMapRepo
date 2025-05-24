import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
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
  };
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues,
  });
  
  const city = watch("city");
  
  // Look up city coordinates when city field changes
  useEffect(() => {
    if (city && city.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const result = await geocodeLocation(city);
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
        collaborators: []
      };
      
      console.log("Creating trip with data:", tripData);
      
      // Handle guest mode with localStorage
      if (isGuestMode) {
        const guestTrip = {
          id: Date.now(), // Use timestamp as ID for guest trips
          ...tripData,
          userId: -1,
          createdAt: new Date().toISOString(),
          // Include city coordinates for map centering
          latitude: data.cityLatitude,
          longitude: data.cityLongitude,
        };
        
        // Store in localStorage
        const existingTrips = JSON.parse(localStorage.getItem("nestmap_guest_trips") || "[]");
        const updatedTrips = [...existingTrips, guestTrip];
        localStorage.setItem("nestmap_guest_trips", JSON.stringify(updatedTrips));
        
        return guestTrip;
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