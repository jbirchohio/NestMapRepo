import { z } from 'zod';

export interface ClientActivity {
  id: string;
  title: string;
  date: string; // ISO string format
  time: string;
  locationName: string;
  locationId?: string;
  latitude?: string;
  longitude?: string;
  travelMode: string;
  notes?: string;
  tag?: string;
  assignedTo?: string;
  travelTimeFromPrevious?: string;
  travelDistanceFromPrevious?: string;
  conflict?: boolean;
  timeConflict?: boolean;
}

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.date(),
  time: z.string().min(1, 'Time is required'),
  locationName: z.string().min(1, 'Location is required'),
  travelMode: z.string().min(1, 'Travel mode is required'),
  notes: z.string().optional(),
  tag: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;

export interface ActivityModalProps {
  tripId: string;
  date: Date;
  activity?: ClientActivity;
  onClose: () => void;
  onSave: () => void;
}
