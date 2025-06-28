import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, type ActivityFormValues } from "./types";
import type { ClientActivity } from "@shared/types/activity";
import { parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TravelMode } from "@/lib/constants";
import ActivityTimePicker from "./ActivityTimePicker";
import ActivityLocationPicker from "@/components/activities/ActivityLocationPicker";

// Props for the ActivityForm component
interface ActivityFormProps {
  /** The activity to edit, or undefined for new activity */
  activity?: Partial<ClientActivity>;
  
  /** ID of the trip this activity belongs to */
  tripId: string;
  
  /** Callback when the form is submitted */
  onSubmit: (values: ActivityFormValues) => void;
  
  /** Optional callback when the form is cancelled */ onCancel?: () => void;
}
// Status options with icons

export default function ActivityForm({ 
  activity, 
  onSubmit}: ActivityFormProps) {
    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
          title: activity?.title || '',
          date: activity?.date 
            ? (typeof activity.date === 'string' 
                ? parseISO(activity.date) 
                : new Date(activity.date))
            : new Date(),
          time: activity?.time || '',
          locationName: activity?.locationName || '',
          description: activity?.description || '',
          status: (activity?.status as ActivityFormValues['status']) || 'pending',
          cost: activity?.cost ? Number(activity.cost) : undefined,
          order: activity?.order ? Number(activity.order) : 0,
          location: activity?.location || '',
          latitude: activity?.latitude ? Number(activity.latitude) : undefined,
          longitude: activity?.longitude ? Number(activity.longitude) : undefined,
          notes: activity?.notes || '',
          tag: activity?.tag || '',
          assignedTo: activity?.assignedTo || '',
          travelMode: activity?.travelMode || 'walking',
          completed: activity?.completed || false,
          organizationId: activity?.organizationId || '',
          createdBy: activity?.createdBy || '',
          createdAt: activity?.createdAt 
            ? (typeof activity.createdAt === 'string' 
                ? parseISO(activity.createdAt) 
                : new Date(activity.createdAt))
            : new Date(),
          updatedAt: activity?.updatedAt 
            ? (typeof activity.updatedAt === 'string' 
                ? parseISO(activity.updatedAt) 
                : new Date(activity.updatedAt))
            : new Date(),
        },
    });
    
    const { 
      register, 
      handleSubmit, 
      formState: { errors }, 
      setValue,
      watch,
    } = form;
  
    const handleLocationChange = (location: { 
      name: string; 
      lat: number; 
      lng: number;
      address?: string;
    }) => {
      // Update form values with new location data
      const updates = {
        locationName: location.name,
        latitude: location.lat,
        longitude: location.lng,
        ...(location.address && { location: location.address })
      };
      
      // Batch updates to avoid multiple re-renders
      Object.entries(updates).forEach(([key, value]) => {
        setValue(key as keyof ActivityFormValues, value, { shouldValidate: true });
      });
    };
    
    // Handle form submission with proper type safety
    const onSubmitForm: SubmitHandler<ActivityFormValues> = async (formData) => {
      try {
        // The form data is already validated and transformed by zod
        await onSubmit(formData);
      } catch (error) {
        console.error('Error submitting form:', error);
        // Handle error appropriately (e.g., show error toast)
      }
    };
    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
            <div>
                <Label htmlFor="title">Activity Title</Label>
                <Input 
                    id="title" 
                    placeholder="Enter activity title" 
                    {...register("title")} 
                    className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="location">Location</Label>
                <ActivityLocationPicker 
                    onLocationSelect={handleLocationChange}
                    initialValue={watch('locationName')}
                />
                {errors.locationName && (
                    <p className="text-red-500 text-sm mt-1">{errors.locationName.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="time">Time</Label>
                <ActivityTimePicker 
                    setValue={(field, value) => setValue(field as 'time', value, { shouldValidate: true })}
                />
            </div>

            <div>
                <Label htmlFor="travelMode">Travel Mode</Label>
                <Select 
                    onValueChange={(value) => setValue("travelMode", value, { shouldValidate: true })}
                    defaultValue={watch("travelMode")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select travel mode"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {Object.entries(TravelMode).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                    {value}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {errors.travelMode && (
                    <p className="text-sm text-red-500 mt-1">{errors.travelMode.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    placeholder="Add notes about this activity"
                    {...register("notes")}
                    className={errors.notes ? 'border-red-500' : ''}
                />
                {errors.notes && (
                    <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="tag">Tag (Optional)</Label>
                <Input 
                    id="tag" 
                    placeholder="e.g., sightseeing, food, shopping" 
                    {...register("tag")} 
                    className={errors.tag ? 'border-red-500' : ''}
                />
                {errors.tag && (
                    <p className="text-red-500 text-sm mt-1">{errors.tag.message}</p>
                )}
            </div>

            <Button type="submit" className="w-full">
                {activity ? "Update Activity" : "Add Activity"}
            </Button>
        </form>
    );
}
