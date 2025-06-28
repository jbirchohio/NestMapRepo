import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { ActivityFormValues, ActivityModalProps } from '@shared/types/activity';
import { ActivityStatus } from '@shared/types/activity';
import ActivityForm from './ActivityForm';
import { API_ENDPOINTS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import TripDatePicker from '@/components/TripDatePicker';
import { Label } from '@/components/ui/label';


/**
 * ActivityModal component for creating or editing an activity.
 * 
 * Props:
 * - tripId: ID of the trip associated with the activity.
 * - date: Optional date for the activity, defaults to current date.
 * - activity: Existing activity data for editing, if available.
 * - onClose: Callback function to handle modal close.
 * - onSave: Callback function to handle successful activity save.
 * 
 * Features:
 * - Initializes date state with a valid date string in YYYY-MM-DD format.
 * - Handles form submission with mutation to create or update activity.
 * - Displays success or error toast messages based on mutation result.
 * - Uses TripDatePicker for selecting activity date.
 * - Uses ActivityForm for inputting activity details.
 */
export default function ActivityModal({ tripId, date, activity, onClose, onSave }: ActivityModalProps & { date?: Date }) {
    const { toast } = useToast();
    // Initialize with a valid date string in YYYY-MM-DD format
    const [selectedDate, setSelectedDate] = useState<string>(
      (date ? new Date(date) : new Date()).toISOString().split('T')[0] as string
    );
    
    // Parse the date string back to a Date object when needed
    const selectedDateObj = new Date(selectedDate);
    const createActivity = useMutation({
        mutationFn: async (data: ActivityFormValues) => {
            const endpoint = API_ENDPOINTS.ACTIVITIES;
            const apiData = {
                ...data,
                tripId, // Ensure tripId is included
            };
            return apiRequest({
                method: "POST",
                url: endpoint,
                data: apiData
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Activity created",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const updateActivity = useMutation({
        mutationFn: async (data: ActivityFormValues) => {
            const endpoint = `${API_ENDPOINTS.ACTIVITIES}/${data.id}`;
            const apiData = {
                ...data,
                tripId, // Ensure tripId is included
            };
            return apiRequest({
                method: "PUT",
                url: endpoint,
                data: apiData
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Activity updated",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const handleSubmit = async (formData: ActivityFormValues) => {
        try {
            // Convert form data to match the API expected format
            const activityData: Partial<ClientActivity> = {
                ...formData,
                tripId: tripId,
                date: selectedDate,
                // Ensure proper types for all fields
                cost: formData.cost !== undefined ? Number(formData.cost) : 0,
                order: formData.order || 0,
                completed: formData.completed || false,
                // Handle coordinates
                latitude: formData.latitude,
                longitude: formData.longitude,
                // Ensure timestamps are properly set
                createdAt: formData.createdAt || new Date(),
                updatedAt: new Date(),
                // Set default values for required fields
                organizationId: activity?.organizationId || '',
                createdBy: activity?.createdBy || '',
                status: (activity?.status as ActivityStatus) || 'pending'
            };

            if (activity?.id) {
                // Update existing activity
                await updateActivity.mutateAsync({
                    ...activityData,
                    id: activity.id,
                });
            } else {
                // Create new activity
                await createActivity.mutateAsync(activityData);
            }
            
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving activity:', error);
            toast({
                title: 'Error',
                description: 'Failed to save activity. Please try again.',
                variant: 'destructive',
            });
        }
    };
    return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">{activity ? "Edit Activity" : "New Activity"}</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <TripDatePicker 
              startDate={selectedDateObj} 
              endDate={selectedDateObj} 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate} 
            />
          </div>

            <ActivityForm 
              tripId={tripId}
              onSubmit={handleSubmit}
              activity={{
                // Required fields with defaults
                id: activity?.id || 'new',
                tripId: tripId,
                organizationId: activity?.organizationId || '',
                title: activity?.title || '',
                description: activity?.description || '',
                status: (activity?.status as ActivityStatus) || 'pending',
                startTime: activity?.startTime || '',
                endTime: activity?.endTime || '',
                location: activity?.location || '',
                locationName: activity?.locationName || '',
                cost: activity?.cost,
                date: selectedDate,
                time: activity?.time || '12:00',
                completed: activity?.completed || false,
                order: activity?.order || 0,
                createdBy: activity?.createdBy || '',
                createdAt: activity?.createdAt ? new Date(activity.createdAt) : new Date(),
                updatedAt: activity?.updatedAt ? new Date(activity.updatedAt) : new Date(),
                // Optional fields with defaults
                travelMode: activity?.travelMode || 'walking',
                // Optional fields that can be undefined
                latitude: activity?.latitude,
                longitude: activity?.longitude,
                notes: activity?.notes,
                tag: activity?.tag,
                assignedTo: activity?.assignedTo
              }}
            />
        </div>
      </div>
    </div>);
}
