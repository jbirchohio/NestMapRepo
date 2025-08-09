import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity, ClientTrip } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import ActivityModalSmart from "@/components/ActivityModalSmart";

interface ActivityModalProps {
  tripId: string | number;
  date: Date;
  activity: ClientActivity | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ActivityModalConsumer({ 
  tripId, 
  date, 
  activity, 
  onClose, 
  onSave 
}: ActivityModalProps) {
  const { toast } = useToast();
  const { geocodeLocation } = useMapbox();
  
  // Get trip context from localStorage for geocoding proximity
  const getTripContext = () => {
    try {
      const tripData = localStorage.getItem(`trip_${tripId}`);
      if (tripData) {
        return JSON.parse(tripData);
      }
    } catch (e) {
      console.error('Error getting trip context:', e);
    }
    return null;
  };

  // Create/Update mutation
  const createActivity = useMutation({
    mutationFn: async (data: any) => {
      // Only geocode if coordinates are not already provided
      let locationData = {
        latitude: data.latitude || "",
        longitude: data.longitude || "",
      };

      // If no coordinates provided and we have a location name, geocode it
      if (!data.latitude && !data.longitude && data.locationName && data.locationName !== "Find a spot nearby") {
        try {
          const tripContext = getTripContext();
          const result = await geocodeLocation(data.locationName, { tripContext });
          if (result) {
            locationData.latitude = result.latitude.toString();
            locationData.longitude = result.longitude.toString();
            console.log(`Geocoded with trip context: ${data.locationName}`, result);
          }
        } catch (error) {
          console.log("Could not geocode location");
        }
      }

      const activityData = {
        ...data,
        ...locationData,
        tripId: typeof tripId === 'string' ? parseInt(tripId) : tripId,
        order: 0,  // New activities don't have an order yet
      };
      
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);
      
      if (isGuestTrip) {
        const newActivity = {
          ...activityData,
          id: Date.now(),
          date: data.date.toISOString(),
        };
        
        const existingActivities = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        existingActivities.push(newActivity);
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(existingActivities));
        return newActivity;
      }
      
      return apiRequest("POST", API_ENDPOINTS.ACTIVITIES, activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Added to your trip! 🎉",
        description: "Keep the adventure going!",
      });
      onSave();
      onClose();
    },
    onError: () => {
      toast({
        title: "Oops!",
        description: "Something went wrong. Try again?",
        variant: "destructive",
      });
    },
  });
  
  const updateActivity = useMutation({
    mutationFn: async (data: any) => {
      if (!activity) return null;
      
      // Geocode if location changed but no new coordinates provided
      let locationData = {
        latitude: data.latitude || activity.latitude || "",
        longitude: data.longitude || activity.longitude || "",
      };
      
      // Check if location name changed and needs geocoding
      const locationChanged = data.locationName && data.locationName !== activity.locationName;
      const needsGeocoding = locationChanged && !data.latitude && !data.longitude && 
                             data.locationName !== "Find a spot nearby";
      
      if (needsGeocoding) {
        try {
          const tripContext = getTripContext();
          const result = await geocodeLocation(data.locationName, { tripContext });
          if (result) {
            locationData.latitude = result.latitude.toString();
            locationData.longitude = result.longitude.toString();
            console.log(`Geocoded updated location with context: ${data.locationName}`, result);
          } else {
            console.log(`Could not geocode updated location: ${data.locationName}`);
          }
        } catch (error) {
          console.log("Geocoding error during update:", error);
        }
      }
      
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);
      
      if (isGuestTrip) {
        const updatedActivity = {
          ...activity,
          ...data,
          ...locationData,
          date: typeof data.date === 'string' ? data.date : data.date.toISOString(),
        };
        
        const existingActivities: ClientActivity[] = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        const updatedActivities = existingActivities.map((act: ClientActivity) => 
          act.id === activity.id ? updatedActivity : act
        );
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(updatedActivities));
        return updatedActivity;
      }
      
      // Ensure we send the proper data structure for update
      const updateData = {
        title: data.title,
        time: data.time,
        locationName: data.locationName,
        notes: data.notes,
        date: data.date,
        ...locationData,
        tripId: typeof tripId === 'string' ? parseInt(tripId) : tripId,
        order: activity.order,
      };
      
      return apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, tripId, "activities"] });
      toast({
        title: "Updated!",
        description: "Your changes are saved.",
      });
      onSave();
      onClose();
    },
    onError: () => {
      toast({
        title: "Oops!",
        description: "Something went wrong. Try again?",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: any) => {
    if (activity) {
      updateActivity.mutate(data);
    } else {
      createActivity.mutate(data);
    }
  };

  // Pass activity to ActivityModalSmart for both create and edit modes
  return (
    <ActivityModalSmart
      onClose={onClose}
      onSave={handleSave}
      date={date}
      tripId={tripId}
      activity={activity}  // Pass the activity for edit mode
    />
  );
}