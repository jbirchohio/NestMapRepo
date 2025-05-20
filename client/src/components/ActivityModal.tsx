import { useState, useEffect } from "react";
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
  const [selectedTag, setSelectedTag] = useState<string | undefined>(activity?.tag);
  
  const defaultValues: ActivityFormValues = {
    title: activity?.title || "",
    date: date,
    time: activity?.time || "12:00",
    locationName: activity?.locationName || "",
    notes: activity?.notes || "",
    tag: activity?.tag,
    latitude: activity?.latitude,
    longitude: activity?.longitude,
    assignedTo: activity?.assignedTo,
  };
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues,
  });
  
  const locationName = watch("locationName");
  
  // Geocode the location when it changes
  useEffect(() => {
    if (locationName && locationName.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const result = await geocodeLocation(locationName);
          if (result) {
            setValue("latitude", result.latitude.toString());
            setValue("longitude", result.longitude.toString());
          }
        } catch (error) {
          console.error("Error geocoding location:", error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [locationName, geocodeLocation, setValue]);
  
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
              <Input
                {...register("locationName")}
                placeholder="Search for a place"
                className={errors.locationName ? "border-[hsl(var(--destructive))]" : ""}
              />
              {errors.locationName ? (
                <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.locationName.message}</p>
              ) : (
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Start typing to auto-pin on map</p>
              )}
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
