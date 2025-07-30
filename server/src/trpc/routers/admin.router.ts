import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { logger } from '../../utils/logger.js';
import { db } from '../../db/db';
import { users, organizations, userRoles, userOrganizationRoles } from '../../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm/expressions';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const userRoleSchema = z.enum([
  'admin',
  'user',
  'manager',
  'finance',
  'travel_manager',
  'approver',
  'superadmin_owner',
  'superadmin_staff',
]);

const updateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  role: userRoleSchema,
  permissions: z.record(z.any()).optional(),
});

const userQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  role: userRoleSchema.optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const adminRouter = router({
  // Get system analytics
  getAnalytics: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .query(async ({ ctx }) => {
      try {
        // Get basic analytics data
        const [totalUsers, totalOrganizations] = await Promise.all([
          db.select().from(users).then(users => users.length),
          db.select().from(organizations).then(orgs => orgs.length),
        ]);

        // Mock analytics data - replace with actual queries in production
        const analytics = {
          users: {
            total: totalUsers,
            active: Math.floor(totalUsers * 0.8), // 80% active users
            newThisMonth: Math.floor(totalUsers * 0.1),
          },
          organizations: {
            total: totalOrganizations,
            active: Math.floor(totalOrganizations * 0.9),
            newThisMonth: Math.floor(totalOrganizations * 0.05),
          },
          system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
          },
          updatedAt: new Date(),
        };

        return {
          success: true,
          data: analytics,
        };
      } catch (error) {
        logger.error('Failed to fetch admin analytics:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch analytics'
        );
      }
    }),

  // List users with filtering and pagination
  listUsers: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .input(userQuerySchema)
    .query(async ({ input, ctx }) => {
      try {
        const whereClause = [];
        
        // Add organization filter if provided
        if (input.organizationId) {
          whereClause.push(
            sql`${users.id} IN (
              SELECT user_id FROM ${userOrganizationRoles} 
              WHERE organization_id = ${input.organizationId}
            )`
          );
        }

        // Add role filter if provided
        if (input.role) {
          whereClause.push(
            sql`${users.id} IN (
              SELECT user_id FROM ${userOrganizationRoles} 
              WHERE role = ${input.role}
              ${input.organizationId ? sql`AND organization_id = ${input.organizationId}` : sql``}
            )`
          );
        }

        // Add status filter if provided
        if (input.status) {
          whereClause.push(eq(users.status, input.status));
        }

        // Add search filter if provided
        if (input.search) {
          const searchTerm = `%${input.search}%`;
          whereClause.push(
            sql`(
              ${users.email} ILIKE ${searchTerm} OR
              ${users.firstName} ILIKE ${searchTerm} OR
              ${users.lastName} ILIKE ${searchTerm}
            )`
          );
        }

        // Get paginated users
        const [items, total] = await Promise.all([
          db.query.users.findMany({
            where: whereClause.length > 0 ? and(...whereClause) : undefined,
            limit: input.limit,
            offset: input.offset,
            orderBy: [desc(users.createdAt)],
            with: {
              organizations: {
                columns: {},
                with: {
                  organization: true,
                },
              },
              roles: true,
            },
          }),
          db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(whereClause.length > 0 ? and(...whereClause) : undefined)
            .then(res => Number(res[0].count)),
        ]);

        return {
          success: true,
          data: {
            items,
            total,
            hasMore: input.offset + items.length < total,
          },
        };
      } catch (error) {
        logger.error('Failed to list users:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to list users'
        );
      }
    }),

  // Update user role
  updateUserRole: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner'] })
    .input(updateUserRoleSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the target user exists
        const [targetUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!targetUser) {
          throw new Error('User not found');
        }

        // For organization-specific roles
        if (input.organizationId) {
          // Check if the organization exists
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, input.organizationId))
            .limit(1);

          if (!org) {
            throw new Error('Organization not found');
          }

          // Update or create user organization role
          await db.transaction(async (tx) => {
            // Remove existing roles for this user in this organization
            await tx
              .delete(userOrganizationRoles)
              .where(
                and(
                  eq(userOrganizationRoles.userId, input.userId),
                  eq(userOrganizationRoles.organizationId, input.organizationId!)
                )
              );

            // Add the new role
            await tx.insert(userOrganizationRoles).values({
              id: uuidv4(),
              userId: input.userId,
              organizationId: input.organizationId!,
              role: input.role,
              permissions: input.permissions || {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          });
        } else {
          // Update global user role
          await db
            .update(users)
            .set({
              role: input.role,
              updatedAt: new Date(),
            })
            .where(eq(users.id, input.userId));
        }

        // Log the role update
        logger.info(`User role updated: ${input.userId}`, {
          userId: input.userId,
          organizationId: input.organizationId,
          newRole: input.role,
          updatedBy: ctx.user.id,
        });

        return {
          success: true,
          message: 'User role updated successfully',
        };
      } catch (error) {
        logger.error('Failed to update user role:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to update user role'
        );
      }
    }),

  // Suspend a user
  suspendUser: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner'] })
    .input(z.object({
      userId: z.string().uuid('Invalid user ID'),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Prevent admins from suspending themselves
        if (input.userId === ctx.user.id) {
          throw new Error('Cannot suspend your own account');
        }

        // Update user status to suspended
        const [updatedUser] = await db
          .update(users)
          .set({
            status: 'suspended',
            updatedAt: new Date(),
            metadata: sql`jsonb_set(
              COALESCE(metadata, '{}'::jsonb), 
              '{suspensionReason}', 
              ${JSON.stringify(input.reason || 'No reason provided')}::jsonb
            )`,
          })
          .where(eq(users.id, input.userId))
          .returning();

        if (!updatedUser) {
          throw new Error('User not found');
        }

        // Log the suspension
        logger.warn(`User suspended: ${input.userId}`, {
          userId: input.userId,
          suspendedBy: ctx.user.id,
          reason: input.reason,
        });

        // TODO: Invalidate user sessions

        return {
          success: true,
          message: 'User suspended successfully',
        };
      } catch (error) {
        logger.error('Failed to suspend user:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to suspend user'
        );
      }
    }),

  // Reactivate a user
  reactivateUser: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner'] })
    .input(z.object({
      userId: z.string().uuid('Invalid user ID'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Update user status to active
        const [updatedUser] = await db
          .update(users)
          .set({
            status: 'active',
            updatedAt: new Date(),
            metadata: sql`metadata - 'suspensionReason'`,
          })
          .where(eq(users.id, input.userId))
          .returning();

        if (!updatedUser) {
          throw new Error('User not found');
        }

        // Log the reactivation
        logger.info(`User reactivated: ${input.userId}`, {
          userId: input.userId,
          reactivatedBy: ctx.user.id,
        });

        return {
          success: true,
          message: 'User reactivated successfully',
        };
      } catch (error) {
        logger.error('Failed to reactivate user:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to reactivate user'
        );
      }
    }),

  // Get system health
  getSystemHealth: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .query(() => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          database: 'connected', // TODO: Add actual database health check
          services: {
            // TODO: Add health checks for external services
            email: 'ok',
            storage: 'ok',
            cache: 'ok',
          },
        };

        return {
          success: true,
          data: health,
        };
      } catch (error) {
        logger.error('Failed to get system health:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get system health'
        );
      }
    }),
});
