import { db } from '../db';
import { 
  travelPolicies, 
  policyViolations, 
  approvalRequests,
  InsertTravelPolicy, 
  InsertPolicyViolation,
  InsertApprovalRequest,
  TravelPolicy,
  PolicyViolation
} from '@shared/schema';
import { eq, and, or, sql, inArray, desc } from 'drizzle-orm';

export class TravelPolicyService {
  // Create a new travel policy
  async createPolicy(
    organizationId: number, 
    policyData: Omit<InsertTravelPolicy, 'organization_id'>
  ): Promise<TravelPolicy> {
    const [policy] = await db.insert(travelPolicies)
      .values({
        ...policyData,
        organization_id: organizationId
      })
      .returning();
    
    return policy;
  }

  // Get active policies for a user
  async getUserPolicies(
    organizationId: number, 
    userId: number, 
    userRole: string, 
    department?: string
  ): Promise<TravelPolicy[]> {
    const policies = await db.select()
      .from(travelPolicies)
      .where(
        and(
          eq(travelPolicies.organization_id, organizationId),
          eq(travelPolicies.is_active, true),
          or(
            eq(travelPolicies.applies_to, 'all'),
            and(
              eq(travelPolicies.applies_to, 'roles'),
              sql`${travelPolicies.target_roles}::jsonb ? ${userRole}`
            ),
            and(
              eq(travelPolicies.applies_to, 'users'),
              sql`${travelPolicies.target_users}::jsonb @> ${JSON.stringify([userId])}`
            ),
            and(
              eq(travelPolicies.applies_to, 'departments'),
              department ? sql`${travelPolicies.target_departments}::jsonb ? ${department}` : sql`false`
            )
          )
        )
      );
    
    return policies;
  }

  // Check if a booking/expense violates policies
  async checkPolicyCompliance(
    organizationId: number,
    userId: number,
    checkData: {
      type: 'flight' | 'hotel' | 'meal' | 'ground_transport' | 'expense';
      amount: number; // in cents
      details: Record<string, any>;
    }
  ): Promise<{
    compliant: boolean;
    violations: Array<{
      policyId: number;
      policyName: string;
      violationType: string;
      severity: string;
      details: any;
    }>;
    requiresApproval: boolean;
  }> {
    const userPolicies = await this.getUserPolicies(
      organizationId, 
      userId, 
      checkData.details.userRole || 'user',
      checkData.details.department
    );

    const violations: Array<{
      policyId: number;
      policyName: string;
      violationType: string;
      severity: string;
      details: any;
    }> = [];
    
    let requiresApproval = false;

    for (const policy of userPolicies) {
      // Check flight policies
      if (checkData.type === 'flight') {
        const isDomestic = checkData.details.isDomestic;
        const flightClass = checkData.details.class;
        const priceLimit = isDomestic 
          ? policy.flight_price_limit_domestic 
          : policy.flight_price_limit_international;
        const allowedClass = isDomestic
          ? policy.flight_class_domestic
          : policy.flight_class_international;

        // Check class compliance
        if (allowedClass && !this.isClassCompliant(flightClass, allowedClass)) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'flight_class',
            severity: 'high',
            details: {
              rule: `Flight class must be ${allowedClass} or lower`,
              expected: allowedClass,
              actual: flightClass
            }
          });
        }

        // Check price limit
        if (priceLimit && checkData.amount > priceLimit) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'price_limit',
            severity: 'medium',
            details: {
              rule: `Flight price exceeds limit`,
              expected: priceLimit,
              actual: checkData.amount,
              difference: checkData.amount - priceLimit
            }
          });
        }

        // Check booking window
        if (policy.flight_booking_window && checkData.details.daysInAdvance < policy.flight_booking_window) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'booking_window',
            severity: 'low',
            details: {
              rule: `Must book ${policy.flight_booking_window} days in advance`,
              expected: policy.flight_booking_window,
              actual: checkData.details.daysInAdvance
            }
          });
        }

        // Check preferred airlines
        if (policy.preferred_airlines?.length && 
            !policy.preferred_airlines.includes(checkData.details.airline)) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'preferred_vendor',
            severity: 'low',
            details: {
              rule: 'Must use preferred airline',
              expected: policy.preferred_airlines,
              actual: checkData.details.airline
            }
          });
        }
      }

      // Check hotel policies
      if (checkData.type === 'hotel') {
        const isDomestic = checkData.details.isDomestic;
        const priceLimit = isDomestic 
          ? policy.hotel_price_limit_domestic 
          : policy.hotel_price_limit_international;
        const starRating = checkData.details.starRating;

        // Check star rating
        if (policy.hotel_star_rating_max && starRating > policy.hotel_star_rating_max) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'hotel_rating',
            severity: 'medium',
            details: {
              rule: `Hotel rating must be ${policy.hotel_star_rating_max} stars or less`,
              expected: policy.hotel_star_rating_max,
              actual: starRating
            }
          });
        }

        // Check price limit (per night)
        if (priceLimit && checkData.amount > priceLimit) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'price_limit',
            severity: 'medium',
            details: {
              rule: `Hotel price exceeds nightly limit`,
              expected: priceLimit,
              actual: checkData.amount,
              difference: checkData.amount - priceLimit
            }
          });
        }
      }

      // Check meal policies
      if (checkData.type === 'meal') {
        const mealType = checkData.details.mealType; // breakfast, lunch, dinner
        let limit = 0;

        switch (mealType) {
          case 'breakfast':
            limit = policy.breakfast_limit || 0;
            break;
          case 'lunch':
            limit = policy.lunch_limit || 0;
            break;
          case 'dinner':
            limit = policy.dinner_limit || 0;
            break;
        }

        if (limit && checkData.amount > limit) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'meal_limit',
            severity: 'low',
            details: {
              rule: `${mealType} expense exceeds limit`,
              expected: limit,
              actual: checkData.amount,
              difference: checkData.amount - limit
            }
          });
        }
      }

      // Check if pre-approval is required
      if (policy.requires_pre_approval && !checkData.details.preApproved) {
        requiresApproval = true;
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          violationType: 'missing_approval',
          severity: 'critical',
          details: {
            rule: 'Pre-approval required',
            expected: 'pre-approved',
            actual: 'not approved'
          }
        });
      }

      // Check time restrictions
      if (checkData.type === 'flight' || checkData.type === 'hotel') {
        const travelDate = new Date(checkData.details.travelDate);
        const isWeekend = travelDate.getDay() === 0 || travelDate.getDay() === 6;
        
        if (!policy.weekend_travel_allowed && isWeekend) {
          violations.push({
            policyId: policy.id,
            policyName: policy.name,
            violationType: 'weekend_travel',
            severity: 'medium',
            details: {
              rule: 'Weekend travel not allowed',
              expected: 'weekday',
              actual: 'weekend'
            }
          });
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      requiresApproval: requiresApproval || violations.some(v => v.severity === 'high' || v.severity === 'critical')
    };
  }

  // Record a policy violation
  async recordViolation(
    violationData: InsertPolicyViolation
  ): Promise<PolicyViolation> {
    const [violation] = await db.insert(policyViolations)
      .values(violationData)
      .returning();
    
    return violation;
  }

  // Create approval request for policy violation
  async createApprovalRequest(
    organizationId: number,
    requestData: {
      requesterId: number;
      entityType: 'trip' | 'expense' | 'booking';
      entityId: number;
      violations: Array<any>;
      businessJustification?: string;
    }
  ): Promise<InsertApprovalRequest> {
    // Find appropriate approver based on policy
    const approverId = await this.findApprover(organizationId, requestData.requesterId);

    const [request] = await db.insert(approvalRequests)
      .values({
        organizationId,
        requesterId: requestData.requesterId,
        approverId,
        entityType: requestData.entityType,
        entityId: requestData.entityId,
        requestType: 'policy_override',
        currentData: { violations: requestData.violations },
        proposedData: { action: 'approve_with_violations' },
        businessJustification: requestData.businessJustification,
        priority: this.calculatePriority(requestData.violations),
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      })
      .returning();

    return request;
  }

  // Helper: Check if flight class is compliant
  private isClassCompliant(actualClass: string, allowedClass: string | null): boolean {
    if (!allowedClass) return true;
    const classHierarchy = ['economy', 'premium_economy', 'business', 'first'];
    const actualIndex = classHierarchy.indexOf(actualClass);
    const allowedIndex = classHierarchy.indexOf(allowedClass);
    
    return actualIndex <= allowedIndex;
  }

  // Helper: Find approver for policy violations
  private async findApprover(organizationId: number, requesterId: number): Promise<number | null> {
    // Logic to find manager or designated approver
    // This would typically look up the user's manager or a designated travel approver
    // For now, return null (will be assigned later)
    return null;
  }

  // Helper: Calculate priority based on violations
  private calculatePriority(violations: Array<any>): string {
    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');
    
    if (hasCritical) return 'urgent';
    if (hasHigh) return 'high';
    return 'normal';
  }

  // Get policy violation history
  async getViolationHistory(
    organizationId: number,
    filters?: {
      userId?: number;
      policyId?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PolicyViolation[]> {
    const conditions = [eq(policyViolations.organization_id, organizationId)];

    if (filters?.userId) {
      conditions.push(eq(policyViolations.user_id, filters.userId));
    }
    if (filters?.policyId) {
      conditions.push(eq(policyViolations.policy_id, filters.policyId));
    }
    if (filters?.status) {
      conditions.push(eq(policyViolations.status, filters.status));
    }

    const violations = await db.select()
      .from(policyViolations)
      .where(and(...conditions))
      .orderBy(desc(policyViolations.created_at));
    return violations;
  }

  // Approve or reject a policy violation
  async processViolation(
    violationId: number,
    decision: {
      status: 'approved' | 'rejected';
      approvedBy: number;
      notes?: string;
    }
  ): Promise<PolicyViolation> {
    const [updated] = await db.update(policyViolations)
      .set({
        status: decision.status,
        approved_by: decision.approvedBy,
        approval_notes: decision.notes,
        resolved_at: new Date()
      })
      .where(eq(policyViolations.id, violationId))
      .returning();

    return updated;
  }

  // Get policy compliance analytics
  async getComplianceAnalytics(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalBookings: number;
    compliantBookings: number;
    complianceRate: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    topViolatedPolicies: Array<{ policyName: string; violations: number }>;
    savingsFromCompliance: number;
  }> {
    // This would aggregate violation data to provide compliance insights
    // Implementation would involve complex queries joining violations, bookings, and policies
    
    // Placeholder return
    return {
      totalBookings: 0,
      compliantBookings: 0,
      complianceRate: 0,
      violationsByType: {},
      violationsBySeverity: {},
      topViolatedPolicies: [],
      savingsFromCompliance: 0
    };
  }
}

export const travelPolicyService = new TravelPolicyService();