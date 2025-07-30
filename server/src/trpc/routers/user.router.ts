import { z } from 'zod';
import { eq } from '../../utils/drizzle-shim';
import { getDatabase } from '../../db/connection.js';
import { users } from '../../db/schema';
import { logger } from '../../utils/logger.js';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from './_base.router';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Input validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  notificationPreferences: z.record(z.any()).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const userRouter = router({
  // Get current user's profile
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = getDB();
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.userId),
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            timezone: true,
            avatarUrl: true,
            notificationPreferences: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        logger.error('Error fetching user profile:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user profile',
        });
      }
    }),

  // Update current user's profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        
        // Check if email is being updated and if it's already taken
        if (input.email) {
          const existingUser = await db.query.users.findFirst({
            where: (users, { and, neq }) => 
              and(
                eq(users.email, input.email!), // Non-null assertion is safe because we checked input.email exists
                neq(users.id, ctx.userId)
              ),
          });

          if (existingUser) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Email already in use',
            });
          }
        }

        const [updatedUser] = await db
          .update(users)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.userId))
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            timezone: users.timezone,
            avatarUrl: users.avatarUrl,
            notificationPreferences: users.notificationPreferences,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });

        return {
          success: true,
          data: updatedUser,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error updating user profile:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user profile',
        });
      }
    }),

  // Update current user's password
  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        
        // Get the user with password hash
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.userId),
          columns: {
            id: true,
            passwordHash: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Verify current password
        const isPasswordValid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect',
          });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(input.newPassword);
        
        // Update the password
        await db
          .update(users)
          .set({
            passwordHash: hashedPassword,
            updatedAt: new Date(),
            passwordChangedAt: new Date(),
          })
          .where(eq(users.id, ctx.userId));

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error updating password:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update password',
        });
      }
    }),

  // Get current user's permissions
  getPermissions: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // In a real implementation, you would fetch permissions from the database
        // based on the user's role and organization
        return {
          success: true,
          data: {
            canViewDashboard: true,
            canManageBookings: true,
            canManageUsers: ctx.roles.includes('admin'),
            canManageOrganization: ctx.roles.includes('admin'),
            // Add other permissions as needed
          },
        };
      } catch (error) {
        logger.error('Error fetching user permissions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user permissions',
        });
      }
    }),
});

// Helper functions
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In a real implementation, you would use bcrypt or similar
  // This is a placeholder implementation
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

async function hashPassword(password: string): Promise<string> {
  // In a real implementation, you would use bcrypt or similar
  // This is a placeholder implementation
  const bcrypt = await import('bcrypt');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export type UserRouter = typeof userRouter;
