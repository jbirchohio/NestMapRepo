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

  // Create/Update mutation
  const createActivity = useMutation({
    mutationFn: async (data: any) => {
      // Geocode the location if it's a name
      let locationData = {
        latitude: "",
        longitude: "",
      };

      if (data.locationName && data.locationName !== "Find a spot nearby") {
        try {
          const result = await geocodeLocation(data.locationName);
          if (result) {
            locationData.latitude = result.latitude.toString();
            locationData.longitude = result.longitude.toString();
          }
        } catch (error) {
          console.log("Could not geocode location");
        }
      }

      const activityData = {
        ...data,
        ...locationData,
        tripId,
        order: activity?.order || 0,
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
      
      const guestTripsData = localStorage.getItem("remvana_guest_trips");
      const isGuestTrip = guestTripsData && JSON.parse(guestTripsData).some((trip: ClientTrip) => trip.id === tripId);
      
      if (isGuestTrip) {
        const updatedActivity = {
          ...activity,
          ...data,
          date: data.date.toISOString(),
        };
        
        const existingActivities: ClientActivity[] = JSON.parse(localStorage.getItem(`guest_activities_${tripId}`) || '[]');
        const updatedActivities = existingActivities.map((act: ClientActivity) => 
          act.id === activity.id ? updatedActivity : act
        );
        localStorage.setItem(`guest_activities_${tripId}`, JSON.stringify(updatedActivities));
        return updatedActivity;
      }
      
      return apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, {
        ...data,
        tripId,
        order: activity.order,
      });
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

  // For editing, we'll need to add edit support to ActivityModalEasy
  // For now, just use the simple modal for new activities
  if (activity) {
    // TODO: Add edit mode to ActivityModalEasy
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Edit Activity</h2>
          <p className="text-gray-600">Edit mode coming soon!</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityModalSmart
      onClose={onClose}
      onSave={handleSave}
      date={date}
      tripId={tripId}
    />
  );
}