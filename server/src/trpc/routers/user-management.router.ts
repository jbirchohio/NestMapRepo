import { z } from 'zod';
import { and, eq, or, desc, sql } from '../../utils/drizzle-shim';
import { getDatabase } from '../../db/connection.js';
import { users, organizations, userOrganizations } from '../../db/schema';
import { logger } from '../../utils/logger.js';
import { TRPCError } from '@trpc/server';
import { adminProcedure, protectedProcedure, router } from './_base.router';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Input validation schemas
const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['member', 'manager', 'admin']).default('member'),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters"),
  organizationId: z.string().uuid("Organization ID is required"),
});

const updateUserSchema = z.object({
  userId: z.string().uuid("User ID is required"),
  updates: z.object({
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    email: z.string().email("Invalid email address").optional(),
    role: z.enum(['member', 'manager', 'admin']).optional(),
    isActive: z.boolean().optional(),
  }),
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string().uuid("Invalid user ID")),
  updates: z.object({
    role: z.enum(['member', 'manager', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
});

const listUsersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['member', 'manager', 'admin']).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLogin']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const userManagementRouter = router({
  // List users with pagination and filtering
  listUsers: adminProcedure
    .input(listUsersSchema)
    .query(async ({ input, ctx }) => {
      try {
        const db = getDB();
        const { page, limit, search, role, isActive, sortBy, sortOrder } = input;
        const offset = (page - 1) * limit;
        
        // Build the where clause
        const whereClause = and(
          eq(userOrganizations.organizationId, ctx.orgId),
          search ? or(
            sql`LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE LOWER(${'%' + search + '%'})`,
            sql`LOWER(${users.email}) LIKE LOWER(${'%' + search + '%'})`
          ) : undefined,
          role ? eq(userOrganizations.role, role) : undefined,
          isActive !== undefined ? eq(users.isActive, isActive) : undefined
        );

        // Get total count
        const totalCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
          .where(whereClause);

        // Get paginated users
        const userList = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            isActive: users.isActive,
            role: userOrganizations.role,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
          })
          .from(users)
          .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
          .where(whereClause)
          .orderBy(
            sortBy === 'name' ? 
              (sortOrder === 'asc' ? sql`${users.lastName} ASC, ${users.firstName} ASC` : 
                                  sql`${users.lastName} DESC, ${users.firstName} DESC`) :
            sortBy === 'email' ? 
              (sortOrder === 'asc' ? sql`${users.email} ASC` : sql`${users.email} DESC`) :
            sortBy === 'createdAt' ? 
              (sortOrder === 'asc' ? sql`${users.createdAt} ASC` : sql`${users.createdAt} DESC`) :
            // lastLogin
              (sortOrder === 'asc' ? sql`${users.lastLogin} ASC` : sql`${users.lastLogin} DESC`)
          )
          .limit(limit)
          .offset(offset);

        return {
          success: true,
          data: {
            items: userList,
            pagination: {
              total: Number(totalCount[0]?.count) || 0,
              page,
              limit,
              totalPages: Math.ceil((Number(totalCount[0]?.count) || 0) / limit),
            },
          },
        };
      } catch (error) {
        logger.error('Error listing users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

  // Create a new user
  createUser: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        const { temporaryPassword, organizationId, ...userData } = input;

        // Check if email already exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, userData.email),
        });

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use',
          });
        }

        // Hash the password
        const hashedPassword = await hashPassword(temporaryPassword);
        
        // Start a transaction
        return await db.transaction(async (tx) => {
          // Create the user
          const [newUser] = await tx
            .insert(users)
            .values({
              ...userData,
              passwordHash: hashedPassword,
              emailVerified: false,
              isActive: true,
            })
            .returning({
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              isActive: users.isActive,
              createdAt: users.createdAt,
            });

          // Add user to organization
          await tx.insert(userOrganizations).values({
            userId: newUser.id,
            organizationId,
            role: input.role,
            isDefault: true,
          });

          // In a real implementation, you would send a welcome email with instructions
          
          return {
            success: true,
            data: newUser,
            message: 'User created successfully',
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error creating user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }
    }),

  // Update a user
  updateUser: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        const { userId, updates } = input;

        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!existingUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Check if email is being updated and if it's already taken
        if (updates.email && updates.email !== existingUser.email) {
          const emailInUse = await db.query.users.findFirst({
            where: and(
              eq(users.email, updates.email),
              neq(users.id, userId)
            ),
          });

          if (emailInUse) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Email already in use',
            });
          }
        }

        // Update the user
        const [updatedUser] = await db
          .update(users)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            isActive: users.isActive,
            avatarUrl: users.avatarUrl,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });

        // If role is being updated, update the organization membership
        if (updates.role) {
          await db
            .update(userOrganizations)
            .set({ 
              role: updates.role,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(userOrganizations.userId, userId),
                eq(userOrganizations.organizationId, ctx.orgId)
              )
            );
        }

        return {
          success: true,
          data: updatedUser,
          message: 'User updated successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error updating user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
        });
      }
    }),

  // Bulk update users
  bulkUpdateUsers: adminProcedure
    .input(bulkUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        const { userIds, updates } = input;

        // Start a transaction
        await db.transaction(async (tx) => {
          // Update users
          if (updates.isActive !== undefined) {
            await tx
              .update(users)
              .set({ 
                isActive: updates.isActive,
                updatedAt: new Date(),
              })
              .where(and(
                inArray(users.id, userIds),
                // Ensure users belong to the same organization
                exists(
                  tx
                    .select()
                    .from(userOrganizations)
                    .where(and(
                      eq(userOrganizations.organizationId, ctx.orgId),
                      eq(userOrganizations.userId, users.id)
                    ))
                )
              ));
          }

          // Update roles if specified
          if (updates.role) {
            await tx
              .update(userOrganizations)
              .set({ 
                role: updates.role,
                updatedAt: new Date(),
              })
              .where(and(
                inArray(userOrganizations.userId, userIds),
                eq(userOrganizations.organizationId, ctx.orgId)
              ));
          }
        });

        return {
          success: true,
          message: `${userIds.length} users updated successfully`,
        };
      } catch (error) {
        logger.error('Error in bulk update:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update users',
        });
      }
    }),

  // Reset user password (admin)
  resetUserPassword: adminProcedure
    .input(z.object({
      userId: z.string().uuid("User ID is required"),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDB();
        const { userId, newPassword } = input;

        // Check if user exists and belongs to the same organization
        const userExists = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, userId),
            eq(userOrganizations.organizationId, ctx.orgId)
          ),
        });

        if (!userExists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found in this organization',
          });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update the password
        await db
          .update(users)
          .set({
            passwordHash: hashedPassword,
            updatedAt: new Date(),
            passwordChangedAt: new Date(),
            forcePasswordReset: true,
          })
          .where(eq(users.id, userId));

        // In a real implementation, you would notify the user

        return {
          success: true,
          message: 'Password reset successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error resetting user password:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reset password',
        });
      }
    }),
});

// Helper functions
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Helper function for IN array condition
function inArray<T extends string | number>(column: any, values: T[]) {
  return sql`${column} IN (${values.join(',')})`;
}

// Helper function for EXISTS condition
function exists(subquery: any) {
  return sql`EXISTS (${subquery})`;
}

// Helper function for NOT EQUAL condition
function neq(column: any, value: any) {
  return sql`${column} != ${value}`;
}

export type UserManagementRouter = typeof userManagementRouter;
