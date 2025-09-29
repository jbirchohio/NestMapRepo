import React from "react";
import { ClientActivity } from "@/lib/types";
import TagBadge from "@/components/TagBadge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Baby, Moon, Cookie, Coffee } from "lucide-react";

interface ActivityItemProps {
  activity: ClientActivity;
  activityNumber?: number;
  onClick: (activity: ClientActivity) => void;
  onDelete?: () => void;
  regenerationsRemaining?: number;
  onRegenerationsUpdate?: (remaining: number) => void;
}

export default function ActivityItem({
  activity,
  activityNumber,
  onClick,
  onDelete,
  regenerationsRemaining,
  onRegenerationsUpdate,
}: ActivityItemProps) {
  const { toast } = useToast();
  const { notifySnackbar } = useNotification();

  const deleteActivity = useMutation({
    mutationFn: async () => {
      const url = `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`;
      return apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"],
      });
      notifySnackbar({ message: "Activity deleted." });
      if (onDelete) onDelete();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Could not delete the activity. Please try again.";
      notifySnackbar({ message: errorMessage });
    },
  });

  const regenerateActivity = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", API_ENDPOINTS.AI.REGENERATE_ACTIVITY, {
        activity_id: activity.id,
        trip_id: activity.tripId,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"],
      });

      toast({
        title: "Activity Regenerated!",
        description: `New activity created. ${data.regenerations_remaining} regenerations remaining.`,
      });
      notifySnackbar({ message: `Regenerated. ${data.regenerations_remaining} remaining.` });

      if (onRegenerationsUpdate) {
        onRegenerationsUpdate(data.regenerations_remaining);
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to regenerate activity";
      if (error?.error === "Regeneration limit reached") {
        toast({
          title: "Regeneration Limit Reached",
          description: `You've used all ${error.limit} regenerations for this trip.`,
          variant: "destructive",
        });
      } else {
        notifySnackbar({ message: errorMessage });
      }
    },
  });

  const formatTime = (time: string) => {
    if (!time) return "--:--";
    const parts = time.split(":");
    if (parts.length < 2) return time;
    const [hours, minutes = "00"] = parts;
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { dismiss } = toast({
      title: "Delete Activity?",
      description: "Are you sure you want to delete this activity?",
      action: (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              deleteActivity.mutate();
              dismiss();
            }}
            variant="destructive"
            size="sm"
            className="h-8 px-3 text-xs"
          >
            Delete
          </Button>
          <Button onClick={() => dismiss()} variant="outline" size="sm" className="h-8 px-3 text-xs">
            Cancel
          </Button>
        </div>
      ),
    });
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (regenerationsRemaining === 0) {
      toast({
        title: "No Regenerations Left",
        description: "You've used all regenerations for this trip.",
        variant: "destructive",
      });
      return;
    }
    const { dismiss } = toast({
      title: "Try a Different Activity?",
      description: `This will replace "${activity.title}" with a new suggestion. You have ${regenerationsRemaining} regenerations left.`,
      action: (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              regenerateActivity.mutate();
              dismiss();
            }}
            size="sm"
            className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700"
          >
            Generate New
          </Button>
          <Button onClick={() => dismiss()} variant="outline" size="sm" className="h-8 px-3 text-xs">
            Keep Current
          </Button>
        </div>
      ),
    });
  };

  const openInGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    let mapsUrl = "";
    if (activity.latitude && activity.longitude) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`;
    } else if (activity.locationName) {
      const encodedLocation = encodeURIComponent(activity.locationName);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    } else if (activity.title) {
      const encodedTitle = encodeURIComponent(activity.title);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedTitle}`;
    }
    if (mapsUrl) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = mapsUrl.replace("https://", "comgooglemaps://");
        setTimeout(() => {
          window.open(mapsUrl, "_blank");
        }, 500);
      } else {
        window.open(mapsUrl, "_blank");
      }
    }
  };

  return (
    <div className="relative timeline-item group">
      <div
        className={
          `bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-sm hover:shadow cursor-pointer ` +
          `${activity.conflict ? "border-[hsl(var(--destructive))]" : ""} ` +
          `${activity.title?.toLowerCase().includes("nap") ? "bg-purple-50 border-purple-200" : ""} ` +
          `${activity.title?.toLowerCase().includes("snack") ? "bg-orange-50 border-orange-200" : ""} ` +
          `${activity.title?.toLowerCase().includes("playground") ? "bg-green-50 border-green-200" : ""} ` +
          `relative overflow-hidden`
        }
      >
        <div
          className={
            `${activity.title?.toLowerCase().includes("nap") ? "bg-purple-500" : ""} ` +
            `${activity.title?.toLowerCase().includes("snack") ? "bg-orange-500" : ""} ` +
            `${activity.title?.toLowerCase().includes("playground") ? "bg-green-500" : ""} ` +
            `${!activity.title?.toLowerCase().includes("nap") &&
            !activity.title?.toLowerCase().includes("snack") &&
            !activity.title?.toLowerCase().includes("playground")
              ? "bg-[hsl(var(--primary))]"
              : ""} ` +
            "text-white px-2 py-1 text-sm font-medium flex items-center justify-between"
          }
        >
          {activityNumber && (
            <span className="bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {activityNumber}
            </span>
          )}
          <span className="flex-1 text-center">{formatTime(activity.time)}</span>
          {activityNumber ? <span className="w-5" /> : null}
        </div>

        <div className="p-2 relative">
          <div className="absolute top-1 right-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
            {typeof regenerationsRemaining === "number" && regenerationsRemaining >= 0 && (
              <button
                className={`${
                  regenerationsRemaining > 0
                    ? "bg-purple-500 hover:bg-purple-600"
                    : "bg-gray-400 cursor-not-allowed"
                } text-white p-1 rounded-full cursor-pointer shadow-sm transition-colors`}
                onClick={handleRegenerate}
                title={
                  regenerationsRemaining > 0
                    ? `Try different suggestion (${regenerationsRemaining} left)`
                    : "No regenerations left"
                }
              >
                <span className="sr-only">Regenerate</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 11-9.584-2H5.06A7.002 7.002 0 0019 13c0-3.86-3.141-7-7-7z" />
                </svg>
              </button>
            )}
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full cursor-pointer shadow-sm transition-colors"
              onClick={openInGoogleMaps}
              title="Open in Google Maps"
            >
              <span className="sr-only">Open in Google Maps</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full cursor-pointer shadow-sm transition-colors"
              onClick={handleDelete}
              title="Delete activity"
            >
              <span className="sr-only">Delete</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" />
              </svg>
            </button>
          </div>

          <div onClick={() => onClick(activity)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {activity.title?.toLowerCase().includes("nap") && (
                  <Moon className="w-3 h-3 text-purple-600 flex-shrink-0" />
                )}
                {activity.title?.toLowerCase().includes("snack") && (
                  <Cookie className="w-3 h-3 text-orange-600 flex-shrink-0" />
                )}
                {activity.title?.toLowerCase().includes("coffee") && (
                  <Coffee className="w-3 h-3 text-amber-600 flex-shrink-0" />
                )}
                {activity.title?.toLowerCase().includes("playground") && (
                  <Baby className="w-3 h-3 text-green-600 flex-shrink-0" />
                )}
                <h3 className="font-medium text-sm truncate">{activity.title}</h3>
                {activity.kidFriendly && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0 bg-green-100 text-green-700 rounded text-xs flex-shrink-0">
                    <Baby className="h-2.5 w-2.5" />
                    Kids
                  </span>
                )}
              </div>
              {activity.tag && <TagBadge tag={activity.tag} />}
            </div>

            {(activity.strollerAccessible || activity.category) && (
              <div className="flex gap-1 mt-0.5">
                {activity.strollerAccessible && (
                  <span className="text-xs text-blue-600">Stroller</span>
                )}
                {activity.category && (
                  <span className="text-xs text-gray-500">{activity.category}</span>
                )}
              </div>
            )}

            {activity.notes && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.notes}</div>
            )}

            {(activity.price || activity.actualCost || activity.travelTimeFromPrevious) && (
              <div className="flex items-center justify-between gap-2 mt-1">
                {(activity.price || activity.actualCost) && (
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${activity.isPaid ? "text-green-600" : "text-gray-600"}`}>
                      {activity.actualCost ? `$${activity.actualCost}` : `~$${activity.price}`}
                      {activity.splitBetween && activity.splitBetween > 1 && (
                        <span className="text-xs ml-0.5">×{activity.splitBetween}</span>
                      )}
                    </span>
                    {activity.isPaid && (
                      <span className="text-xs bg-green-100 text-green-700 px-1 py-0 rounded">Paid</span>
                    )}
                  </div>
                )}

                {activity.travelTimeFromPrevious && (
                  <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                    {String(activity.travelMode).toLowerCase() === "walking" && "🚶"}
                    {String(activity.travelMode).toLowerCase() === "driving" && "🚗"}
                    {String(activity.travelMode).toLowerCase() === "transit" && "🚌"}
                    {(!activity.travelMode || String(activity.travelMode).toLowerCase() === "null") && "⏱️"}
                    <span className="ml-0.5">{activity.travelTimeFromPrevious}</span>
                  </div>
                )}
              </div>
            )}

            {activity.timeConflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-1 bg-red-50 dark:bg-red-950 p-1 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                TIME CONFLICT: Another activity is scheduled at the same time!
              </div>
            )}

            {activity.conflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Travel time may be too long
              </div>
            )}
          </div>

          {/* BookableActivity placeholder intentionally omitted */}
        </div>
      </div>
    </div>
  );
}

