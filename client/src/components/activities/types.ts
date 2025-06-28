import { z } from 'zod';
import { ClientActivity } from '@shared/types/activity';

/**
 * Schema for validating activity form data
 * @remarks
 * This schema is used to validate the shape of the data that is passed to the
 * `ActivityForm` component.
 *
 * @property {string} title - The title of the activity
 * @property {Date} date - The date of the activity
 * @property {string} time - The time of the activity
 * @property {string} locationName - The name of the location of the activity
 * @property {string} [notes] - Optional notes about the activity
 * @property {string} [tag] - Optional tag or category for the activity
 * @property {number} [latitude] - Optional latitude of the location
 * @property {number} [longitude] - Optional longitude of the location
 * @property {string} [assignedTo] - Optional user ID of the person the activity is assigned to
 * @property {string} [travelMode] - Optional travel mode of the activity, defaults to "walking"
 */
export const activitySchema = z.object({
    // Required fields
    title: z.string().min(1, "Title is required"),
    date: z.date(),
    time: z.string().min(1, "Time is required"),
    locationName: z.string().min(1, "Location is required"),
    
    // Optional metadata
    description: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'in_progress', 'completed']).default('pending'),
    cost: z.number().min(0).optional(),
    order: z.number().int().min(0).optional(),
    
    // Location
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    
    // Organization
    organizationId: z.string().optional(),
    createdBy: z.string().optional(),
    assignedTo: z.string().optional(),
    
    // UI/UX
    notes: z.string().optional(),
    tag: z.string().optional(),
    travelMode: z.string().default("walking"),
    
    // Timestamps (managed by server)
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    
    // Status flags
    completed: z.boolean().default(false)
});
export type ActivityFormValues = z.infer<typeof activitySchema>;
export interface ActivityModalProps {
    tripId: string;
    date?: Date;
    activity?: ClientActivity;
    onClose: () => void;
    onSave: () => void;
}
