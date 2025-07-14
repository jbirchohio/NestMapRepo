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

interface ActivityFormProps {
  activity?: ActivityFormValues;
  tripId: string;
  onSubmit: (values: ActivityFormValues) => void;
}

export default function ActivityForm({ activity, onSubmit }: ActivityFormProps) {
  const { register, handleSubmit, setValue: rawSetValue, watch } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema) as any,
    defaultValues: activity || {
      title: "",
      date: new Date(),
      time: "",
      locationName: "",
      travelMode: "walking",
    },
  });

  const setValue = (field: string, value: string) => {
    rawSetValue(field as keyof ActivityFormValues, value);
  };

  // Use setValue with correct type
  const setLocation = (field: string, value: string) => {
    setValue(field, value);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <Label htmlFor="title">Activity Title</Label>
        <Input
          id="title"
          placeholder="Enter activity title"
          {...register("title")}
        />
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <ActivityLocationPicker setValue={setLocation} />
      </div>

      <div>
        <Label htmlFor="time">Time</Label>
        <ActivityTimePicker setValue={setValue} />
      </div>

      <div>
        <Label htmlFor="travelMode">Travel Mode</Label>
        <Select value={watch("travelMode")} onValueChange={(value) => setValue("travelMode", value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select travel mode" />
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
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any notes about this activity"
          {...register("notes")}
        />
      </div>

      <Button type="submit" className="w-full">Save Activity</Button>
    </form>
  );
}
