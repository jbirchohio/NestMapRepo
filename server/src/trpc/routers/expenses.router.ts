import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { logger } from '../../utils/logger.js';
import { db } from '../../db/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm/expressions';
import { expenses, trips, users } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const expenseBaseSchema = {
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().transform(val => new Date(val)),
  receiptUrl: z.string().url('Invalid URL format').optional(),
  isReimbursable: z.boolean().default(true),
  tripId: z.string().uuid('Invalid trip ID').optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'processed']).default('pending'),
  metadata: z.record(z.any()).optional(),
};

const createExpenseSchema = z.object({
  ...expenseBaseSchema,
  // Add any additional fields specific to creation
});

const updateExpenseSchema = z.object({
  id: z.string().uuid('Invalid expense ID'),
  ...expenseBaseSchema,
  // Make fields optional for updates
  amount: expenseBase.amount.optional(),
  category: expenseBase.category.optional(),
  description: expenseBase.description.optional(),
  date: z.string().transform(val => new Date(val)).optional(),
  // Add any additional fields specific to updates
});

const listExpensesSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'processed']).optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const expensesRouter = router({
  create: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expenseId = uuidv4();
        const now = new Date();
        
        const [expense] = await db.insert(expenses)
          .values({
            id: expenseId,
            userId: ctx.user.id,
            organizationId: ctx.user.organizationId,
            amount: input.amount,
            currency: input.currency,
            category: input.category,
            description: input.description,
            date: input.date,
            receiptUrl: input.receiptUrl,
            isReimbursable: input.isReimbursable,
            tripId: input.tripId,
            status: 'pending',
            metadata: input.metadata,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // Log the expense creation
        logger.info(`Expense created: ${expenseId}`, {
          expenseId,
          userId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          amount: input.amount,
        });

        return {
          success: true,
          data: expense,
        };
      } catch (error: unknown) {
        logger.error('Failed to create expense:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create expense'
        );
      }
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.string().uuid('Invalid expense ID'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const expense = await db.query.expenses.findFirst({
          where: and(
            eq(expenses.id, input.id),
            eq(expenses.organizationId, ctx.user.organizationId)
          ),
          with: {
            trip: true,
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (!expense) {
          throw new Error('Expense not found');
        }

        return {
          success: true,
          data: expense,
        };
      } catch (error) {
        logger.error('Failed to get expense:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get expense'
        );
      }
    }),

  list: protectedProcedure
    .input(listExpensesSchema)
    .query(async ({ input, ctx }) => {
      try {
        const whereClause = [
          eq(expenses.organizationId, ctx.user.organizationId),
        ];

        // Add date filters if provided
        if (input.startDate) {
          whereClause.push(gte(expenses.date, new Date(input.startDate)));
        }
        if (input.endDate) {
          whereClause.push(lte(expenses.date, new Date(input.endDate)));
        }

        // Add status filter if provided
        if (input.status) {
          whereClause.push(eq(expenses.status, input.status));
        }

        // Add category filter if provided
        if (input.category) {
          whereClause.push(eq(expenses.category, input.category));
        }

        // Build order by clause
        const orderBy = [];
        if (input.sortBy === 'date') {
          orderBy.push(desc(expenses.date));
        } else if (input.sortBy === 'amount') {
          orderBy.push(desc(expenses.amount));
        } else if (input.sortBy === 'createdAt') {
          orderBy.push(desc(expenses.createdAt));
        }

        // Add secondary sort by creation date
        if (input.sortBy !== 'createdAt') {
          orderBy.push(desc(expenses.createdAt));
        }

        const [items, total] = await Promise.all([
          db.query.expenses.findMany({
            where: and(...whereClause),
            orderBy,
            limit: input.limit,
            offset: input.offset,
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              trip: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          db.select({ count: sql<number>`count(*)` })
            .from(expenses)
            .where(and(...whereClause))
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
        logger.error('Failed to list expenses:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to list expenses'
        );
      }
    }),

  update: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // First verify the expense exists and belongs to the user's organization
        const existingExpense = await db.query.expenses.findFirst({
          where: and(
            eq(expenses.id, input.id),
            eq(expenses.organizationId, ctx.user.organizationId)
          ),
        });

        if (!existingExpense) {
          throw new Error('Expense not found');
        }

        // Prepare update data
        const updateData: Record<string, any> = {
          ...input,
          updatedAt: new Date(),
        };
        delete updateData.id; // Remove ID from update data

        // Update the expense
        const [updatedExpense] = await db.update(expenses)
          .set(updateData)
          .where(eq(expenses.id, input.id))
          .returning();

        // Log the update
        logger.info(`Expense updated: ${input.id}`, {
          expenseId: input.id,
          updatedBy: ctx.user.id,
          changes: input,
        });

        return {
          success: true,
          data: updatedExpense,
        };
      } catch (error) {
        logger.error('Failed to update expense:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to update expense'
        );
      }
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid('Invalid expense ID'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // First verify the expense exists and belongs to the user's organization
        const existingExpense = await db.query.expenses.findFirst({
          where: and(
            eq(expenses.id, input.id),
            eq(expenses.organizationId, ctx.user.organizationId)
          ),
        });

        if (!existingExpense) {
          throw new Error('Expense not found');
        }

        // Delete the expense
        await db.delete(expenses)
          .where(eq(expenses.id, input.id));

        // Log the deletion
        logger.info(`Expense deleted: ${input.id}`, {
          expenseId: input.id,
          deletedBy: ctx.user.id,
        });

        return {
          success: true,
          message: 'Expense deleted successfully',
        };
      } catch (error) {
        logger.error('Failed to delete expense:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to delete expense'
        );
      }
    }),

  // Additional endpoints for expense management
  submitForApproval: protectedProcedure
    .input(z.object({
      id: z.string().uuid('Invalid expense ID'),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the expense exists and belongs to the user's organization
        const expense = await db.query.expenses.findFirst({
          where: and(
            eq(expenses.id, input.id),
            eq(expenses.organizationId, ctx.user.organizationId)
          ),
        });

        if (!expense) {
          throw new Error('Expense not found');
        }

        // Update status to pending approval
        const [updatedExpense] = await db.update(expenses)
          .set({
            status: 'pending',
            updatedAt: new Date(),
          })
          .where(eq(expenses.id, input.id))
          .returning();

        // TODO: Trigger approval workflow
        // await approvalEngine.submitForApproval({
        //   expenseId: input.id,
        //   userId: ctx.user.id,
        //   organizationId: ctx.user.organizationId,
        //   amount: expense.amount,
        //   currency: expense.currency,
        //   comment: input.comment,
        // });

        // Log the submission
        logger.info(`Expense submitted for approval: ${input.id}`, {
          expenseId: input.id,
          submittedBy: ctx.user.id,
          comment: input.comment,
        });

        return {
          success: true,
          data: updatedExpense,
        };
      } catch (error) {
        logger.error('Failed to submit expense for approval:', error);
        throw new Error(
          error instanceof Error 
            ? error.message 
            : 'Failed to submit expense for approval'
        );
      }
    }),

  // Get expense statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(['day', 'week', 'month', 'category', 'status']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const whereClause = [
          eq(expenses.organizationId, ctx.user.organizationId),
        ];

        // Add date filters if provided
        if (input.startDate) {
          whereClause.push(gte(expenses.date, new Date(input.startDate)));
        }
        if (input.endDate) {
          whereClause.push(lte(expenses.date, new Date(input.endDate)));
        }

        // Build the group by clause based on input
        let groupByField: any;
        if (input.groupBy === 'day') {
          groupByField = sql`DATE(${expenses.date})`;
        } else if (input.groupBy === 'week') {
          groupByField = sql`DATE_TRUNC('week', ${expenses.date})`;
        } else if (input.groupBy === 'month') {
          groupByField = sql`DATE_TRUNC('month', ${expenses.date})`;
        } else if (input.groupBy === 'category') {
          groupByField = expenses.category;
        } else if (input.groupBy === 'status') {
          groupByField = expenses.status;
        }

        // Get aggregated statistics
        const stats = await db
          .select({
            group: groupByField,
            total: sql<number>`SUM(${expenses.amount})`,
            count: sql<number>`COUNT(*)`,
          })
          .from(expenses)
          .where(and(...whereClause))
          .groupBy(groupByField);

        // Get total summary
        const [summary] = await db
          .select({
            total: sql<number>`SUM(${expenses.amount})`,
            count: sql<number>`COUNT(*)`,
            average: sql<number>`AVG(${expenses.amount})`,
          })
          .from(expenses)
          .where(and(...whereClause));

        return {
          success: true,
          data: {
            stats,
            summary: {
              total: Number(summary.total) || 0,
              count: Number(summary.count) || 0,
              average: Number(summary.average) || 0,
            },
            groupBy: input.groupBy,
          },
        };
      } catch (error) {
        logger.error('Failed to get expense statistics:', error);
        throw new Error(
          error instanceof Error 
            ? error.message 
            : 'Failed to get expense statistics'
        );
      }
    }),
});
