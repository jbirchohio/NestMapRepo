import { z } from 'zod';
import { router, protectedProcedure, organizationProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '../../db/db';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { and, desc, eq, gte, lte } from 'drizzle-orm/expressions';
import { bookings, bookingTypeEnum, bookingStatusEnum, type Booking, type InsertBooking } from '../../db/bookingSchema';
import { trips } from '../../db/schema';


// Validation schemas
const bookingBaseSchema = {
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(bookingTypeEnum.enumValues),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().optional(),
  provider: z.string().optional(),
  providerReferenceId: z.string().optional(),
  price: z.number().int().min(0).optional(),
  currency: z.string().default('usd'),
  metadata: z.record(z.any()).optional(),
  tripId: z.string().uuid().optional(),
};

const createBookingSchema = z.object({
  ...bookingBaseSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(bookingTypeEnum.enumValues),
  price: z.number().int().min(0).optional(),
});

const updateBookingSchema = z.object({
  id: z.string().uuid(),
  ...bookingBaseSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(bookingTypeEnum.enumValues).optional(),
  status: z.enum(bookingStatusEnum.enumValues).optional(),
  cancellationReason: z.string().optional(),
});

const listBookingsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().uuid().optional(),
  status: z.enum(bookingStatusEnum.enumValues).optional(),
  type: z.enum(bookingTypeEnum.enumValues).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tripId: z.string().uuid().optional(),
});

export const bookingsRouter = router({
  // Create a new booking
  create: protectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { startDate, endDate, ...bookingData } = input;
        
        const newBooking: InsertBooking = {
          id: uuidv4(),
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'confirmed',
          ...bookingData,
          metadata: {
            ...(bookingData.metadata || {}),
            createdBy: ctx.userId,
            confirmedAt: new Date().toISOString(),
          },
        };

        // If tripId is provided, verify the trip exists and belongs to the user's organization
        if (input.tripId) {
          const trip = await db.query.trips.findFirst({
            where: and(
              eq(trips.id, input.tripId),
              eq(trips.organizationId, ctx.organizationId)
            ),
          });

          if (!trip) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Trip not found or access denied',
            });
          }
        }

        const [createdBooking] = await db.insert(bookings)
          .values(newBooking)
          .returning();

        logger.info(`Booking ${createdBooking.id} created for user ${ctx.userId}`);
        
        return createdBooking;
      } catch (error) {
        logger.error('Booking creation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create booking',
        });
      }
    }),

  // Update an existing booking
  update: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, startDate, endDate, ...updateData } = input;
        
        // Verify booking exists and belongs to the user's organization
        const existingBooking = await db.query.bookings.findFirst({
          where: and(
            eq(bookings.id, id),
            eq(bookings.organizationId, ctx.organizationId)
          ),
        });

        if (!existingBooking) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied',
          });
        }

        const updateFields: Partial<Booking> = {
          ...updateData,
          updatedAt: new Date(),
        };

        if (startDate) updateFields.startDate = new Date(startDate);
        if (endDate) updateFields.endDate = new Date(endDate);

        // If status is being updated to cancelled, set cancelledAt
        if (input.status === 'cancelled' && existingBooking.status !== 'cancelled') {
          updateFields.metadata = {
            ...(existingBooking.metadata || {}),
            cancelledAt: new Date().toISOString(),
            cancelledBy: ctx.userId,
          };
        }

        const [updatedBooking] = await db.update(bookings)
          .set(updateFields)
          .where(and(
            eq(bookings.id, id),
            eq(bookings.organizationId, ctx.organizationId)
          ))
          .returning();

        logger.info(`Booking ${id} updated by user ${ctx.userId}`);
        
        return updatedBooking;
      } catch (error) {
        logger.error('Booking update error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update booking',
        });
      }
    }),

  // Get booking by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const { id } = input;
        
        const booking = await db.query.bookings.findFirst({
          where: and(
            eq(bookings.id, id),
            eq(bookings.organizationId, ctx.organizationId)
          ),
          with: {
            // Include related trip data if needed
            trip: true
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied',
          });
        }

        // Only allow users to access their own bookings unless they have admin/manager role
        if (booking.userId !== ctx.userId && !ctx.roles?.includes('admin') && !ctx.roles?.includes('manager')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this booking',
          });
        }

        return booking;
      } catch (error) {
        logger.error('Get booking error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch booking',
        });
      }
    }),

  // List bookings with filtering and pagination
  list: protectedProcedure
    .input(listBookingsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { limit, cursor, status, type, startDate, endDate, tripId } = input;
        
        // Build the where conditions
        const conditions = [
          eq(bookings.organizationId, ctx.organizationId),
        ];

        // Only show user's bookings unless they have admin/manager role
        if (!ctx.roles?.includes('admin') && !ctx.roles?.includes('manager')) {
          conditions.push(eq(bookings.userId, ctx.userId));
        }

        if (status) {
          conditions.push(eq(bookings.status, status));
        }

        if (type) {
          conditions.push(eq(bookings.type, type));
        }

        if (tripId) {
          conditions.push(eq(bookings.tripId, tripId));
        }

        if (startDate) {
          conditions.push(gte(bookings.startDate, new Date(startDate)));
        }

        if (endDate) {
          conditions.push(lte(bookings.endDate, new Date(endDate)));
        }

        // Base query
        let query = db.select()
          .from(bookings)
          .where(and(...conditions))
          .orderBy(desc(bookings.startDate), desc(bookings.createdAt))
          .limit(limit + 1);

        // Apply cursor-based pagination
        if (cursor) {
          query = query.offset(1);
        }

        const results = await query;
        
        // Calculate next cursor for pagination
        let nextCursor: typeof cursor = undefined;
        if (results.length > limit) {
          const nextItem = results.pop();
          nextCursor = nextItem?.id;
        }

        return {
          items: results,
          nextCursor,
        };
      } catch (error) {
        logger.error('List bookings error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch bookings',
        });
      }
    }),

  // Cancel a booking
  cancel: protectedProcedure
    .input(z.object({ 
      id: z.string().uuid(),
      reason: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, reason } = input;
        
        // Verify booking exists and belongs to organization
        const booking = await db.query.bookings.findFirst({
          where: and(
            eq(bookings.id, id),
            eq(bookings.organizationId, ctx.organizationId)
          ),
        });

        if (!booking) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied',
          });
        }

        // Only allow users to cancel their own bookings unless they have admin/manager role
        if (booking.userId !== ctx.userId && !ctx.roles?.includes('admin') && !ctx.roles?.includes('manager')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to cancel this booking',
          });
        }

        // Check if booking is already cancelled
        if (booking.status === 'cancelled') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Booking is already cancelled',
          });
        }

        // Update booking status to cancelled
        const [updatedBooking] = await db.update(bookings)
          .set({ 
            status: 'cancelled',
            cancellationReason: reason,
            updatedAt: new Date(),
            metadata: {
              ...(booking.metadata || {}),
              cancelledAt: new Date().toISOString(),
              cancelledBy: ctx.userId,
              cancellationReason: reason,
            },
          })
          .where(eq(bookings.id, id))
          .returning();

        logger.info(`Booking ${id} cancelled by user ${ctx.userId}`);
        
        // TODO: Trigger any cancellation workflows (refunds, notifications, etc.)
        
        return updatedBooking;
      } catch (error) {
        logger.error('Cancel booking error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel booking',
        });
      }
    }),
});

export type BookingsRouter = typeof bookingsRouter;
