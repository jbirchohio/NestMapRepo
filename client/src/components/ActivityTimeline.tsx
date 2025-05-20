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
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]"
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
          />
        ))
      )}
      
            {/* Always show the Add Activity button - but make it bigger when no activities */}
      {/* We hide this button because we now have the top button in the sidebar */}
      {sortedActivities.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500 mb-3">No activities planned for this day yet.</p>
          <Button 
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 px-8 py-2"
            onClick={handleAddActivity}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add First Activity
          </Button>
        </div>
      )}
      
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
