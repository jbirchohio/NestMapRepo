import { ClientActivity } from "@/lib/types";
import TagBadge from "@/components/TagBadge";

interface ActivityItemProps {
  activity: ClientActivity;
  onClick: (activity: ClientActivity) => void;
}

export default function ActivityItem({ activity, onClick }: ActivityItemProps) {
  // Convert 24-hour time to 12-hour format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Get hour for the timeline circle
  const getTimeHour = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    return hour % 12 || 12;
  };

  return (
    <div className="pl-8 relative timeline-item">
      <div className="flex items-center absolute left-0 timeline-point">
        <div className="h-6 w-6 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center text-xs font-medium">
          {getTimeHour(activity.time)}
        </div>
      </div>
      <div 
        className={`
          bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-sm hover:shadow p-3 cursor-pointer
          ${activity.conflict ? 'border-[hsl(var(--destructive))]' : ''}
        `}
        onClick={() => onClick(activity)}
      >
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{activity.title}</h3>
          {activity.tag && <TagBadge tag={activity.tag} />}
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{formatTime(activity.time)}</p>
        
        {activity.notes && (
          <div className="text-sm mt-2">{activity.notes}</div>
        )}
        
        {activity.travelTimeFromPrevious && (
          <div className="flex items-center text-xs text-[hsl(var(--muted-foreground))] mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {activity.travelTimeFromPrevious} from previous stop
          </div>
        )}

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
  );
}
