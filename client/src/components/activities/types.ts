import { z } from 'zod';
import { ClientActivity } from '@/types/activity';

export const activitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  locationName: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
  tag: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  assignedTo: z.string().optional(),
  travelMode: z.string().default("walking"),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;

export interface ActivityModalProps {
  tripId: string;
  date: Date;
  activity?: ClientActivity;
  onClose: () => void;
  onSave: () => void;
}
