import React from 'react';
import { Button } from '@/components/ui/button';
import { Coffee, Cookie, Moon, Gamepad2, MapPin, Baby } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';

interface FamilyQuickActionsProps {
  tripId: string | number;
  date: Date;
  onActivityAdded?: () => void;
  travelingWithKids?: boolean;
}

const familyActivities = [
  {
    icon: Moon,
    title: 'Nap Time',
    defaultTime: '13:00',
    duration: '1-2 hours',
    notes: 'Rest time for the little ones',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
    tag: 'rest'
  },
  {
    icon: Cookie,
    title: 'Snack Break',
    defaultTime: '10:30',
    duration: '30 mins',
    notes: 'Snack and hydration break',
    color: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
    tag: 'food'
  },
  {
    icon: MapPin,
    title: 'Bathroom Break',
    defaultTime: '11:00',
    duration: '15 mins',
    notes: 'Quick bathroom stop',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
    tag: 'break'
  },
  {
    icon: Gamepad2,
    title: 'Playground Time',
    defaultTime: '16:00',
    duration: '45 mins',
    notes: 'Let the kids burn off energy',
    color: 'bg-green-100 hover:bg-green-200 text-green-700',
    tag: 'activity'
  },
  {
    icon: Coffee,
    title: 'Parent Coffee Break',
    defaultTime: '15:00',
    duration: '30 mins',
    notes: 'Coffee break while kids play',
    color: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
    tag: 'food'
  },
  {
    icon: Baby,
    title: 'Diaper Change',
    defaultTime: '09:00',
    duration: '15 mins',
    notes: 'Diaper change and cleanup',
    color: 'bg-pink-100 hover:bg-pink-200 text-pink-700',
    tag: 'break'
  }
];

export default function FamilyQuickActions({
  tripId,
  date,
  onActivityAdded,
  travelingWithKids = false
}: FamilyQuickActionsProps) {
  
  const addQuickActivity = async (activity: typeof familyActivities[0]) => {
    try {
      // Format the date
      const activityDate = new Date(date);
      const dateStr = activityDate.toISOString().split('T')[0];
      
      // Create the activity
      const response = await apiRequest('POST', API_ENDPOINTS.ACTIVITIES, {
        tripId: parseInt(tripId.toString()),
        title: activity.title,
        date: dateStr,
        time: activity.defaultTime,
        locationName: 'To be determined',
        notes: activity.notes,
        tag: activity.tag,
        kidFriendly: true,
        category: 'family'
      });

      if (response) {
        toast({
          title: `${activity.title} Added`,
          description: `Scheduled for ${activity.defaultTime}`,
        });
        
        if (onActivityAdded) {
          onActivityAdded();
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to add ${activity.title}`,
        variant: 'destructive'
      });
    }
  };

  // Only show if traveling with kids
  if (!travelingWithKids) {
    return null;
  }

  return (
    <div className="p-4 bg-purple-50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Baby className="w-5 h-5 text-purple-600" />
        <h3 className="font-medium text-purple-900">Family Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {familyActivities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => addQuickActivity(activity)}
              className={`${activity.color} flex flex-col items-center justify-center p-3 h-auto`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{activity.title}</span>
              <span className="text-xs opacity-75">{activity.defaultTime}</span>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-purple-600">
        💡 Tip: Click any button to quickly add common family activities to your itinerary
      </div>
    </div>
  );
}