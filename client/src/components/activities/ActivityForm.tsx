import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema } from "./types";
import type { ActivityFormValues } from "./types";
import type { ClientActivity } from "@shared/types/activity";
import { activityStatuses, activityTypes } from "@shared/types/activity";
import { parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TravelMode } from "@/lib/constants";
import ActivityTimePicker from "./ActivityTimePicker";
import ActivityLocationPicker from "@/components/activities/ActivityLocationPicker";
import { ClientActivity } from "@/lib/types";

// Import the ClientActivity type from the shared types
import type { ClientActivity as SharedClientActivity } from "@shared/types/activity";

// Props for the ActivityForm component
interface ActivityFormProps {
    /** The activity to edit, or undefined for new activity */
    activity?: SharedClientActivity;
    
    /** ID of the trip this activity belongs to */
    tripId: string;
    
    /** Callback when the form is submitted */
    onSubmit: (values: ActivityFormValues) => void;
    
    /** Optional callback when the form is cancelled */
    onCancel?: () => void;
}
// Status options with icons
const statusOptions = [
  { value: 'pending', label: 'Pending', icon: '⏳' },
  { value: 'confirmed', label: 'Confirmed', icon: '✅' },
  { value: 'in_progress', label: 'In Progress', icon: '🔄' },
  { value: 'completed', label: 'Completed', icon: '✔️' },
  { value: 'cancelled', label: 'Cancelled', icon: '❌' },
] as const;

export default function ActivityForm({ 
  activity, 
  onSubmit, 
  onCancel 
}: ActivityFormProps) {
    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
            title: activity?.title || "",
            date: activity?.date || new Date(),
            time: activity?.time || "",
            locationName: activity?.locationName || "",
            travelMode: activity?.travelMode || "walking",
            notes: activity?.notes,
            tag: activity?.tag,
            assignedTo: activity?.assignedTo,
            latitude: activity?.latitude,
            longitude: activity?.longitude
        },
    });
    
    const { 
      register, 
      handleSubmit, 
      formState: { errors }, 
      setValue,
      control // Add control back for form components that need it
    } = form;
  
    const handleLocationChange = (location: { 
      name: string; 
      lat: number; 
      lng: number;
      address?: string;
    }) => {
      setValue('locationName', location.name, { shouldValidate: true });
      setValue('latitude', location.lat, { shouldValidate: true });
      setValue('longitude', location.lng, { shouldValidate: true });
      
      // Set the full address if available
      if (location.address) {
        setValue('location', location.address, { shouldValidate: true });
      }
    };
    
    // Handle form submission with proper type safety
    const onSubmitForm: SubmitHandler<ActivityFormValues> = async (formData) => {
      try {
        // Prepare the data for submission with proper type conversions
        const submissionData: ActivityFormValues = {
          // Required fields with defaults
          title: formData.title || '',
          date: formData.date 
            ? (formData.date instanceof Date 
                ? formData.date 
                : new Date(formData.date))
            : new Date(),
          time: formData.time || '',
          locationName: formData.locationName || '',
          status: formData.status || 'pending',
          completed: formData.completed || false,
          travelMode: formData.travelMode || 'walking',
          
          // Optional fields with type conversion
          ...(formData.description && { description: formData.description }),
          ...(formData.cost !== undefined && { 
            cost: typeof formData.cost === 'string' 
              ? parseFloat(formData.cost) 
              : formData.cost 
          }),
          ...(formData.order !== undefined && { 
            order: typeof formData.order === 'string' 
              ? parseInt(formData.order, 10) 
              : formData.order 
          }),
          ...(formData.location && { location: formData.location }),
          ...(formData.latitude !== undefined && { 
            latitude: typeof formData.latitude === 'string' 
              ? parseFloat(formData.latitude) 
              : formData.latitude 
          }),
          ...(formData.longitude !== undefined && { 
            longitude: typeof formData.longitude === 'string' 
              ? parseFloat(formData.longitude) 
              : formData.longitude 
          }),
          ...(formData.notes && { notes: formData.notes }),
          ...(formData.tag && { tag: formData.tag }),
          ...(formData.assignedTo && { assignedTo: formData.assignedTo }),
          
          // Timestamps
          createdAt: formData.createdAt 
            ? (formData.createdAt instanceof Date 
                ? formData.createdAt 
                : new Date(formData.createdAt))
            : new Date(),
          updatedAt: new Date()
        };

        // Call the onSubmit handler with the prepared data
        await onSubmit(submissionData);
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
