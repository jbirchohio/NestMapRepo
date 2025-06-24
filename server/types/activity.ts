import { z } from 'zod';
// Re-export shared activity types
export {
  activityStatuses,
  activityTypes,
  type ActivityStatus,
  type ActivityType,
  type Activity,
} from '@shared/types/activity';
export const activitySchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    locationName: z.string().optional(),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    type: z.enum(activityTypes).optional(),
    status: z.enum(activityStatuses).default('pending'),
    notes: z.string().optional(),
    tripId: z.string().uuid('Invalid Trip ID'),
    organizationId: z.string().uuid('Invalid Organization ID'),
    createdBy: z.string().uuid('Invalid User ID'),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});
export const createActivitySchema = activitySchema.pick({
    title: true,
    description: true,
    startDate: true,
    endDate: true,
    locationName: true,
    location: true,
    latitude: true,
    longitude: true,
    type: true,
    status: true,
    notes: true,
    tripId: true
});
export const updateActivitySchema = createActivitySchema.partial();
