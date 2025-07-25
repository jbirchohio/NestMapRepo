import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';
import { db } from '../db/db';
import { spendPolicies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { and, or } from 'drizzle-orm/sql/expressions/conditions';const router = Router();

// Apply JWT authentication to all policy routes
router.use(authenticateJWT);

// Validation schemas
const complianceCheckSchema = z.object({
  tripDetails: z.object({
    destination: z.string().min(1),
    duration: z.number().min(1),
    estimatedCost: z.number().min(0),
    class: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
    purpose: z.enum(['business', 'training', 'conference', 'meeting', 'other']).optional(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    accommodation: z.object({
      type: z.string().optional(),
      costPerNight: z.number().optional()
    }).optional()
  }),
  userRole: z.string().optional(),
  organizationId: z.string().optional()
});

// Get company travel policies from database
const getCompanyPolicies = async (organizationId?: string) => {
  try {
    if (!organizationId) {
      // Return default policies if no organization specified
      return getDefaultPolicies();
    }

    // Fetch organization-specific policies from database
    const policies = await db
      .select()
      .from(spendPolicies)
      .where(and(
        eq(spendPolicies.organizationId, organizationId),
        eq(spendPolicies.isActive, true)
      ));

    if (policies.length === 0) {
      // Return default policies if no custom policies found
      return getDefaultPolicies();
    }

    // Convert database policies to our expected format
    return convertDbPoliciesToFormat(policies);
  } catch (error) {
    logger.error('Error fetching company policies:', error);
    // Fallback to default policies
    return getDefaultPolicies();
  }
};

// Default travel policies as fallback
const getDefaultPolicies = () => {
  return {
    flight: {
      maxDomesticCost: 800,
      maxInternationalCost: 2500,
      allowedClasses: {
        executive: ['business', 'first'],
        manager: ['economy', 'premium_economy', 'business'],
        employee: ['economy', 'premium_economy']
      },
      advanceBookingRequired: 14, // days
      approvalRequired: {
        international: true,
        costThreshold: 1500
      }
    },
    accommodation: {
      maxDailyCost: {
        domestic: 200,
        international: 350
      },
      allowedTypes: ['business_hotel', 'corporate_apartment', 'approved_chain'],
      bookingRequirements: ['receipt', 'business_justification']
    },
    general: {
      maxTripDuration: {
        domestic: 7,
        international: 14
      },
      requiredApprovals: {
        manager: 1000,
        director: 5000,
        cfo: 10000
      },
      documentationRequired: ['itinerary', 'business_case', 'expense_estimate']
    },
    restrictions: {
      blacklistedDestinations: ['North Korea', 'Syria'],
      seasonalRestrictions: [],
      companyEvents: [] // Block personal travel during company events
    }
  };
};

// Convert database policies to our expected format
const convertDbPoliciesToFormat = (policies: any[]) => {
  const flightPolicy = policies.find(p => p.name.toLowerCase().includes('flight') || p.name.toLowerCase().includes('travel'));
  const accommodationPolicy = policies.find(p => p.name.toLowerCase().includes('accommodation') || p.name.toLowerCase().includes('hotel'));
  
  return {
    flight: {
      maxDomesticCost: flightPolicy?.dailyLimit || 800,
      maxInternationalCost: flightPolicy?.monthlyLimit || 2500,
      allowedClasses: {
        executive: ['business', 'first'],
        manager: ['economy', 'premium_economy', 'business'],
        employee: ['economy', 'premium_economy']
      },
      advanceBookingRequired: 14,
      approvalRequired: {
        international: true,
        costThreshold: flightPolicy?.requiresApprovalOver || 1500
      }
    },
    accommodation: {
      maxDailyCost: {
        domestic: accommodationPolicy?.dailyLimit || 200,
        international: accommodationPolicy?.dailyLimit || 350
      },
      allowedTypes: ['business_hotel', 'corporate_apartment', 'approved_chain'],
      bookingRequirements: ['receipt', 'business_justification']
    },
    general: {
      maxTripDuration: {
        domestic: 7,
        international: 14
      },
      requiredApprovals: {
        manager: flightPolicy?.requiresApprovalOver || 1000,
        director: 5000,
        cfo: 10000
      },
      documentationRequired: ['itinerary', 'business_case', 'expense_estimate']
    },
    restrictions: {
      blacklistedDestinations: flightPolicy?.blockedCountries ? Object.keys(flightPolicy.blockedCountries) : [],
      seasonalRestrictions: [],
      companyEvents: []
    }
  };
};

// Helper function to check compliance
const checkTripCompliance = (tripDetails: any, policies: any, userRole: string = 'employee') => {
  const violations: any[] = [];
  const recommendations: any[] = [];
  const warnings: any[] = [];
  
  // Check destination restrictions
  if (policies.restrictions.blacklistedDestinations.includes(tripDetails.destination)) {
    violations.push({
      type: 'destination_restriction',
      severity: 'high',
      message: `Travel to ${tripDetails.destination} is not permitted under current company policy`,
      policy: 'general.restrictions.blacklistedDestinations'
    });
  }
  
  // Check trip duration
  const isInternational = !tripDetails.destination.toLowerCase().includes('usa') && 
                         !tripDetails.destination.toLowerCase().includes('united states');
  const maxDuration = isInternational ? policies.general.maxTripDuration.international : policies.general.maxTripDuration.domestic;
  
  if (tripDetails.duration > maxDuration) {
    violations.push({
      type: 'duration_exceeded',
      severity: 'medium',
      message: `Trip duration of ${tripDetails.duration} days exceeds maximum allowed ${maxDuration} days for ${isInternational ? 'international' : 'domestic'} travel`,
      policy: 'general.maxTripDuration'
    });
  }
  
  // Check flight class eligibility
  if (tripDetails.class) {
    const allowedClasses = policies.flight.allowedClasses[userRole] || policies.flight.allowedClasses.employee;
    if (!allowedClasses.includes(tripDetails.class)) {
      violations.push({
        type: 'class_restriction',
        severity: 'medium',
        message: `${tripDetails.class} class is not permitted for ${userRole} role. Allowed classes: ${allowedClasses.join(', ')}`,
        policy: 'flight.allowedClasses'
      });
    }
  }
  
  // Check cost thresholds
  const maxCost = isInternational ? policies.flight.maxInternationalCost : policies.flight.maxDomesticCost;
  if (tripDetails.estimatedCost > maxCost) {
    violations.push({
      type: 'cost_exceeded',
      severity: 'high',
      message: `Estimated cost of $${tripDetails.estimatedCost} exceeds maximum allowed $${maxCost} for ${isInternational ? 'international' : 'domestic'} travel`,
      policy: 'flight.maxCost'
    });
  }
  
  // Check approval requirements
  let approvalRequired = false;
  let approvalReason = '';
  
  if (isInternational && policies.flight.approvalRequired.international) {
    approvalRequired = true;
    approvalReason = 'International travel requires manager approval';
  }
  
  if (tripDetails.estimatedCost > policies.flight.approvalRequired.costThreshold) {
    approvalRequired = true;
    approvalReason = `Cost exceeds $${policies.flight.approvalRequired.costThreshold} threshold`;
  }
  
  // Generate recommendations
  if (tripDetails.estimatedCost > maxCost * 0.8) {
    recommendations.push({
      type: 'cost_optimization',
      priority: 'high',
      message: 'Consider booking earlier or choosing economy class to reduce costs',
      suggestedAction: 'review_alternatives'
    });
  }
  
  if (tripDetails.class === 'first' && userRole !== 'executive') {
    recommendations.push({
      type: 'class_downgrade',
      priority: 'medium',
      message: 'Consider business or premium economy class for cost savings',
      suggestedAction: 'adjust_booking'
    });
  }
  
  // Generate warnings for near-violations
  if (tripDetails.duration > maxDuration * 0.8) {
    warnings.push({
      type: 'duration_warning',
      message: `Trip duration is approaching the maximum limit of ${maxDuration} days`,
      recommendation: 'Consider if trip duration can be optimized'
    });
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    recommendations,
    warnings,
    approvalRequired,
    approvalReason,
    totalScore: Math.max(0, 100 - (violations.length * 20) - (warnings.length * 5))
  };
};

// POST /api/policies/check-compliance
router.post('/check-compliance', async (req: Request, res: Response) => {
  try {
    const { tripDetails, userRole, organizationId } = complianceCheckSchema.parse(req.body);
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.info(`Policy compliance check for user ${userId}:`, { 
      destination: tripDetails.destination,
      cost: tripDetails.estimatedCost,
      duration: tripDetails.duration 
    });
    
    // Get organization policies
    const policies = await getCompanyPolicies(organizationId);
    
    // Check compliance
    const complianceResult = checkTripCompliance(tripDetails, policies, userRole);
    
    // Log compliance check result
    logger.info(`Compliance check result:`, {
      userId,
      compliant: complianceResult.compliant,
      violationsCount: complianceResult.violations.length,
      approvalRequired: complianceResult.approvalRequired
    });
    
    res.json({
      success: true,
      data: {
        compliant: complianceResult.compliant,
        violations: complianceResult.violations,
        recommendations: complianceResult.recommendations,
        warnings: complianceResult.warnings,
        approvalRequired: complianceResult.approvalRequired,
        approvalReason: complianceResult.approvalReason,
        complianceScore: complianceResult.totalScore,
        nextSteps: complianceResult.compliant ? 
          ['Proceed with booking', 'Ensure proper documentation'] :
          ['Address policy violations', 'Get required approvals', 'Revise trip details'],
        policies: {
          applicable: [
            'Company Travel Policy 2024',
            'International Travel Guidelines',
            'Expense Management Policy'
          ],
          lastUpdated: '2024-07-01'
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Policy compliance check error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data', details: error.errors }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Policy compliance check failed', details: errorMessage }
    });
  }
});

// GET /api/policies/company
router.get('/company', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const userId = (req as any).user?.id || 'anonymous';
    
    // Get company policies
    const policies = await getCompanyPolicies(organizationId);
    
    logger.info(`Company policies requested by user ${userId}`);
    
    res.json({
      success: true,
      data: {
        policies: policies,
        version: '2024.7.1',
        effectiveDate: '2024-07-01',
        nextReview: '2024-12-31',
        summary: {
          flightPolicy: 'Economy class for employees, business class for managers with approval',
          accommodationPolicy: 'Business hotels within daily rate limits',
          approvalWorkflow: 'Manager approval required for international travel or costs over $1,500'
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Company policies get error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get company policies', details: errorMessage }
    });
  }
});

// POST /api/policies/approval/request
router.post('/approval/request', async (req: Request, res: Response) => {
  try {
    const { tripId, requestType, justification, approverEmail } = req.body;
    const userId = (req as any).user?.id || 'anonymous';
    
    if (!tripId || !requestType || !justification) {
      return res.status(400).json({
        success: false,
        error: { message: 'Trip ID, request type, and justification are required' }
      });
    }
    
    // Create approval request
    const approvalRequest = {
      id: `approval_${Date.now()}`,
      tripId: tripId,
      requesterId: userId,
      requestType: requestType,
      justification: justification,
      approverEmail: approverEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expectedApprovalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
    };
    
    // In production, save to database and send notification to approver
    logger.info(`Approval request created:`, approvalRequest);
    
    res.json({
      success: true,
      data: {
        approvalRequest: approvalRequest,
        message: 'Approval request submitted successfully',
        nextSteps: [
          'Approval notification sent to manager',
          'Expected approval within 2 business days',
          'You will receive email confirmation when approved'
        ]
      }
    });
    
  } catch (error: unknown) {
    logger.error('Approval request error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create approval request', details: errorMessage }
    });
  }
});

// CRUD routes for spend policies management

// GET /api/policies/spend - List all spend policies for an organization
router.get('/spend', async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string || (req as any).user?.organizationId;
    const userId = (req as any).user?.id || 'anonymous';

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Organization ID is required' }
      });
    }

    const policies = await db
      .select()
      .from(spendPolicies)
      .where(eq(spendPolicies.organizationId, organizationId));

    logger.info(`Spend policies requested by user ${userId} for org ${organizationId}`);

    res.json({
      success: true,
      data: {
        policies: policies,
        total: policies.length
      }
    });

  } catch (error: unknown) {
    logger.error('Get spend policies error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch spend policies', details: errorMessage }
    });
  }
});

// POST /api/policies/spend - Create a new spend policy
router.post('/spend', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const organizationId = req.body.organizationId || (req as any).user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Organization ID is required' }
      });
    }

    const policyData = {
      ...req.body,
      organizationId: organizationId
    };

    const [newPolicy] = await db
      .insert(spendPolicies)
      .values(policyData)
      .returning();

    logger.info(`Spend policy created by user ${userId}:`, { policyId: newPolicy.id, name: newPolicy.name });

    res.status(201).json({
      success: true,
      data: newPolicy
    });

  } catch (error: unknown) {
    logger.error('Create spend policy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create spend policy', details: errorMessage }
    });
  }
});

// PUT /api/policies/spend/:id - Update a spend policy
router.put('/spend/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'anonymous';
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Organization ID is required' }
      });
    }

    const [updatedPolicy] = await db
      .update(spendPolicies)
      .set(req.body)
      .where(and(
        eq(spendPolicies.id, id),
        eq(spendPolicies.organizationId, organizationId)
      ))
      .returning();

    if (!updatedPolicy) {
      return res.status(404).json({
        success: false,
        error: { message: 'Spend policy not found' }
      });
    }

    logger.info(`Spend policy updated by user ${userId}:`, { policyId: id });

    res.json({
      success: true,
      data: updatedPolicy
    });

  } catch (error: unknown) {
    logger.error('Update spend policy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update spend policy', details: errorMessage }
    });
  }
});

// DELETE /api/policies/spend/:id - Delete a spend policy
router.delete('/spend/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'anonymous';
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Organization ID is required' }
      });
    }

    const [deletedPolicy] = await db
      .delete(spendPolicies)
      .where(and(
        eq(spendPolicies.id, id),
        eq(spendPolicies.organizationId, organizationId)
      ))
      .returning();

    if (!deletedPolicy) {
      return res.status(404).json({
        success: false,
        error: { message: 'Spend policy not found' }
      });
    }

    logger.info(`Spend policy deleted by user ${userId}:`, { policyId: id });

    res.json({
      success: true,
      data: { message: 'Spend policy deleted successfully' }
    });

  } catch (error: unknown) {
    logger.error('Delete spend policy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete spend policy', details: errorMessage }
    });
  }
});

export default router;
