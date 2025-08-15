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
  regenerationsRemaining?: number;
  onRegenerationsUpdate?: (remaining: number) => void;
}

export default function ActivityTimeline({
  activities,
  date,
  tripId,
  onActivityUpdated,
  regenerationsRemaining,
  onRegenerationsUpdate
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
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 py-2 btn-primary text-[#0f172a]"
          >
            Add Your First Activity
          </Button>
        </div>
      ) : (
        sortedActivities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            activityNumber={index + 1}
            onClick={handleEditActivity}
            onDelete={onActivityUpdated}
            regenerationsRemaining={regenerationsRemaining}
            onRegenerationsUpdate={onRegenerationsUpdate}
          />
        ))
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
