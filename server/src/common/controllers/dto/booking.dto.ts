import { z } from 'zod';

export const createBookingSchema = z.object({
  tripId: z.string().uuid(),
  activityId: z.string().uuid().optional(),
  type: z.enum(['hotel', 'flight', 'car', 'train', 'activity', 'other']),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  provider: z.string().optional(),
  providerBookingId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),  
  metadata: z.record(z.unknown()).optional(),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = createBookingSchema.partial();

export type UpdateBookingDto = z.infer<typeof updateBookingSchema>;
