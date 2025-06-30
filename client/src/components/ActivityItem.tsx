import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import TagBadge from "@/components/TagBadge";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ClientActivity } from "@shared/schema/types/activity/index";
import type { ApiResponse } from "@shared/schema/types/api/index";
interface ActivityItemProps {
    activity: ClientActivity;
    onClick: (activity: ClientActivity) => void;
    onDelete?: () => void;
    onToggleComplete?: (activityId: string | number, completed: boolean) => void;
}
export default function ActivityItem({ activity, onClick, onDelete, onToggleComplete }: ActivityItemProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    // Delete activity mutation
    const deleteActivity = useMutation<ApiResponse<void>, Error>({
        mutationFn: async (): Promise<ApiResponse<void>> => {
            const response = await apiRequest("DELETE", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`);
            return response as ApiResponse<void>;
        },
        onSuccess: () => {
            // Invalidate activities query to refresh the list
            queryClient.invalidateQueries({ 
                queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"] 
            }).catch(console.error);
            
            toast({
                title: "Activity Deleted",
                description: "The activity has been removed from your itinerary.",
            });
            
            // Call parent component's onDelete if provided
            onDelete?.();
        },
        onError: (error: Error) => {
            console.error("Error deleting activity:", error);
            toast({
                title: "Error",
                description: error.message || "Could not delete the activity. Please try again.",
                variant: "destructive",
            });
        },
    });
    // Toggle activity completion status
    const toggleCompleteMutation = useMutation<ApiResponse<ClientActivity>, Error, boolean>({
        mutationFn: async (completed: boolean): Promise<ApiResponse<ClientActivity>> => {
            const response = await apiRequest("PATCH", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, { 
                completed 
            });
            return response as ApiResponse<ClientActivity>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: [API_ENDPOINTS.TRIPS, activity.tripId, "activities"] 
            }).catch(console.error);
            
            toast({
                title: `Activity ${activity.completed ? 'Marked Incomplete' : 'Completed'}`,
                description: activity.completed 
                    ? "Activity has been marked as incomplete." 
                    : "Great job! Activity marked as complete.",
            });
            
            onToggleComplete?.(activity.id, !activity.completed);
        },
        onError: (error: Error) => {
            console.error("Error toggling activity completion:", error);
            toast({
                title: "Error",
                description: error.message || "Could not update activity status. Please try again.",
                variant: "destructive",
            });
        },
    });

    // Handle toggle complete
    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleCompleteMutation.mutate(!activity.completed);
    };

    // Handle delete click
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteActivity.mutate();
    };

    // Format time from 24h to 12h format
    const formatTime = (time: string | undefined): string => {
        if (!time) return "--:--";
        
        try {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours, 10);
            
            if (isNaN(hour)) return time; // Return original if not a number
            
            const period = hour >= 12 ? 'PM' : 'AM';
            const formattedHour = hour % 12 || 12;
            return `${formattedHour}:${minutes} ${period}`;
        } catch (error) {
            console.error("Error formatting time:", error);
            return time || "--:--";
        }
    };
    // Handle completion toggle
    // Handle delete action
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the activity click
        // Show a confirmation toast
        const { dismiss } = toast({
            title: "Delete Activity?",
            description: "Are you sure you want to delete this activity?",
            action: (<div className="flex gap-2">
          <Button onClick={() => {
                    deleteActivity.mutate();
                    dismiss();
                }} variant="destructive" size="sm" className="h-8 px-3 text-xs">
            Delete
          </Button>
          <Button onClick={() => dismiss()} variant="outline" size="sm" className="h-8 px-3 text-xs">
            Cancel
          </Button>
        </div>),
        });
    };
    return (
        <div className="pl-8 relative timeline-item group">
            {/* Timeline point */}
            <div className="flex items-center absolute left-0 timeline-point">
                <div className="h-6 w-6 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {/* You may want to put a timeline icon or number here */}
                </div>
            </div>
            {/* Main content */}
            <div
                className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-4 cursor-pointer group-hover:bg-gray-50 dark:group-hover:bg-gray-800 transition"
                onClick={() => onClick(activity)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${activity.completed ? "bg-green-500" : "bg-gray-300"}`}></span>
                        <span className={`font-semibold ${activity.completed ? "line-through text-gray-400" : ""}`}>
                            {activity.title}
                        </span>
                        {activity.tag && (
                            <TagBadge key={activity.tag} tag={activity.tag} />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={activity.completed ? "outline" : "success"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleToggleComplete}
                            aria-label={activity.completed ? "Mark as incomplete" : "Mark as complete"}
                        >
                            {activity.completed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleDelete}
                            aria-label="Delete activity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                        {formatTime(activity.time)}
                    </span>
                    {activity.location && (
                        <span>
                            {activity.location}
                        </span>
                    )}
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
                                <path d="M13 5c3 0 5 2 5 5 0 3-2 5-5 5M7 8l2 2M7 12l5 5M19 19l-5-5"/>
                            </svg>
                        )}
                        {String(activity.travelMode).toLowerCase() === "driving" && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 17h10M5 11h14m-7-5h-2l-2 5H5l-2 3v2h18v-2l-2-3h-3l-2-5h-2zm2 8a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0z"/>
                            </svg>
                        )}
                        {String(activity.travelMode).toLowerCase() === "transit" && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 5h-6a2 2 0 00-2 2v9a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2zm1 11h-8m8-5H8m4-5v10"></path>
                            </svg>
                        )}
                        {(!activity.travelMode || String(activity.travelMode).toLowerCase() === "null") && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        )}
                        {activity.travelTimeFromPrevious} from previous stop
                    </div>
                )}
                {/* Time conflict warning - for identical times */}
                {activity.timeConflict && (
                    <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2 bg-red-50 dark:bg-red-950 p-2 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        TIME CONFLICT: Another activity is scheduled at the same time!
                    </div>
                )}
                {/* Travel time conflict warning */}
                {activity.conflict && (
                    <div className="flex items-center text-xs text-[hsl(var(--destructive))] mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        Travel time may be too long
                    </div>
                )}
            </div>
        </div>
    );
}
