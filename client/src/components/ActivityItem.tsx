import { ClientActivity } from "@/lib/types";
import TagBadge from "@/components/TagBadge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface ActivityItemProps {
  activity: ClientActivity;
  onClick: (activity: ClientActivity) => void;
  onDelete?: () => void;
  onToggleComplete?: (activityId: number, completed: boolean) => void;
}

export default function ActivityItem({ activity, onClick, onDelete, onToggleComplete }: ActivityItemProps) {
  const { toast } = useToast();
  
  // Delete activity mutation
  const deleteActivity = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`);
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
    onError: (error) => {
      console.error("Error deleting activity:", error);
      toast({
        title: "Error",
        description: "Could not delete the activity. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Toggle activity completion
  const toggleCompleteMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      return apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}/toggle-complete`, {
        completed: completed
      });
    },
    onSuccess: (_, completed) => {
      // Invalidate activities query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"] });
      
      toast({
        title: completed ? "Activity Completed" : "Activity Marked Incomplete",
        description: completed 
          ? "The activity has been marked as completed and will be hidden from the map." 
          : "The activity has been marked as incomplete and will appear on the map.",
      });
      
      // Call parent component's onToggleComplete if provided
      if (onToggleComplete) onToggleComplete(activity.id, completed);
    },
    onError: (error) => {
      console.error("Error updating activity completion status:", error);
      toast({
        title: "Error",
        description: "Could not update the activity status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Convert 24-hour time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return "--:--";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Handle completion toggle
  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the activity click
    toggleCompleteMutation.mutate(!activity.completed);
  };

  // Handle delete action
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the activity click
    
    // Show a confirmation toast
    toast({
      title: "Delete Activity?",
      description: "Are you sure you want to delete this activity?",
      action: (
        <div className="flex gap-2">
          <button 
            onClick={() => deleteActivity.mutate()}
            className="bg-[hsl(var(--destructive))] text-white px-3 py-1 rounded text-xs"
          >
            Delete
          </button>
          <button className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] px-3 py-1 rounded text-xs">
            Cancel
          </button>
        </div>
      ),
    });
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
          ${activity.completed ? 'opacity-60' : ''}
          relative overflow-hidden
        `}
      >
        {/* Time header */}
        <div className="bg-[hsl(var(--primary))] text-white p-2 text-center font-medium">
          {formatTime(activity.time)}
        </div>
        
        <div className="p-3 pt-6 relative">
          {/* Completion toggle button - always visible */}
          <div 
            className="absolute right-2 top-2 z-10 w-5 h-5 flex items-center justify-center bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] text-white rounded-full cursor-pointer"
            onClick={handleToggleComplete}
            title={activity.completed ? "Mark as incomplete" : "Mark as completed"}
          >
            {activity.completed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </div>
        
          {/* Delete button - only visible on hover */}
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="bg-[hsl(var(--destructive))] text-white p-1 rounded-full hover:bg-[hsl(var(--destructive))/90] cursor-pointer"
              onClick={handleDelete}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
          
          {/* Activity content area */}
          <div onClick={() => onClick(activity)}>
            {/* Title and tag row */}
            <div className="flex justify-between items-start">
              <h3 className="font-medium">{activity.title}</h3>
              {activity.tag && <TagBadge tag={activity.tag} />}
            </div>
            
            {/* Notes (if any) */}
            {activity.notes && (
              <div className="text-sm mt-2">{activity.notes}</div>
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

            {/* Conflict warning */}
            {activity.conflict && (
              <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Possible scheduling conflict
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}