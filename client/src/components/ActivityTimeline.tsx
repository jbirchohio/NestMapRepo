import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientActivity } from "@/lib/types";
import ActivityItem from "./ActivityItem";
import ActivityModal from "./ActivityModal";

interface ActivityTimelineProps {
  activities: ClientActivity[];
  date: Date;
  tripId: number;
  onActivityUpdated: () => void;
}

export default function ActivityTimeline({ 
  activities, 
  date, 
  tripId, 
  onActivityUpdated 
}: ActivityTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ClientActivity | null>(null);
  
  const handleAddActivity = () => {
    setSelectedActivity(null);
    setIsModalOpen(true);
  };
  
  const handleEditActivity = (activity: ClientActivity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };
  
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };
  
  const handleActivitySaved = () => {
    setIsModalOpen(false);
    onActivityUpdated();
  };
  
  // Handle toggling activity completion status
  const handleToggleComplete = (activityId: number, completed: boolean) => {
    console.log(`Toggling activity ${activityId} completion to ${completed}`);
    // The API request is handled in the ActivityItem component
    // We just need to refresh the list when completed
    onActivityUpdated();
  };
  
  // Sort activities by time
  const sortedActivities = [...activities].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  return (
    <div className="space-y-6 relative timeline-container">
      {sortedActivities.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[hsl(var(--muted-foreground))] mb-4">No activities planned for this day.</p>
          <Button 
            onClick={handleAddActivity}
            className="btn-primary"
          >
            Add Your First Activity
          </Button>
        </div>
      ) : (
        sortedActivities.map((activity) => (
          <ActivityItem 
            key={activity.id} 
            activity={activity} 
            onClick={handleEditActivity} 
            onToggleComplete={handleToggleComplete}
          />
        ))
      )}
      {/* Always show the Add Activity button - but make it bigger when no activities */}
      <Button 
        variant="default"
        size={sortedActivities.length === 0 ? "lg" : "sm"}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-11 rounded-md px-8 w-full mt-4 text-[#0f172a]"
        onClick={handleAddActivity}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Activity
      </Button>
      {isModalOpen && (
        <ActivityModal
          tripId={tripId}
          date={date}
          activity={selectedActivity}
          onClose={handleModalClose}
          onSave={handleActivitySaved}
        />
      )}
    </div>
  );
}
