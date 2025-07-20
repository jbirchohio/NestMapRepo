import { Router } from 'express';
import { z } from 'zod';
import { secureAuth } from '../middleware/secureAuth';
import { organizationScoping } from '../middleware/organizationScoping';

const router = Router();

// Validation schema for onboarding feedback
const onboardingFeedbackSchema = z.object({
  setupEase: z.number().min(1).max(5),
  missingFeatures: z.string().optional(),
  readyForPilot: z.enum(['yes', 'no', 'maybe']),
  additionalComments: z.string().optional(),
  wouldRecommend: z.boolean(),
  mostHelpfulFeature: z.string().optional(),
  improvementSuggestions: z.string().optional(),
  role: z.enum(['admin', 'travel_manager', 'traveler']),
  onboardingFlow: z.object({
    completedSteps: z.number(),
    totalSteps: z.number(),
    isComplete: z.boolean(),
  }),
  timestamp: z.string(),
});

// Analytics event schema
const analyticsEventSchema = z.object({
  event: z.string(),
  userId: z.string().optional(),
  organizationId: z.number().optional(),
  properties: z.record(z.any()).optional(),
  timestamp: z.string(),
});

/**
 * POST /api/onboarding-feedback
 * Submit onboarding feedback
 */
router.post('/', secureAuth, organizationScoping, async (req, res) => {
  try {
    const validatedData = onboardingFeedbackSchema.parse(req.body);
    const { organizationId, userId } = req.context;

    // In a real implementation, you would save this to your database
    const feedbackRecord = {
      id: Date.now().toString(),
      userId,
      organizationId,
      ...validatedData,
      submittedAt: new Date().toISOString(),
    };

    // Log the feedback for analytics
    console.log('Onboarding Feedback Received:', {
      userId,
      organizationId,
      role: validatedData.role,
      setupEase: validatedData.setupEase,
      readyForPilot: validatedData.readyForPilot,
      wouldRecommend: validatedData.wouldRecommend,
      completedSteps: validatedData.onboardingFlow.completedSteps,
      totalSteps: validatedData.onboardingFlow.totalSteps,
      isComplete: validatedData.onboardingFlow.isComplete,
    });

    // In production, you might want to:
    // 1. Save to database (PostgreSQL, MongoDB, etc.)
    // 2. Send to analytics service (Segment, Mixpanel, etc.)
    // 3. Trigger follow-up actions based on feedback
    // 4. Send to customer success team for low ratings

    // Example database save (commented out):
    /*
    const db = await getDbConnection();
    await db.insert(onboardingFeedback).values({
      userId,
      organizationId,
      setupEase: validatedData.setupEase,
      missingFeatures: validatedData.missingFeatures,
      readyForPilot: validatedData.readyForPilot,
      additionalComments: validatedData.additionalComments,
      wouldRecommend: validatedData.wouldRecommend,
      mostHelpfulFeature: validatedData.mostHelpfulFeature,
      improvementSuggestions: validatedData.improvementSuggestions,
      role: validatedData.role,
      completedSteps: validatedData.onboardingFlow.completedSteps,
      totalSteps: validatedData.onboardingFlow.totalSteps,
      isComplete: validatedData.onboardingFlow.isComplete,
      submittedAt: new Date(),
    });
    */

    // Example analytics tracking (commented out):
    /*
    await analytics.track('onboarding_feedback_submitted', {
      userId,
      organizationId,
      setupEase: validatedData.setupEase,
      readyForPilot: validatedData.readyForPilot,
      wouldRecommend: validatedData.wouldRecommend,
      role: validatedData.role,
      completionRate: validatedData.onboardingFlow.completedSteps / validatedData.onboardingFlow.totalSteps,
    });
    */

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackRecord.id,
    });

  } catch (error) {
    console.error('Error submitting onboarding feedback:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
});

/**
 * POST /api/onboarding-feedback/analytics
 * Track onboarding analytics events
 */
router.post('/analytics', secureAuth, organizationScoping, async (req, res) => {
  try {
    const validatedData = analyticsEventSchema.parse(req.body);
    const { organizationId, userId } = req.context;

    // Log analytics event
    console.log('Onboarding Analytics Event:', {
      event: validatedData.event,
      userId: userId || validatedData.userId,
      organizationId: organizationId || validatedData.organizationId,
      properties: validatedData.properties,
      timestamp: validatedData.timestamp,
    });

    // In production, send to your analytics service:
    /*
    await analytics.track(validatedData.event, {
      userId: userId || validatedData.userId,
      organizationId: organizationId || validatedData.organizationId,
      ...validatedData.properties,
    });
    */

    res.status(200).json({
      success: true,
      message: 'Analytics event tracked',
    });

  } catch (error) {
    console.error('Error tracking analytics event:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid analytics data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to track analytics event',
    });
  }
});

/**
 * GET /api/onboarding-feedback/status
 * Get onboarding status for current user
 */
router.get('/status', secureAuth, organizationScoping, async (req, res) => {
  try {
    const { organizationId, userId } = req.context;

    // In a real implementation, you would query your database
    // For now, return mock status
    const onboardingStatus = {
      userId,
      organizationId,
      hasCompletedOnboarding: false, // Check from database
      role: null, // Get from user profile or onboarding record
      currentStep: null,
      completedSteps: 0,
      totalSteps: 0,
      lastActivity: null,
    };

    res.json({
      success: true,
      data: onboardingStatus,
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding status',
    });
  }
});

/**
 * PUT /api/onboarding-feedback/status
 * Update onboarding status
 */
router.put('/status', secureAuth, organizationScoping, async (req, res) => {
  try {
    const updateSchema = z.object({
      role: z.enum(['admin', 'travel_manager', 'traveler']).optional(),
      currentStep: z.string().optional(),
      completedSteps: z.number().optional(),
      totalSteps: z.number().optional(),
      isComplete: z.boolean().optional(),
    });

    const validatedData = updateSchema.parse(req.body);
    const { organizationId, userId } = req.context;

    // In a real implementation, update the database
    console.log('Updating onboarding status:', {
      userId,
      organizationId,
      ...validatedData,
    });

    res.json({
      success: true,
      message: 'Onboarding status updated',
    });

  } catch (error) {
    console.error('Error updating onboarding status:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding status',
    });
  }
});

export default router;
