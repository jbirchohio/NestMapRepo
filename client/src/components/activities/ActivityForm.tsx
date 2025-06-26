import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, ActivityFormValues } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TravelMode } from "@/lib/constants";
import ActivityTimePicker from "./ActivityTimePicker";
import ActivityLocationPicker from "@/components/activities/ActivityLocationPicker";
import { ClientActivity } from "@/lib/types";

// Props for the ActivityForm component
interface ActivityFormProps {
    activity?: ClientActivity;
    tripId: string;
    onSubmit: (values: ActivityFormValues) => void;
}
export default function ActivityForm({ activity, onSubmit }: ActivityFormProps) {
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
    
    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
    const handleLocationChange = (location: { name: string; lat: number; lng: number }) => {
        setValue('locationName', location.name, { shouldValidate: true });
        setValue('latitude', location.lat, { shouldValidate: true });
        setValue('longitude', location.lng, { shouldValidate: true });
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
