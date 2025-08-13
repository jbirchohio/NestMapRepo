import { ClientActivity } from "@/lib/types";
import TagBadge from "@/components/TagBadge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Baby, Moon, Cookie, Coffee } from "lucide-react";
// import BookableActivity from "@/components/BookableActivity"; // Hidden for now

interface ActivityItemProps {
  activity: ClientActivity;
  onClick: (activity: ClientActivity) => void;
  onDelete?: () => void;
}

export default function ActivityItem({ activity, onClick, onDelete }: ActivityItemProps) {
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
    <div className="pl-8 relative timeline-item group">
      {/* Timeline point */}
      <div className="flex items-center absolute left-0 timeline-point">
        <div className="h-6 w-6 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center text-xs font-medium">
          <div className="h-2 w-2 bg-white rounded-full"></div>
        </div>
      </div>

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
        {/* Time header */}
        <div className={`
          ${activity.title?.toLowerCase().includes('nap') ? 'bg-purple-500' : ''}
          ${activity.title?.toLowerCase().includes('snack') ? 'bg-orange-500' : ''}
          ${activity.title?.toLowerCase().includes('playground') ? 'bg-green-500' : ''}
          ${!activity.title?.toLowerCase().includes('nap') && 
            !activity.title?.toLowerCase().includes('snack') && 
            !activity.title?.toLowerCase().includes('playground') ? 'bg-[hsl(var(--primary))]' : ''}
          text-white p-2 text-center font-medium
        `}>
          {formatTime(activity.time)}
        </div>

        <div className="p-3 pt-6 relative">

          {/* Action buttons - visible on hover on desktop, always visible on mobile */}
          <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
            {/* Google Maps button */}
            {(activity.latitude || activity.longitude || activity.locationName) && (
              <button
                className="bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 cursor-pointer shadow-sm"
                onClick={openInGoogleMaps}
                title="Open in Google Maps"
              >
                <Navigation className="h-4 w-4" />
              </button>
            )}
            
            {/* Delete button */}
            <button
              className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 cursor-pointer shadow-sm"
              onClick={handleDelete}
              title="Delete activity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Activity content area */}
          <div onClick={() => onClick(activity)}>
            {/* Title and tag row */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {activity.title?.toLowerCase().includes('nap') && <Moon className="w-4 h-4 text-purple-600" />}
                  {activity.title?.toLowerCase().includes('snack') && <Cookie className="w-4 h-4 text-orange-600" />}
                  {activity.title?.toLowerCase().includes('coffee') && <Coffee className="w-4 h-4 text-amber-600" />}
                  {activity.title?.toLowerCase().includes('playground') && <Baby className="w-4 h-4 text-green-600" />}
                  <h3 className="font-medium">{activity.title}</h3>
                </div>
                {/* Kid-friendly and category badges */}
                <div className="flex gap-2 mt-1">
                  {activity.kidFriendly && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                      <Baby className="h-3 w-3" />
                      <span>Kid-Friendly</span>
                      {activity.minAge !== undefined && activity.maxAge !== undefined && (
                        <span className="text-green-600">({activity.minAge}-{activity.maxAge})</span>
                      )}
                    </div>
                  )}
                  {activity.strollerAccessible && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      <span>♿ Stroller OK</span>
                    </div>
                  )}
                  {activity.category && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <span>{activity.category}</span>
                    </div>
                  )}
                </div>
              </div>
              {activity.tag && <TagBadge tag={activity.tag} />}
            </div>

            {/* Notes (if any) */}
            {activity.notes && (
              <div className="text-sm mt-2">{activity.notes}</div>
            )}

            {/* Cost indicator */}
            {(activity.price || activity.actualCost) && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-medium ${activity.isPaid ? 'text-green-600' : 'text-gray-600'}`}>
                  💰 {activity.actualCost ? `$${activity.actualCost}` : `~$${activity.price}`}
                  {activity.splitBetween && activity.splitBetween > 1 && (
                    <span className="text-xs ml-1">÷{activity.splitBetween}</span>
                  )}
                </span>
                {activity.isPaid && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Paid</span>
                )}
                {activity.costCategory && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                    {activity.costCategory}
                  </span>
                )}
              </div>
            )}

            {/* Travel time indicator */}
            {activity.travelTimeFromPrevious && (
              <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))] mt-2">
                {String(activity.travelMode).toLowerCase() === "walking" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 5c3 0 5 2 5 5 0 3-2 5-5 5M7 8l2 2M7 12l5 5M19 19l-5-5" />
                  </svg>
                )}
                {String(activity.travelMode).toLowerCase() === "driving" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17h10M5 11h14m-7-5h-2l-2 5H5l-2 3v2h18v-2l-2-3h-3l-2-5h-2zm2 8a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                )}
                {String(activity.travelMode).toLowerCase() === "transit" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 5h-6a2 2 0 00-2 2v9a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2zm1 11h-8m8-5H8m4-5v10"></path>
                  </svg>
                )}
                {(!activity.travelMode || String(activity.travelMode).toLowerCase() === "null") && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {activity.travelTimeFromPrevious} from previous stop
              </div>
            )}

            {/* Time conflict warning - for identical times */}
            {activity.timeConflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2 bg-red-50 dark:bg-red-950 p-2 rounded">
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