import { db } from "../db-connection";
import { 
  expenses, 
  expenseReceipts, 
  mileageTracking,
  expenseApprovals,
  reimbursements,
  budgets,
  InsertExpense,
  InsertExpenseReceipt,
  InsertMileageTracking,
  Expense,
  ExpenseReceipt,
  MileageTracking
} from '@shared/schema';
import { eq, and, or, sql, desc, gte, lte, sum, inArray } from 'drizzle-orm';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';
import { travelPolicyService } from './travelPolicyService';

// Initialize OpenAI for advanced OCR processing
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class ExpenseManagementService {
  private tessaractWorker: Tesseract.Worker | null = null;

  constructor() {
    this.initializeOCR();
  }

  private async initializeOCR() {
    try {
      this.tessaractWorker = await createWorker('eng');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }

  // Create a new expense
  async createExpense(
    expenseData: InsertExpense
  ): Promise<{ expense: Expense; violations?: any[] }> {
    // Check policy compliance
    const complianceCheck = await travelPolicyService.checkPolicyCompliance(
      expenseData.organization_id,
      expenseData.user_id,
      {
        type: 'expense',
        amount: expenseData.amount,
        details: {
          category: expenseData.expense_category,
          merchantCategory: expenseData.merchant_category,
          date: expenseData.transaction_date
        }
      }
    );

    // Create expense with policy violations if any
    const [expense] = await db.insert(expenses)
      .values({
        ...expenseData,
        policy_violations: complianceCheck.violations.length > 0 
          ? complianceCheck.violations 
          : null,
        approval_status: complianceCheck.requiresApproval ? 'pending' : 'auto_approved'
      })
      .returning();

    // Record violations if any
    if (complianceCheck.violations.length > 0) {
      for (const violation of complianceCheck.violations) {
        await travelPolicyService.recordViolation({
          organization_id: expenseData.organization_id,
          policy_id: violation.policyId,
          user_id: expenseData.user_id,
          expense_id: expense.id,
          violation_type: violation.violationType,
          violation_details: violation.details,
          severity: violation.severity
        });
      }

      // Create approval request if needed
      if (complianceCheck.requiresApproval) {
        await travelPolicyService.createApprovalRequest(
          expenseData.organization_id,
          {
            requesterId: expenseData.user_id,
            entityType: 'expense',
            entityId: expense.id,
            violations: complianceCheck.violations,
            businessJustification: expenseData.business_purpose
          }
        );
      }
    }

    return { expense, violations: complianceCheck.violations };
  }

  // Process receipt with OCR
  async processReceipt(
    receiptData: Omit<InsertExpenseReceipt, 'ocr_extracted_data' | 'ocr_raw_text'>,
    fileBuffer: Buffer
  ): Promise<ExpenseReceipt> {
    let ocrResult = null;
    
    try {
      // Update status to processing
      const [receipt] = await db.insert(expenseReceipts)
        .values({
          ...receiptData,
          ocr_status: 'processing'
        })
        .returning();

      // Perform OCR with Tesseract
      if (this.tessaractWorker) {
        const { data } = await this.tessaractWorker.recognize(fileBuffer);
        const rawText = data.text;
        const confidence = data.confidence / 100; // Convert to 0-1 scale

        // Use OpenAI to extract structured data from OCR text
        const extractedData = await this.extractReceiptData(rawText);

        // Update receipt with OCR results
        const [updated] = await db.update(expenseReceipts)
          .set({
            ocr_status: 'completed',
            ocr_confidence: confidence.toString(),
            ocr_raw_text: rawText,
            ocr_extracted_data: extractedData,
            ocr_processed_at: new Date()
          })
          .where(eq(expenseReceipts.id, receipt.id))
          .returning();

        // Auto-update expense if confidence is high
        if (confidence > 0.8 && extractedData.amount) {
          await this.updateExpenseFromReceipt(receipt.expense_id, extractedData);
        }

        return updated;
      }

      return receipt;
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Update status to failed
      const [failed] = await db.update(expenseReceipts)
        .set({
          ocr_status: 'failed'
        })
        .where(eq(expenseReceipts.id, receiptData.expense_id))
        .returning();

      return failed;
    }
  }

  // Extract structured data from OCR text using AI
  private async extractReceiptData(ocrText: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Extract receipt information from the following text and return as JSON.
            Extract: merchant_name, amount (as number), currency, date (YYYY-MM-DD), 
            tax_amount, tip_amount, items (array of {name, quantity, price}), payment_method.
            If a field cannot be found, omit it from the response.`
          },
          {
            role: "user",
            content: ocrText
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('AI extraction failed:', error);
      return {};
    }
  }

  // Update expense from receipt data
  private async updateExpenseFromReceipt(
    expenseId: number, 
    receiptData: any
  ): Promise<void> {
    const updates: any = {};
    
    if (receiptData.merchant_name) {
      updates.merchant_name = receiptData.merchant_name;
    }
    if (receiptData.amount) {
      updates.amount = Math.round(receiptData.amount * 100); // Convert to cents
    }
    if (receiptData.date) {
      updates.transaction_date = new Date(receiptData.date);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(expenses)
        .set(updates)
        .where(eq(expenses.id, expenseId));
    }
  }

  // Track mileage
  async trackMileage(
    mileageData: Omit<InsertMileageTracking, 'distance_miles' | 'total_amount'>,
    autoCalculate: boolean = true
  ): Promise<MileageTracking> {
    let distance = 0;
    let totalAmount = 0;

    if (autoCalculate && mileageData.start_latitude && mileageData.end_latitude) {
      // Calculate distance using Haversine formula
      distance = this.calculateDistance(
        parseFloat(mileageData.start_latitude),
        parseFloat(mileageData.start_longitude!),
        parseFloat(mileageData.end_latitude),
        parseFloat(mileageData.end_longitude!)
      );
    }

    // Calculate total amount based on rate
    const ratePerMile = parseFloat(mileageData.rate_per_mile || process.env.IRS_MILEAGE_RATE || '0.655');
    totalAmount = Math.round(distance * ratePerMile * 100); // Convert to cents

    const [tracking] = await db.insert(mileageTracking)
      .values({
        ...mileageData,
        distance_miles: distance.toString(),
        total_amount: totalAmount
      })
      .returning();

    // Create associated expense
    await this.createExpense({
      organization_id: mileageData.organization_id,
      user_id: mileageData.user_id,
      merchant_name: `Mileage: ${mileageData.start_location} to ${mileageData.end_location}`,
      merchant_category: 'transportation',
      amount: totalAmount,
      currency: 'USD',
      transaction_date: new Date(mileageData.trip_date),
      expense_category: 'mileage',
      description: mileageData.purpose,
      business_purpose: mileageData.purpose,
      mileage: Math.round(distance)
    });

    return tracking;
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get expense analytics
  async getExpenseAnalytics(
    organizationId: number,
    startDate: Date,
    endDate: Date,
    groupBy: 'category' | 'user' | 'department' | 'project' = 'category'
  ): Promise<{
    totalExpenses: number;
    approvedExpenses: number;
    pendingExpenses: number;
    rejectedExpenses: number;
    breakdown: Array<{ group: string; amount: number; count: number }>;
    topMerchants: Array<{ merchant: string; amount: number; count: number }>;
    complianceRate: number;
  }> {
    // Get expense summary
    const expenseData = await db.select({
      total: sum(expenses.amount),
      approved: sum(sql`CASE WHEN ${expenses.approval_status} = 'approved' THEN ${expenses.amount} ELSE 0 END`),
      pending: sum(sql`CASE WHEN ${expenses.approval_status} = 'pending' THEN ${expenses.amount} ELSE 0 END`),
      rejected: sum(sql`CASE WHEN ${expenses.approval_status} = 'rejected' THEN ${expenses.amount} ELSE 0 END`),
      totalCount: sql<number>`COUNT(*)`,
      compliantCount: sql<number>`COUNT(CASE WHEN ${expenses.policy_violations} IS NULL THEN 1 END)`
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.organization_id, organizationId),
        gte(expenses.transaction_date, startDate),
        lte(expenses.transaction_date, endDate)
      )
    );

    // Get breakdown by group
    let breakdownQuery;
    switch (groupBy) {
      case 'category':
        breakdownQuery = db.select({
          group: expenses.expense_category,
          amount: sum(expenses.amount),
          count: sql<number>`COUNT(*)`
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organization_id, organizationId),
            gte(expenses.transaction_date, startDate),
            lte(expenses.transaction_date, endDate)
          )
        )
        .groupBy(expenses.expense_category);
        break;
      // Add other groupBy cases as needed
    }

    const breakdown = await breakdownQuery;

    // Get top merchants
    const topMerchants = await db.select({
      merchant: expenses.merchant_name,
      amount: sum(expenses.amount),
      count: sql<number>`COUNT(*)`
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.organization_id, organizationId),
        gte(expenses.transaction_date, startDate),
        lte(expenses.transaction_date, endDate)
      )
    )
    .groupBy(expenses.merchant_name)
    .orderBy(desc(sum(expenses.amount)))
    .limit(10);

    const data = expenseData[0];
    return {
      totalExpenses: parseInt(data.total || '0'),
      approvedExpenses: parseInt(data.approved || '0'),
      pendingExpenses: parseInt(data.pending || '0'),
      rejectedExpenses: parseInt(data.rejected || '0'),
      breakdown: breakdown.map(b => ({
        group: b.group,
        amount: parseInt(b.amount || '0'),
        count: parseInt(b.count || '0')
      })),
      topMerchants: topMerchants.map(m => ({
        merchant: m.merchant,
        amount: parseInt(m.amount || '0'),
        count: parseInt(m.count || '0')
      })),
      complianceRate: data.totalCount > 0 
        ? (data.compliantCount / data.totalCount) * 100 
        : 100
    };
  }

  // Process reimbursements
  async createReimbursement(
    organizationId: number,
    userId: number,
    expenseIds: number[]
  ): Promise<any> {
    // Get approved expenses
    const eligibleExpenses = await db.select()
      .from(expenses)
      .where(
        and(
          eq(expenses.organization_id, organizationId),
          eq(expenses.user_id, userId),
          inArray(expenses.id, expenseIds),
          eq(expenses.approval_status, 'approved'),
          eq(expenses.reimbursement_status, 'pending')
        )
      );

    if (eligibleExpenses.length === 0) {
      throw new Error('No eligible expenses for reimbursement');
    }

    const totalAmount = eligibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Create reimbursement record
    const [reimbursement] = await db.insert(reimbursements)
      .values({
        organization_id: organizationId,
        user_id: userId,
        total_amount: totalAmount,
        expense_ids: expenseIds,
        payment_status: 'pending',
        batch_id: `REIMB-${Date.now()}`
      })
      .returning();

    // Update expense statuses
    await db.update(expenses)
      .set({
        reimbursement_status: 'processing'
      })
      .where(inArray(expenses.id, expenseIds));

    return reimbursement;
  }

  // Check budget compliance
  async checkBudgetCompliance(
    organizationId: number,
    expenseData: {
      amount: number;
      category: string;
      department?: string;
      projectCode?: string;
      userId?: number;
    }
  ): Promise<{
    withinBudget: boolean;
    remainingBudget: number;
    budgetUtilization: number;
    willExceed: boolean;
  }> {
    // Find applicable budgets
    const applicableBudgets = await db.select()
      .from(budgets)
      .where(
        and(
          eq(budgets.organization_id, organizationId),
          eq(budgets.is_active, true),
          or(
            eq(budgets.expense_category, expenseData.category),
            expenseData.department ? eq(budgets.department, expenseData.department) : sql`true`,
            expenseData.projectCode ? eq(budgets.project_code, expenseData.projectCode) : sql`true`
          )
        )
      );

    if (applicableBudgets.length === 0) {
      return {
        withinBudget: true,
        remainingBudget: 0,
        budgetUtilization: 0,
        willExceed: false
      };
    }

    // Check each budget
    const budget = applicableBudgets[0]; // Use most specific budget
    const willExceed = (budget.spent_amount + expenseData.amount) > budget.total_budget;
    const remaining = budget.remaining_amount - expenseData.amount;
    const utilization = ((budget.spent_amount + expenseData.amount) / budget.total_budget) * 100;

    return {
      withinBudget: !willExceed,
      remainingBudget: Math.max(0, remaining),
      budgetUtilization: Math.min(100, utilization),
      willExceed
    };
  }

  // Cleanup
  async cleanup() {
    if (this.tessaractWorker) {
      await this.tessaractWorker.terminate();
    }
  }
}

export const expenseManagementService = new ExpenseManagementService();