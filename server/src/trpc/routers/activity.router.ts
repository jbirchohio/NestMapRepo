import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { activityService } from '../../services/activity.service';
import { auditLogger } from '../../auditLogger';
import { activitySchema, createActivitySchema, updateActivitySchema } from '../../types/activity';
import { TRPCError } from '@trpc/server';

export const activityRouter = router({
  // Get all activities for a trip
  getByTripId: protectedProcedure
    .input(z.object({
      tripId: z.string().uuid(),
      filters: z.object({
        completed: z.boolean().optional(),
        assignedTo: z.string().uuid().optional(),
        date: z.date().optional(),
      }).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { tripId, filters = {} } = input;
      
      // Add organization ID to filters for security
      const activities = await activityService.findByTripId(tripId, {
        ...filters,
        organizationId: ctx.user.organizationId,
      });

      return activities;
    }),

  // Get a specific activity
  getById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const activity = await activityService.findById(input.id);
      
      if (!activity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Activity not found',
        });
      }

      // Ensure the activity belongs to the user's organization
      if (activity.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this activity',
        });
      }

      return activity;
    }),

  // Create a new activity
  create: protectedProcedure
    .input(createActivitySchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure the user has permission to create activities for this organization
      const newActivity = await activityService.create({
        ...input,
        organizationId: ctx.user.organizationId,
        createdBy: ctx.user.id,
      });

      // Log the activity creation
      await auditLogger.log({
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        action: 'activity.created',
        details: {
          activityId: newActivity.id,
          tripId: newActivity.tripId,
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        logType: 'activity',
      });

      return newActivity;
    }),

  // Update an existing activity
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateActivitySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      
      // First, verify the activity exists and belongs to the user's organization
      const existingActivity = await activityService.findById(id);
      if (!existingActivity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Activity not found',
        });
      }

      if (existingActivity.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this activity',
        });
      }

      const updatedActivity = await activityService.update(id, data);
      if (!updatedActivity) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update activity',
        });
      }

      // Log the activity update
      await auditLogger.log({
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        action: 'activity.updated',
        details: {
          activityId: updatedActivity.id,
          changes: data,
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        logType: 'activity',
      });

      return updatedActivity;
    }),

  // Delete an activity
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      
      // First, verify the activity exists and belongs to the user's organization
      const existingActivity = await activityService.findById(id);
      if (!existingActivity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Activity not found',
        });
      }

      if (existingActivity.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this activity',
        });
      }

      const result = await activityService.delete(id);
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete activity',
        });
      }

      // Log the activity deletion
      await auditLogger.log({
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        action: 'activity.deleted',
        details: {
          activityId: id,
          tripId: existingActivity.tripId,
        },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        logType: 'activity',
      });

      return { success: true };
    }),
});

export type ActivityRouter = typeof activityRouter;
