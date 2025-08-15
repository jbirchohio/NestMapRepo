import { ClientActivity } from "@/lib/types";
import TagBadge from "@/components/TagBadge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Baby, Moon, Cookie, Coffee, RefreshCw } from "lucide-react";
// import BookableActivity from "@/components/BookableActivity"; // Hidden for now

interface ActivityItemProps {
  activity: ClientActivity;
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
  onRegenerationsUpdate
}: ActivityItemProps) {
  const { toast } = useToast();

  // Delete activity mutation
  const deleteActivity = useMutation({
    mutationFn: async () => {
      const url = `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`;
      return apiRequest("DELETE", url);
    },
    onSuccess: () => {
      // Invalidate activities query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"] });

      toast({
        title: "Activity Deleted",
        description: "The activity has been removed from your itinerary.",
      });

      // Call parent component's onDelete if provided
      if (onDelete) onDelete();
    },
    onError: (error: any) => {
      // Show more detailed error message
      const errorMessage = error.message || "Could not delete the activity. Please try again.";

      toast({
        title: "Error Deleting Activity",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Regenerate activity mutation
  const regenerateActivity = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ai/regenerate-activity", {
        activity_id: activity.id,
        trip_id: activity.tripId
      });
    },
    onSuccess: (data) => {
      // Invalidate activities query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"] });

      toast({
        title: "✨ Activity Regenerated!",
        description: `New activity created. ${data.regenerations_remaining} regenerations remaining.`,
      });

      // Update parent component with remaining regenerations
      if (onRegenerationsUpdate) {
        onRegenerationsUpdate(data.regenerations_remaining);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.error || "Failed to regenerate activity";
      
      if (error.error === "Regeneration limit reached") {
        toast({
          title: "⚠️ Regeneration Limit Reached",
          description: `You've used all ${error.limit} regenerations for this trip.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Regenerating Activity",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Convert 24-hour time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return "--:--";
    const parts = time.split(':');
    if (parts.length < 2) return time; // Return as-is if not in HH:MM format
    
    const [hours, minutes = '00'] = parts;
    const hour = parseInt(hours);
    if (isNaN(hour)) return time; // Return as-is if hour is not a number
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Handle delete action
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the activity click

    // Show a confirmation toast
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
          <Button
            onClick={() => dismiss()}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
          >
            Cancel
          </Button>
        </div>
      ),
    });
  };

  // Handle regenerate action
  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the activity click

    if (regenerationsRemaining === 0) {
      toast({
        title: "⚠️ No Regenerations Left",
        description: "You've used all regenerations for this trip.",
        variant: "destructive",
      });
      return;
    }

    // Show a confirmation toast with warning about limited regenerations
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
          <Button
            onClick={() => dismiss()}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
          >
            Keep Current
          </Button>
        </div>
      ),
    });
  };

  // Open in Google Maps
  const openInGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the activity click
    
    // Generate Google Maps URL
    let mapsUrl = '';
    
    if (activity.latitude && activity.longitude) {
      // If we have coordinates, use them
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`;
    } else if (activity.locationName) {
      // Otherwise use the location name
      const encodedLocation = encodeURIComponent(activity.locationName);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    } else if (activity.title) {
      // Last resort, search by activity title
      const encodedTitle = encodeURIComponent(activity.title);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedTitle}`;
    }
    
    if (mapsUrl) {
      // Check if on mobile to open app instead of browser
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Try to open in Google Maps app on mobile
        window.location.href = mapsUrl.replace('https://', 'comgooglemaps://');
        // Fallback to browser after a short delay
        setTimeout(() => {
          window.open(mapsUrl, '_blank');
        }, 500);
      } else {
        // Desktop - open in new tab
        window.open(mapsUrl, '_blank');
      }
    }
  };

  return (
    <div className="relative timeline-item group">
      {/* Activity card with time header */}
      <div
        className={`
          bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-sm hover:shadow cursor-pointer
          ${activity.conflict ? 'border-[hsl(var(--destructive))]' : ''}
          ${activity.title?.toLowerCase().includes('nap') ? 'bg-purple-50 border-purple-200' : ''}
          ${activity.title?.toLowerCase().includes('snack') ? 'bg-orange-50 border-orange-200' : ''}
          ${activity.title?.toLowerCase().includes('playground') ? 'bg-green-50 border-green-200' : ''}
          relative overflow-hidden
        `}
      >
        {/* Time header with activity number */}
        <div className={`
          ${activity.title?.toLowerCase().includes('nap') ? 'bg-purple-500' : ''}
          ${activity.title?.toLowerCase().includes('snack') ? 'bg-orange-500' : ''}
          ${activity.title?.toLowerCase().includes('playground') ? 'bg-green-500' : ''}
          ${!activity.title?.toLowerCase().includes('nap') && 
            !activity.title?.toLowerCase().includes('snack') && 
            !activity.title?.toLowerCase().includes('playground') ? 'bg-[hsl(var(--primary))]' : ''}
          text-white px-2 py-1 text-sm font-medium flex items-center justify-between
        `}>
          {activityNumber && (
            <span className="bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {activityNumber}
            </span>
          )}
          <span className="flex-1 text-center">{formatTime(activity.time)}</span>
          {activityNumber ? <span className="w-5"></span> : null}
        </div>

        <div className="p-2 relative">

          {/* Action buttons - visible on hover on desktop, always visible on mobile */}
          <div className="absolute top-1 right-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
            {/* Try Different button - only show if regenerations are available */}
            {regenerationsRemaining !== undefined && regenerationsRemaining >= 0 && (
              <button
                className={`${
                  regenerationsRemaining > 0 
                    ? 'bg-purple-500 hover:bg-purple-600' 
                    : 'bg-gray-400 cursor-not-allowed'
                } text-white p-1 rounded-full cursor-pointer shadow-sm transition-colors`}
                onClick={handleRegenerate}
                title={regenerationsRemaining > 0 
                  ? `Try different activity (${regenerationsRemaining} left)` 
                  : 'No regenerations left'}
                disabled={regenerationsRemaining === 0}
              >
                <RefreshCw className={`h-3 w-3 ${regenerateActivity.isPending ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {/* Google Maps button */}
            {(activity.latitude || activity.longitude || activity.locationName) && (
              <button
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 cursor-pointer shadow-sm"
                onClick={openInGoogleMaps}
                title="Open in Google Maps"
              >
                <Navigation className="h-3 w-3" />
              </button>
            )}
            
            {/* Delete button */}
            <button
              className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 cursor-pointer shadow-sm"
              onClick={handleDelete}
              title="Delete activity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12m0-12L6 18" />
              </svg>
            </button>
          </div>

          {/* Activity content area - compact */}
          <div onClick={() => onClick(activity)}>
            {/* Title, icons and tag in one line */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {activity.title?.toLowerCase().includes('nap') && <Moon className="w-3 h-3 text-purple-600 flex-shrink-0" />}
                {activity.title?.toLowerCase().includes('snack') && <Cookie className="w-3 h-3 text-orange-600 flex-shrink-0" />}
                {activity.title?.toLowerCase().includes('coffee') && <Coffee className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                {activity.title?.toLowerCase().includes('playground') && <Baby className="w-3 h-3 text-green-600 flex-shrink-0" />}
                <h3 className="font-medium text-sm truncate">{activity.title}</h3>
                {/* Most important badge inline */}
                {activity.kidFriendly && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0 bg-green-100 text-green-700 rounded text-xs flex-shrink-0">
                    <Baby className="h-2.5 w-2.5" />
                    Kids
                  </span>
                )}
              </div>
              {activity.tag && <TagBadge tag={activity.tag} />}
            </div>
            
            {/* Additional badges only if needed - smaller */}
            {(activity.strollerAccessible || activity.category) && (
              <div className="flex gap-1 mt-0.5">
                {activity.strollerAccessible && (
                  <span className="text-xs text-blue-600">♿</span>
                )}
                {activity.category && (
                  <span className="text-xs text-gray-500">{activity.category}</span>
                )}
              </div>
            )}

            {/* Notes (if any) */}
            {activity.notes && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.notes}</div>
            )}

            {/* Cost and travel mode in one compact line */}
            {(activity.price || activity.actualCost || activity.travelTimeFromPrevious) && (
              <div className="flex items-center justify-between gap-2 mt-1">
                {/* Cost */}
                {(activity.price || activity.actualCost) && (
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${activity.isPaid ? 'text-green-600' : 'text-gray-600'}`}>
                      💰 {activity.actualCost ? `$${activity.actualCost}` : `~$${activity.price}`}
                      {activity.splitBetween && activity.splitBetween > 1 && (
                        <span className="text-xs ml-0.5">÷{activity.splitBetween}</span>
                      )}
                    </span>
                    {activity.isPaid && (
                      <span className="text-xs bg-green-100 text-green-700 px-1 py-0 rounded">✓</span>
                    )}
                  </div>
                )}
                
                {/* Travel time */}
                {activity.travelTimeFromPrevious && (
                  <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))]">
                    {String(activity.travelMode).toLowerCase() === "walking" && "🚶"}
                    {String(activity.travelMode).toLowerCase() === "driving" && "🚗"}
                    {String(activity.travelMode).toLowerCase() === "transit" && "🚌"}
                    {(!activity.travelMode || String(activity.travelMode).toLowerCase() === "null") && "🕓"}
                    <span className="ml-0.5">{activity.travelTimeFromPrevious}</span>
                  </div>
                )}
              </div>
            )}

            {/* Time conflict warning - for identical times */}
            {activity.timeConflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-1 bg-red-50 dark:bg-red-950 p-1 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                TIME CONFLICT: Another activity is scheduled at the same time!
              </div>
            )}

            {/* Travel time conflict warning */}
            {activity.conflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Travel time may be too long
              </div>
            )}
          </div>

          {/* Bookable Activity Section - Hidden for now */}
          {/* {activity.locationName && (
            <div className="mt-3 pt-3 border-t">
              <BookableActivity
                activityTitle={activity.title}
                latitude={activity.latitude}
                longitude={activity.longitude}
                onBook={(product) => {
                  }}
              />
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}