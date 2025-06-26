import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ActivityFormValues, ActivityModalProps } from './types';
import { ActivityStatus } from '@shared/types/activity';
import ActivityForm from './ActivityForm';
import { API_ENDPOINTS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import TripDatePicker from '@/components/TripDatePicker';
import { Label } from '@/components/ui/label';
export default function ActivityModal({ tripId, date, activity, onClose, onSave }: ActivityModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(date);
    const activityMutation = useMutation({
        mutationFn: async (data: ActivityFormValues) => {
            const endpoint = activity ? `${API_ENDPOINTS.ACTIVITIES}/${activity.id}` : API_ENDPOINTS.ACTIVITIES;
            const apiData = {
                ...data,
                date: data.date, // Already a Date object from the form
                tripId, // Ensure tripId is included
            };
            const url = `${endpoint}`;
            return apiRequest(activity ? "PUT" : "POST", url, apiData);
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: activity ? "Activity updated" : "Activity created",
            });
            onClose();
            onSave();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const handleSubmit = (data: ActivityFormValues) => {
        setLoading(true);
        activityMutation.mutate(data);
    };
    return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">{activity ? "Edit Activity" : "New Activity"}</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <TripDatePicker 
              startDate={selectedDate} 
              endDate={selectedDate} 
              selectedDate={selectedDate.toISOString().split('T')[0]} 
              onDateSelect={(sel: string) => {
                if (sel) {
                  setSelectedDate(new Date(sel));
                }
              }} 
            />
          </div>

          <ActivityForm 
            activity={activity ? {
              ...activity,
              id: activity.id || 'new',
              tripId: activity.tripId || tripId.toString(),
              organizationId: activity.organizationId || '',
              title: activity.title || '',
              date: selectedDate,
              time: activity.time || '12:00',
              locationName: activity.locationName || '',
              completed: activity.completed || false,
              status: (activity.status as ActivityStatus) || 'pending',
              order: activity.order || 0,
              createdBy: activity.createdBy || '',
              createdAt: activity.createdAt ? new Date(activity.createdAt) : new Date(),
              updatedAt: activity.updatedAt ? new Date(activity.updatedAt) : new Date(),
              // Optional fields with defaults
              travelMode: activity.travelMode || 'walking',
              latitude: activity.latitude,
              longitude: activity.longitude,
              notes: activity.notes,
              tag: activity.tag,
              assignedTo: activity.assignedTo
            } : { 
              // New activity defaults
              id: 'new',
              tripId: tripId.toString(),
              organizationId: '',
              title: '',
              date: selectedDate,
              time: '12:00',
              locationName: '',
              completed: false,
              status: 'pending',
              order: 0,
              createdBy: '',
              createdAt: new Date(),
              updatedAt: new Date(),
              // Optional fields with defaults
              travelMode: 'walking'
            }} 
            tripId={tripId.toString()} 
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>);
}
