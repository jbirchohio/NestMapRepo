import type { Router } from '../../express-augmentations.ts';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { db } from '../db.ts';
import { expenses, trips, users } from '@shared/schema';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.ts';
import { z } from 'zod';
import { approvalEngine } from '../approvalEngine.ts';
// Validation schemas
const insertExpenseSchema = z.object({
    amount: z.union([
        z.number(),
        z.string().transform((val, ctx) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Amount must be a valid number",
                });
                return z.NEVER;
            }
            return parsed;
        })
    ]).refine(val => val > 0, "Amount must be greater than 0"),
    currency: z.string().default('USD'),
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().transform(val => new Date(val)),
    receiptUrl: z.string().optional(),
    isReimbursable: z.boolean().default(true),
    trip_id: z.number().optional(),
});
const router = Router();
// Apply middleware to all routes
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);
// Get expenses for organization
router.get('/', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const organizationId = req.user.organization_id;
        const { tripId, status, category, startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = db
            .select()
            .from(expenses)
            .leftJoin(trips, eq(expenses.trip_id, trips.id))
            .leftJoin(users, eq(expenses.user_id, users.id))
            .where(eq(expenses.organization_id, organizationId));
        // Build filter conditions
        const conditions = [eq(expenses.organization_id, organizationId)];
        if (tripId) {
            conditions.push(eq(expenses.trip_id, parseInt(tripId as string)));
        }
        if (status) {
            conditions.push(eq(expenses.status, status as string));
        }
        if (category) {
            conditions.push(eq(expenses.category, category as string));
        }
        if (startDate) {
            conditions.push(gte(expenses.date, new Date(startDate as string)));
        }
        if (endDate) {
            conditions.push(lte(expenses.date, new Date(endDate as string)));
        }
        // Apply all conditions at once
        if (conditions.length > 1) {
            query = query.where(and(...conditions));
        }
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const result = await query
            .orderBy(desc(expenses.createdAt))
            .limit(parseInt(limit as string))
            .offset(offset);
        // Format the response properly
        const expenseList = result.map(row => ({
            id: row.expenses?.id,
            amount: row.expenses?.amount,
            currency: row.expenses?.currency,
            category: row.expenses?.category,
            description: row.expenses?.description,
            date: row.expenses?.date,
            status: row.expenses?.status,
            receiptUrl: row.expenses?.receiptUrl,
            isReimbursable: row.expenses?.isReimbursable,
            tripId: row.expenses?.trip_id,
            createdAt: row.expenses?.createdAt,
            trip: row.trips ? {
                id: row.trips.id,
                title: row.trips.title,
                destination: row.trips.destination
            } : null,
            user: row.users ? {
                id: row.users.id,
                displayName: row.users.display_name,
                email: row.users.email
            } : null
        }));
        res.json(expenseList);
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});
// Get expense statistics
router.get('/stats', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const organizationId = req.user.organization_id;
        const { year, month } = req.query;
        let dateFilter = eq(expenses.organization_id, organizationId);
        if (year) {
            const startDate = new Date(parseInt(year as string), month ? parseInt(month as string) - 1 : 0, 1);
            const endDate = month
                ? new Date(parseInt(year as string), parseInt(month as string), 0)
                : new Date(parseInt(year as string) + 1, 0, 0);
            dateFilter = and(eq(expenses.organization_id, organizationId), gte(expenses.date, startDate), lte(expenses.date, endDate));
        }
        // Get total expenses by status
        const statusStats = await db
            .select({
            status: expenses.status,
            count: sql<number> `count(*)::int`,
            total: sql<number> `sum(${expenses.amount})::int`
        })
            .from(expenses)
            .where(dateFilter)
            .groupBy(expenses.status);
        // Get expenses by category
        const categoryStats = await db
            .select({
            category: expenses.category,
            count: sql<number> `count(*)::int`,
            total: sql<number> `sum(${expenses.amount})::int`
        })
            .from(expenses)
            .where(dateFilter)
            .groupBy(expenses.category);
        // Get monthly trends
        const monthlyStats = await db
            .select({
            month: sql<string> `to_char(${expenses.date}, 'YYYY-MM')`,
            count: sql<number> `count(*)::int`,
            total: sql<number> `sum(${expenses.amount})::int`,
            avgAmount: sql<number> `avg(${expenses.amount})::int`
        })
            .from(expenses)
            .where(eq(expenses.organization_id, organizationId))
            .groupBy(sql `to_char(${expenses.date}, 'YYYY-MM')`)
            .orderBy(sql `to_char(${expenses.date}, 'YYYY-MM') DESC`)
            .limit(12);
        res.json({
            byStatus: statusStats,
            byCategory: categoryStats,
            monthlyTrends: monthlyStats
        });
    }
    catch (error) {
        console.error('Error fetching expense statistics:', error);
        res.status(500).json({ error: "Failed to fetch expense statistics" });
    }
});
// Create expense
router.post('/', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const organizationId = req.user.organization_id;
        const userId = req.user.id;
        const validatedData = insertExpenseSchema.parse(req.body);
        // Check if approval is required for this expense
        const approvalResult = await approvalEngine.processApprovalWorkflow({
            organizationId,
            entityType: 'expense',
            requestType: 'create',
            data: {
                ...validatedData,
                amount: validatedData.amount,
                category: validatedData.category
            },
            requesterId: userId,
            businessJustification: req.body.businessJustification
        });
        let expenseStatus = 'pending';
        if (!approvalResult.requiresApproval || approvalResult.autoApproved) {
            expenseStatus = 'approved';
        }
        // Create expense
        const [newExpense] = await db
            .insert(expenses)
            .values({
            ...validatedData,
            organization_id: organizationId,
            user_id: userId,
            status: expenseStatus
        })
            .returning();
        // If approval is required, update the approval request with the expense ID
        if (approvalResult.requiresApproval && approvalResult.requestId) {
            await db
                .update(db.approvalRequests)
                .set({ entityId: newExpense.id })
                .where(eq(db.approvalRequests.id, approvalResult.requestId));
        }
        res.status(201).json({
            expense: newExpense,
            approvalRequired: approvalResult.requiresApproval,
            approvalRequestId: approvalResult.requestId
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Invalid input",
                details: error.errors
            });
        }
        console.error('Error creating expense:', error);
        res.status(500).json({ error: "Failed to create expense" });
    }
});
// Update expense
router.patch('/:expenseId', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const expenseId = parseInt(req.params.expenseId);
        const organizationId = req.user.organization_id;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Get existing expense
        const [existingExpense] = await db
            .select()
            .from(expenses)
            .where(and(eq(expenses.id, expenseId), eq(expenses.organization_id, organizationId)));
        if (!existingExpense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        // Check permissions - user can edit their own expenses or managers can edit any
        if (existingExpense.user_id !== userId && !['admin', 'manager'].includes(userRole)) {
            return res.status(403).json({ error: "Permission denied" });
        }
        const updateData = req.body;
        // If significant changes require approval
        const requiresApproval = await checkUpdateRequiresApproval(existingExpense, updateData);
        if (requiresApproval && !['admin', 'manager'].includes(userRole)) {
            // Create approval request for modification
            const approvalResult = await approvalEngine.processApprovalWorkflow({
                organizationId,
                entityType: 'expense',
                requestType: 'modify',
                data: updateData,
                requesterId: userId,
                businessJustification: req.body.businessJustification
            });
            return res.json({
                message: "Changes require approval",
                approvalRequestId: approvalResult.requestId
            });
        }
        // Update expense
        const [updatedExpense] = await db
            .update(expenses)
            .set({
            ...updateData,
            updatedAt: new Date()
        })
            .where(eq(expenses.id, expenseId))
            .returning();
        res.json(updatedExpense);
    }
    catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: "Failed to update expense" });
    }
});
// Approve/reject expense (for managers)
router.patch('/:expenseId/approval', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const expenseId = parseInt(req.params.expenseId);
        const organizationId = req.user.organization_id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { action, reason } = req.body;
        // Only managers and admins can approve/reject expenses
        if (!['admin', 'manager'].includes(userRole)) {
            return res.status(403).json({ error: "Manager role required for expense approval" });
        }
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        }
        // Get expense
        const [expense] = await db
            .select()
            .from(expenses)
            .where(and(eq(expenses.id, expenseId), eq(expenses.organization_id, organizationId)));
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        // Update expense status
        const [updatedExpense] = await db
            .update(expenses)
            .set({
            status: newStatus,
            approvedBy: action === 'approve' ? userId : null,
            approvedAt: action === 'approve' ? new Date() : null,
            rejectionReason: action === 'reject' ? reason : null,
            updatedAt: new Date()
        })
            .where(eq(expenses.id, expenseId))
            .returning();
        res.json(updatedExpense);
    }
    catch (error) {
        console.error('Error processing expense approval:', error);
        res.status(500).json({ error: "Failed to process expense approval" });
    }
});
// Upload receipt
router.post('/:expenseId/receipt', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const expenseId = parseInt(req.params.expenseId);
        const organizationId = req.user.organization_id;
        const { receiptUrl, receiptData } = req.body;
        // Verify expense exists and user has permission
        const [expense] = await db
            .select()
            .from(expenses)
            .where(and(eq(expenses.id, expenseId), eq(expenses.organization_id, organizationId)));
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        // Update expense with receipt information
        const [updatedExpense] = await db
            .update(expenses)
            .set({
            receiptUrl,
            receiptData: receiptData ? JSON.stringify(receiptData) : null,
            updatedAt: new Date()
        })
            .where(eq(expenses.id, expenseId))
            .returning();
        res.json(updatedExpense);
    }
    catch (error) {
        console.error('Error uploading receipt:', error);
        res.status(500).json({ error: "Failed to upload receipt" });
    }
});
// Generate expense report
router.get('/report', async (req, res) => {
    try {
        if (!req.user?.organization_id) {
            return res.status(401).json({ error: "Organization membership required" });
        }
        const organizationId = req.user.organization_id;
        const { format = 'json', startDate, endDate, tripId, userId: filterUserId } = req.query;
        let query = db
            .select({
            expense: expenses,
            trip: {
                id: trips.id,
                title: trips.title,
                destination: trips.destination,
                startDate: trips.start_date,
                endDate: trips.end_date
            },
            user: {
                id: users.id,
                displayName: users.display_name,
                email: users.email
            }
        })
            .from(expenses)
            .leftJoin(trips, eq(expenses.trip_id, trips.id))
            .leftJoin(users, eq(expenses.user_id, users.id))
            .where(eq(expenses.organization_id, organizationId));
        // Apply filters
        if (startDate) {
            query = query.where(and(eq(expenses.organization_id, organizationId), gte(expenses.date, new Date(startDate as string))));
        }
        if (endDate) {
            query = query.where(and(eq(expenses.organization_id, organizationId), lte(expenses.date, new Date(endDate as string))));
        }
        if (tripId) {
            query = query.where(and(eq(expenses.organization_id, organizationId), eq(expenses.trip_id, parseInt(tripId as string))));
        }
        if (filterUserId) {
            query = query.where(and(eq(expenses.organization_id, organizationId), eq(expenses.user_id, parseInt(filterUserId as string))));
        }
        const reportData = await query.orderBy(desc(expenses.date));
        if (format === 'csv') {
            // Generate CSV format
            const csvHeader = 'Date,Description,Category,Amount,Currency,Status,Trip,Employee,Receipt\n';
            const csvRows = reportData.map(row => {
                const expense = row.expense;
                return [
                    expense.date.toISOString().split('T')[0],
                    `"${expense.description.replace(/"/g, '""')}"`,
                    expense.category,
                    (expense.amount / 100).toFixed(2),
                    expense.currency,
                    expense.status,
                    `"${row.trip?.title || 'N/A'}"`,
                    `"${row.user?.displayName || 'Unknown'}"`,
                    expense.receiptUrl ? 'Yes' : 'No'
                ].join(',');
            }).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=expense-report.csv');
            res.send(csvHeader + csvRows);
        }
        else {
            res.json({
                reportData,
                summary: {
                    totalExpenses: reportData.length,
                    totalAmount: reportData.reduce((sum, row) => sum + row.expense.amount, 0),
                    byStatus: reportData.reduce((acc, row) => {
                        acc[row.expense.status] = (acc[row.expense.status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                    byCategory: reportData.reduce((acc, row) => {
                        acc[row.expense.category] = (acc[row.expense.category] || 0) + row.expense.amount;
                        return acc;
                    }, {} as Record<string, number>)
                }
            });
        }
    }
    catch (error) {
        console.error('Error generating expense report:', error);
        res.status(500).json({ error: "Failed to generate expense report" });
    }
});
// Helper function to check if update requires approval
async function checkUpdateRequiresApproval(existingExpense: any, updateData: any): Promise<boolean> {
    // Significant changes that require approval
    const significantFields = ['amount', 'category', 'description'];
    for (const field of significantFields) {
        if (updateData[field] !== undefined && updateData[field] !== existingExpense[field]) {
            // Amount increases over $100 require approval
            if (field === 'amount' && updateData[field] > existingExpense[field] + 10000) { // $100 in cents
                return true;
            }
            // Category changes require approval
            if (field === 'category') {
                return true;
            }
        }
    }
    return false;
}
export default router;
