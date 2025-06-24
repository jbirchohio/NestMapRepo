import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import type { ParamsDictionary, Query as ParsedQs } from 'express-serve-static-core';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import { z } from 'zod';
import type { User } from '@shared/types/auth';
import OpenAI from 'openai';
import { db } from '../db/db.js';
import { trips, activities } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { findLocation } from '../aiLocations.js';
import { fetchEarthquakeAlerts } from '../disasterMonitor.js';
import { forecastBudget } from '../budgetForecast.js';
import { reconcilePreferences, generateConsensusItinerary } from '../groupReconciler.js';

// Types
interface TravelerPreference {
  id: string;
  userId: string;
  name: string;
  preferences: string[];
}

// Response type for budget forecast
interface BudgetForecastResponse {
  success: boolean;
  city: string;
  start_date: string;
  end_date: string;
  travelers: number;
  estimatedCost?: {
    low: number;
    high: number;
    currency: string;
  };
  breakdown?: {
    accommodation: number;
    food: number;
    activities: number;
    transportation: number;
  };
  currency: string;
  season: string;
  lastUpdated: string;
}

type UserRole = 'admin' | 'user' | 'editor';

interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  permissions?: string[];
  userId: string;
  jti: string;
  iat: number;
  exp: number;
}

// Import the extended Request type from organizationContext
import type { Request as ExpressRequest } from 'express';
import type { OrganizationRequest } from '../organizationContext.js';

// Custom request type that extends the organization-aware Request
interface CustomRequest extends ExpressRequest {
  user?: AuthUser;
  organizationId?: string | undefined;
  organizationFilter: (orgId: string | null) => boolean;
  organizationContext?: {
    id: string | null;
    canAccessOrganization: (orgId: string | null) => boolean;
    enforceOrganizationAccess: (orgId: string | null) => void;
  };
};

// Custom request type for authenticated routes
type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
    permissions?: string[];
  };
  organizationId?: string;
  organizationContext?: {
    id: string | null;
    canAccessOrganization: (orgId: string | null) => boolean;
    enforceOrganizationAccess: (orgId: string | null) => void;
    organizationId?: string;
    isWhiteLabelDomain?: boolean;
    timestamp?: string;
  };
  [key: string]: unknown;
};

// Helper function to create route handlers with proper typing
function createRouteHandler<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>(
  handler: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>) => Promise<Response> | void
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    try {
      await handler(req as Request<P, ResBody, ReqBody, ReqQuery>, res);
    } catch (error) {
      next(error);
    }
  };
}

// Type guard to check if user is authenticated
function isAuthenticatedRequest(req: Request): req is Request & { user: AuthUser } {
  return !!(req as any).user;
}

// Factory function to create authenticated route handlers with proper typing
function createAuthenticatedRouteHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
>(
  handler: (
    req: AuthenticatedRequest & { params: P; body: ReqBody; query: ReqQuery },
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void> | void
): RequestHandler[] {
  const middleware: RequestHandler[] = [
    validateJWT as unknown as RequestHandler,
    injectOrganizationContext as unknown as RequestHandler,
    validateOrganizationAccess as unknown as RequestHandler,
  ];

  const routeHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user || {};
      const authenticatedReq = {
        ...req,
        params: req.params as P,
        body: req.body as ReqBody,
        query: req.query as ReqQuery,
        user: {
          id: user.id || '',
          email: user.email || '',
          organizationId: user.organizationId || '',
          role: (user.role as UserRole) || 'user',
          permissions: user.permissions || [],
        },
        organizationId: user.organizationId,
        organizationContext: {
          id: user.organizationId || null,
          canAccessOrganization: (orgId: string | null) => orgId === user.organizationId,
          enforceOrganizationAccess: (orgId: string | null) => {
            if (orgId !== user.organizationId) {
              throw new Error('Unauthorized access to organization');
            }
          },
          organizationId: user.organizationId,
          isWhiteLabelDomain: false,
          timestamp: new Date().toISOString()
        },
      } as AuthenticatedRequest & { params: P; body: ReqBody; query: ReqQuery };

      await handler(authenticatedReq, res, next);
    } catch (error) {
      next(error);
    }
  };

  return [...middleware, routeHandler];
}

// Helper function to handle authenticated routes
function withAuth<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>(
  handler: (
    req: AuthenticatedRequest & { params: P; body: ReqBody; query: ReqQuery },
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void> | void
): RequestHandler[] {
  const middleware: RequestHandler[] = [
    validateJWT as unknown as RequestHandler,
    injectOrganizationContext as unknown as RequestHandler,
    validateOrganizationAccess as unknown as RequestHandler,
  ];

  const routeHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = {
        ...req,
        params: req.params as P,
        body: req.body as ReqBody,
        query: req.query as ReqQuery,
        user: (req as any).user,
        organizationId: (req as any).user?.organizationId,
      } as AuthenticatedRequest & { params: P; body: ReqBody; query: ReqQuery };

      await handler(authenticatedReq, res, next);
    } catch (error) {
      next(error);
    }
  };

  return [...middleware, routeHandler];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Initialize router
const router = Router();

// Apply middleware
router.use(validateJWT as any);
router.use(injectOrganizationContext as any);
router.use(validateOrganizationAccess as any);

// Validation schemas
const summarizeDaySchema = z.object({
    trip_id: z.number(),
    date: z.string()
});
const suggestFoodSchema = z.object({
    city: z.string(),
    cuisine_type: z.string().optional(),
    budget_range: z.enum(['budget', 'mid-range', 'luxury']).optional()
});
const optimizeItinerarySchema = z.object({
    trip_id: z.number(),
    preferences: z.object({
        travel_style: z.enum(['relaxed', 'packed', 'balanced']).optional(),
        interests: z.array(z.string()).optional()
    }).optional()
});
const findLocationSchema = z.object({
    description: z.string(),
    currentLocation: z
        .object({ latitude: z.number(), longitude: z.number() })
        .optional(),
    tripId: z.string().optional(),
});
const disasterMonitorSchema = z.object({
    city: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    radius_km: z.number().min(10).max(1000).optional()
});
const budgetForecastSchema = z.object({
    city: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    travelers: z.number().min(1).default(1)
});
const groupPreferenceSchema = z.object({
    preferences: z.array(z.object({
        userId: z.string(),
        preferences: z.array(z.string())
    }))
});
const groupItinerarySchema = z.object({
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    preferences: z.array(z.object({
        userId: z.string(),
        preferences: z.array(z.string())
    }))
});

// Summarize day response type
interface SummarizeDayResponse {
  success: boolean;
  data?: {
    summary: string;
    activitiesCount: number;
  };
  error?: string;
}

// Activity type for database query results
interface Activity {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date | null;
  location: string | null;
  created_at: Date;
  updated_at: Date | null;
}

// Summarize day response type
interface SummarizeDayResponse {
  success: boolean;
  data?: {
    summary: string;
    activitiesCount: number;
  };
  error?: string;
}

// Summarize day request parameters type
interface SummarizeDayParams extends Record<string, string> {
  tripId: string;
  date: string;
}

// Activity type for database query results
interface Activity {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// Summarize day handler function
const summarizeDayHandler = async (
  req: AuthenticatedRequest & { params: SummarizeDayParams },
  res: Response<SummarizeDayResponse>,
  next: NextFunction
): Promise<void> => {
  const { tripId, date } = req.params;
  
  try {
    // Find the trip to verify access
    const trip = await db.query.trips.findFirst({
      where: (trips, { and, eq }) => and(
        eq(trips.id, tripId),
        eq(trips.organizationId, req.user.organizationId)
      ),
    });

    if (!trip) {
      res.status(404).json({ 
        success: false, 
        error: "Trip not found or access denied" 
      });
      return;
    }

    // Get activities for the specified date using the correct column references
    const activities = await db.query.activities.findMany({
      where: (activities, { and, eq, sql }) => and(
        eq(activities.tripId, tripId),
        sql`DATE(${activities.date}) = ${date}`
      ),
      orderBy: (activities, { asc }) => [asc(activities.date), asc(activities.time)]
    });

    const dayActivities = activities.map(activity => ({
      id: activity.id,
      tripId: activity.tripId,
      title: activity.title,
      description: activity.notes || null,
      startTime: activity.date,
      endTime: null, // No end_time in schema, using null
      location: activity.locationName || null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    }));

    if (dayActivities.length === 0) {
      res.status(404).json({ 
        success: false, 
        error: "No activities found for this date" 
      });
      return;
    }

    // Format activities for the prompt
    const activitiesText = dayActivities
      .map(activity => `- ${new Date(activity.startTime).toLocaleTimeString()} ${activity.title}: ${activity.description || 'No description'}`)
      .join('\n');

    const prompt = `Summarize the following travel activities in a concise paragraph, highlighting key events and any important details. Focus on creating an engaging narrative of the day's experiences.\n\n${activitiesText}`;
    
    try {
      // Generate summary using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful travel assistant that creates engaging and concise summaries of travel activities." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const summary = completion.choices[0]?.message?.content?.trim() || 'No summary available';

      res.json({ 
        success: true, 
        data: { 
          summary,
          activitiesCount: dayActivities.length
        } 
      });
    } catch (error) {
      console.error('Error generating summary with OpenAI:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate summary. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error in summarizeDayHandler:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request'
    });
  }
};

// Register the route with proper middleware and handler
router.get<SummarizeDayParams, SummarizeDayResponse>(
  "/summarize-day/:tripId/:date",
  ...createAuthenticatedRouteHandler<SummarizeDayParams, SummarizeDayResponse>(
    async (req, res, next) => {
      try {
        await summarizeDayHandler(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  )
);

// Define response interface for budget forecast
interface BudgetForecastResponse {
    success: boolean;
    city: string;
    start_date: string;
    end_date: string;
    travelers: number;
    forecast: BudgetForecastResult;
    currency: string;
    season: string;
    lastUpdated: string;
    message?: string;
    error?: string;
}

interface BudgetForecastResult {
    dailyAverage: number;
    predictedTotal: number;
    dataPoints: number;
    success?: boolean;  // Made optional to match the actual usage
}

interface BudgetForecastRequest {
    city: string;
    start_date: string;
    end_date: string;
    travelers: number;
}

// POST /api/ai/budget-forecast - Get AI budget forecast
router.post<ParamsDictionary, BudgetForecastResponse, BudgetForecastRequest>(
  "/budget-forecast",
  validateJWT as unknown as RequestHandler,
  injectOrganizationContext as RequestHandler,
  validateOrganizationAccess as RequestHandler,
  withAuth<ParamsDictionary, BudgetForecastResponse, BudgetForecastRequest, ParsedQs>(
    async (req: AuthenticatedRequest & { body: BudgetForecastRequest }, res: Response<BudgetForecastResponse>, next: NextFunction) => {
      if (!req.user) {
        const unauthorizedResponse: BudgetForecastResponse = {
          success: false,
          error: "Unauthorized",
          city: "",
          start_date: "",
          end_date: "",
          travelers: 0,
          forecast: {
            dailyAverage: 0,
            predictedTotal: 0,
            dataPoints: 0,
            success: false
          },
          currency: 'USD',
          season: 'all',
          lastUpdated: new Date().toISOString()
        };
        res.status(401).json(unauthorizedResponse);
        return;
      }

      try {
        const validatedData = budgetForecastSchema.parse(req.body);
        const { city, start_date, end_date, travelers } = validatedData;
        
        const result = await forecastBudget(
          req.user.organizationId || '',
          city,
          start_date,
          end_date,
          travelers
        );

        const successResponse: BudgetForecastResponse = {
          success: true,
          city,
          start_date,
          end_date,
          travelers,
          forecast: {
            dailyAverage: result.dailyAverage,
            predictedTotal: result.predictedTotal,
            dataPoints: result.dataPoints,
            success: true
          },
          currency: 'USD',
          season: 'all',
          lastUpdated: new Date().toISOString()
        };

        res.json(successResponse);
      } catch (error) {
        console.error("AI budget-forecast error:", error);
        const errorResponse: BudgetForecastResponse = {
          success: false,
          error: "Failed to generate budget forecast",
          city: "",
          start_date: "",
          end_date: "",
          travelers: 0,
          forecast: {
            dailyAverage: 0,
            predictedTotal: 0,
            dataPoints: 0,
            success: false
          },
          currency: 'USD',
          season: 'all',
          lastUpdated: new Date().toISOString()
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

// Define response type for accommodation suggestions
interface AccommodationSuggestionResponse {
  success: boolean;
  suggestions?: any[];
  error?: string;
}

// POST /api/ai/suggest-accommodation - Get AI accommodation suggestions
router.post<ParamsDictionary, AccommodationSuggestionResponse, any, ParsedQs>(
  "/suggest-accommodation",
  validateJWT as unknown as RequestHandler,
  injectOrganizationContext as RequestHandler,
  validateOrganizationAccess as RequestHandler,
  withAuth<ParamsDictionary, AccommodationSuggestionResponse, any, ParsedQs>(
    async (req: AuthenticatedRequest & { body: any }, res: Response<AccommodationSuggestionResponse>, next: NextFunction) => {
      try {
        if (!req.user) {
          const errorResponse: AccommodationSuggestionResponse = {
            success: false, 
            error: "Authentication required"
          };
          res.status(401).json(errorResponse);
          return;
        }

        const { description, currentLocation } = findLocationSchema.parse(req.body);
      const context = currentLocation
        ? `${currentLocation.latitude},${currentLocation.longitude}`
        : undefined;
      const result = await findLocation(description, context);
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("AI suggest-accommodation error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to find accommodation"
      });
    }
  }
));

// POST /api/ai/optimize-itinerary - Optimize trip itinerary using AI
export interface OptimizeItineraryParams extends ParamsDictionary {
  tripId: string;
}

export interface OptimizeItineraryResponse {
  success: boolean;
  data?: {
    optimizedItinerary: string;
    originalActivities: any[];
  };
  error?: string;
}

// Optimize itinerary route
router.post<OptimizeItineraryParams, OptimizeItineraryResponse, any, ParsedQs>(
  "/optimize-itinerary/:tripId",
  ...createAuthenticatedRouteHandler<OptimizeItineraryParams, OptimizeItineraryResponse>(
    async (req: AuthenticatedRequest<OptimizeItineraryParams>, res: Response<OptimizeItineraryResponse>, next: NextFunction) => {
      try {
        const { tripId } = req.params;
        const validatedData = optimizeItinerarySchema.parse(req.body);
        const { preferences } = validatedData;

        // Get trip and verify access
        const [trip] = await db
          .select()
          .from(trips)
          .where(and(
            eq(trips.id, tripId), 
            eq(trips.organizationId, req.user.organizationId)
          ))
          .limit(1);
          
        if (!trip) {
          res.status(404).json({ success: false, error: "Trip not found" });
          return;
        }

        // Get all activities for the trip
        const tripActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.tripId, tripId));

        if (tripActivities.length === 0) {
          res.json({
            success: true,
            suggestions: ["Add some activities to your trip first to get optimization suggestions."]
          });
          return;
        }
        // Create optimization prompt with proper null checks
        const activitiesText = tripActivities
            .map(activity => {
              const date = activity.start_time ? new Date(activity.start_time).toISOString().split('T')[0] : 'No date';
              const location = activity.location || 'No location';
              const notes = activity.notes || 'No description';
              return `- ${activity.title} (${date}) at ${location}: ${notes}`;
            })
            .join('\n');
        const travelStyle = preferences?.travel_style || 'balanced';
        const interests = preferences?.interests?.join(', ') || 'general sightseeing';
        const prompt = `Analyze and optimize this travel itinerary:

Trip: ${trip.title}
Location: ${trip.city || trip.country || 'Unknown location'}
Duration: ${trip.startDate.toISOString().split('T')[0]} to ${trip.endDate.toISOString().split('T')[0]}
Travel Style: ${travelStyle}
Interests: ${interests}

Current Activities:
${activitiesText}

Provide optimization suggestions in JSON format:
{
  "optimization_score": "1-10 rating",
  "suggestions": [
    "Specific actionable suggestions for improving the itinerary"
  ],
  "timing_recommendations": [
    "Suggestions for better activity timing and sequencing"
  ],
  "missing_experiences": [
    "Recommended activities or experiences to add"
  ]
}`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
                {
                    role: "system",
                    content: "You are an expert travel planner. Analyze itineraries and provide optimization suggestions in valid JSON format."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000,
            temperature: 0.7,
        });
        const result = JSON.parse(response.choices[0].message.content || '{}');
        const responseData: OptimizeItineraryResponse = {
            success: true,
            data: {
                optimizedItinerary: result.optimizedItinerary || '',
                originalActivities: result.originalActivities || []
            },
            tripId,
            preferences
        };
        res.json(responseData);
    } catch (error) {
        console.error("AI optimize-itinerary error:", error);
        const errorResponse: OptimizeItineraryResponse = {
            success: false,
            error: "Failed to optimize itinerary",
            data: {
                optimizedItinerary: '',
                originalActivities: []
            }
        };
        res.status(500).json(errorResponse);
        return;
    }
router.post<{ city: string; interests: string[]; duration: number }, any, any, ParsedQs>(
  "/suggest-itinerary",
  ...createAuthenticatedRouteHandler<{ city: string; interests: string[]; duration: number }, any>(
    async (req, res, next) => {
        try {
            const { city, interests, duration } = req.body;
            
            if (!city) {
                return res.status(400).json({
                    success: false,
                    error: "City is required"
                });
            }
            
            const interestsText = Array.isArray(interests) ? interests.join(', ') : (interests || 'general sightseeing');
            const durationText = duration ? `${duration} days` : 'a few days';
            const prompt = `Suggest 6 excellent activities and attractions in ${city} for someone interested in ${interestsText}, planning to spend ${durationText} there.

For each activity, provide:
- Name/title
- Brief description (1-2 sentences)
- Best time to visit
- Approximate duration
- Activity type/category

Format as JSON:
{
  "activities": [
    {
      "title": "Activity Name",
      "description": "Brief description",
      "best_time": "Time recommendation",
      "duration": "Time needed",
      "category": "Activity type",
      "priority": "high/medium/low"
    }
  ]
}`;
            const response = await openai.chat.completions.create({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages: [
                    {
                        role: "system",
                        content: "You are a knowledgeable travel expert. Provide activity recommendations in valid JSON format."
                    },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1200,
                temperature: 0.8,
            });
            
            try {
                const content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error('No content in AI response');
                }
                const result = JSON.parse(content);
                return res.json({ 
                    success: true, 
                    city, 
                    interests: interestsText, 
                    duration, 
                    ...result 
                });
            } catch (error) {
                console.error('Failed to process activity suggestions:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to process activity suggestions',
                });
            }
        } catch (error) {
            console.error("AI suggest-activities error:", error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate activity suggestions',
            });
        }
    }
));

// Apply middleware and route handler
router.post<ParamsDictionary, TranslateResponse, TranslateRequest>(
  "/translate-content",
  ...createAuthenticatedRouteHandler<ParamsDictionary, TranslateResponse>(
    async (req: AuthenticatedRequest<ParamsDictionary, TranslateRequest>, res: Response<TranslateResponse>, next: NextFunction) => {
        try {
            const { text, target_language } = req.body;
            
            if (!text || !target_language) {
                return res.status(400).json({
                    success: false,
                    error: "Text and target_language are required"
                });
            }

            const prompt = `Translate the following text to ${target_language}. Maintain the original tone and meaning. If the text is already in ${target_language}, return it unchanged.

Text to translate:
${text}

Provide the translation in JSON format:
{
  "original_text": "${text}",
  "translated_text": "${text}",
  "target_language": "${target_language}"
}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional translator. Provide accurate translations in valid JSON format."
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 800,
                temperature: 0.3,
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
                throw new Error("No content in response");
            }

            const parsedResult = JSON.parse(result);
            
            res.json({
                success: true,
                data: {
                    original_text: parsedResult.original_text || text,
                    translated_text: parsedResult.translated_text || text,
                    target_language: parsedResult.target_language || target_language
                }
            });
                
        } catch (error) {
            console.error("Translation API error:", error);
            return next(error);
        }
    }
  )
);

// Define disaster monitor schema
const disasterMonitorSchema = z.object({
  city: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  radius_km: z.number().default(100)
});

// Disaster monitor route
router.post<ParamsDictionary, any, z.infer<typeof disasterMonitorSchema>>(
  '/disaster-monitor',
  ...createAuthenticatedRouteHandler<ParamsDictionary, any>(
    async (req, res, next) => {
      try {
        const { city, start_date, end_date, radius_km } = disasterMonitorSchema.parse(req.body);
        const alerts = await fetchEarthquakeAlerts(city, start_date, end_date, radius_km);
        res.json({ success: true, city, alerts });
      } catch (error) {
        console.error('Disaster monitor error:', error);
        next(error);
      }
    }
  )
);

// Define predict budget schema
const predictBudgetSchema = z.object({
  city: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  travelers: z.number().min(1)
});

// Predict budget route
router.post<ParamsDictionary, any, z.infer<typeof predictBudgetSchema>>(
  '/predict-budget',
  ...createAuthenticatedRouteHandler<ParamsDictionary, any>(
    async (req, res, next) => {
      try {
        const { city, start_date, end_date, travelers } = predictBudgetSchema.parse(req.body);
        const result = await forecastBudget(req.user.organizationId, city, start_date, end_date, travelers);
        res.json({ success: true, ...result });
      } catch (error) {
        console.error('Budget prediction error:', error);
        next(error);
      }
    }
  )
);

// Define group preference schema
const groupPreferenceSchema = z.object({
  preferences: z.array(z.record(z.any()))
});

// Reconcile preferences route
router.post<ParamsDictionary, any, z.infer<typeof groupPreferenceSchema>>(
  '/reconcile-preferences',
  ...createAuthenticatedRouteHandler<ParamsDictionary, any>(
    async (req, res, next) => {
      try {
        const { preferences } = groupPreferenceSchema.parse(req.body);
        const result = await reconcileGroupPreferences(preferences);
        res.json({ success: true, result });
      } catch (error) {
        console.error('Preference reconciliation error:', error);
        next(error);
      }
    }
  )
);

// Define group itinerary schema
const groupItinerarySchema = z.object({
  destination: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  preferences: z.array(z.record(z.any()))
});

// POST /api/ai/translate - Translate text using AI
interface TranslateRequest {
  text: string;
  targetLanguage: string;
}

interface TranslateResponse {
  success: boolean;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
  error?: string;
}

interface ItineraryRequest {
  destination: string;
  start_date: string;
  end_date: string;
  preferences: any[];
}

interface ItineraryResponse {
  success: boolean;
  priorityList: any[];
  conflicts: any[];

// Group itinerary route
router.post<ParamsDictionary, ItineraryResponse, ItineraryRequest, ParsedQs>(
  '/group-itinerary',
  ...createAuthenticatedRouteHandler<ParamsDictionary, ItineraryResponse, ItineraryRequest, ParsedQs>(
    async (req: AuthenticatedRequest<ParamsDictionary, ItineraryRequest, ParsedQs>, res: Response<ItineraryResponse>, next: NextFunction) => {
      try {
        const { destination, start_date, end_date, preferences } = req.body;
        
        if (!destination || !start_date || !end_date || !preferences) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: destination, start_date, end_date, and preferences are required',
            priorityList: [],
            conflicts: [],
            itinerary: null
          });
        }

        // Call the group reconciler to generate the itinerary
        const result = await reconcilePreferences(
          destination,
          new Date(start_date),
          new Date(end_date),
          preferences
        );

        if (!result) {
          throw new Error('Failed to generate itinerary');
        }

        const { priorityList = [], conflicts = [], itinerary = null } = result;

        res.json({ 
          success: true, 
          priorityList, 
          conflicts, 
          itinerary
        });
      } catch (error) {
        console.error('Group itinerary error:', error);
        next(error);
      }
    }
  )
);

export default router;
