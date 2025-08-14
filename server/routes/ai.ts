import { Router } from "express";
import { jwtAuthMiddleware } from "../middleware/jwtAuth";
import { z } from "zod";
import { aiRateLimit } from "../middleware/rateLimiting";
import { db } from "../db-connection";
import { trips, activities } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getOpenAIClient, OPENAI_MODEL } from '../services/openaiClient';
import { logger } from "../utils/logger";

// Use centralized OpenAI client
const openai = getOpenAIClient();

const router = Router();
router.use(jwtAuthMiddleware);
router.use(aiRateLimit); // Apply AI rate limiting to all AI endpoints

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

// POST /api/ai/summarize-day - Summarize a day's activities
router.post("/summarize-day", async (req, res) => {
  try {
    const validatedData = summarizeDaySchema.parse(req.body);
    const { trip_id, date } = validatedData;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Get trip and verify access
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip_id));

    if (!trip) {
      return res.status(404).json({ success: false, error: "Trip not found" });
    }

    // Get activities for the specific date using SQL date comparison
    const dayActivities = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.trip_id, trip_id)
        // Note: Date filtering would need SQL function for proper comparison
      ));

    if (dayActivities.length === 0) {
      return res.json({
        success: true,
        summary: "No activities planned for this day."
      });
    }

    // Create summary prompt
    const activitiesText = dayActivities
      .map(activity => `- ${activity.title}: ${activity.notes || 'No description'}`)
      .join('\n');

    const prompt = `Summarize this travel day concisely and professionally:

Date: ${date}
Location: ${trip.city || trip.country || 'Unknown location'}
Activities:
${activitiesText}

Provide a brief, engaging summary that highlights the key experiences and flow of the day. Keep it under 150 words.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL, // Using GPT-3.5 for 80% cost savings
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content;

    res.json({
      success: true,
      summary,
      activities_count: dayActivities.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate day summary"
    });
  }
});

// POST /api/ai/suggest-food - Get AI food recommendations
router.post("/suggest-food", async (req, res) => {
  try {
    const validatedData = suggestFoodSchema.parse(req.body);
    const { city, cuisine_type, budget_range } = validatedData;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Import cache service
    const { aiCache } = await import('../services/aiCacheService');

    // Check cache first
    const cacheKey = aiCache.generateKey('food', city, `${cuisine_type || 'any'}_${budget_range || 'any'}`);
    const cachedResult = aiCache.get(cacheKey);

    if (cachedResult) {
      return res.json(cachedResult);
    }

    const budgetText = budget_range === 'budget' ? 'affordable, budget-friendly' :
                     budget_range === 'mid-range' ? 'mid-range pricing' :
                     budget_range === 'luxury' ? 'high-end, luxury' : 'varied price ranges';

    const cuisineText = cuisine_type ? ` specializing in ${cuisine_type} cuisine` : '';

    const prompt = `Recommend 5 excellent restaurants in ${city}${cuisineText} with ${budgetText}.

For each restaurant, provide:
- Name
- Brief description (1-2 sentences)
- Signature dish or specialty
- Approximate price range

Format as JSON with this structure:
{
  "recommendations": [
    {
      "name": "Restaurant Name",
      "description": "Brief description",
      "specialty": "Signature dish",
      "price_range": "$ or $$ or $$$"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL, // Using GPT-3.5 for 80% cost savings
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable food and travel expert. Provide restaurant recommendations in valid JSON format."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const responseData = {
      success: true,
      city,
      cuisine_type,
      budget_range,
      ...result
    };

    // Cache for 3 days (restaurant data is relatively stable)
    aiCache.set(cacheKey, responseData, aiCache.DURATIONS.LOCATION_SEARCH);

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate food recommendations"
    });
  }
});

// POST /api/ai/optimize-itinerary - Optimize trip itinerary using AI
router.post("/optimize-itinerary", async (req, res) => {
  try {
    const validatedData = optimizeItinerarySchema.parse(req.body);
    const { trip_id, preferences } = validatedData;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Get trip and verify access
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip_id));

    if (!trip) {
      return res.status(404).json({ success: false, error: "Trip not found" });
    }

    // Get all activities for the trip
    const tripActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.trip_id, trip_id));

    if (tripActivities.length === 0) {
      return res.json({
        success: true,
        suggestions: ["Add some activities to your trip first to get optimization suggestions."]
      });
    }

    // Create optimization prompt with activity details including times
    const activitiesText = tripActivities
      .map(activity => `- ID: ${activity.id}, Title: "${activity.title}", Date: ${activity.date || 'No date'}, Time: ${activity.time || 'No time set'}, Location: ${activity.location_name}`)
      .join('\n');

    const travelStyle = preferences?.travel_style || 'balanced';
    const interests = preferences?.interests?.join(', ') || 'general sightseeing';

    const prompt = `Analyze and optimize this travel itinerary by suggesting better times for activities:

Trip: ${trip.title}
Location: ${trip.city || trip.country || 'Unknown location'}
Duration: ${trip.start_date} to ${trip.end_date}
Travel Style: ${travelStyle}
Interests: ${interests}

Current Activities:
${activitiesText}

Analyze the itinerary and suggest optimal times for each activity. Consider:
- Venue opening hours (museums usually open 10am, restaurants for lunch 12pm-2pm, dinner 6pm-9pm)
- Travel time between locations
- Natural flow of the day (breakfast early, sightseeing mid-day, dinner evening)
- Avoiding crowds (popular spots better early morning or late afternoon)

Return ONLY activities that need time changes. Use the exact activity ID from above.
For suggestedTime use 24-hour format like "09:00", "14:30", "18:00".

Provide specific time optimizations in JSON format:
{
  "optimizedActivities": [
    {
      "id": "exact numeric ID from the list above",
      "suggestedTime": "HH:MM in 24-hour format",
      "suggestedDay": 1,
      "reason": "Specific reason why this time is better"
    }
  ],
  "recommendations": [
    "Max 3 general recommendations for improving the itinerary"
  ],
  "optimization_score": "1-10 rating as a string",
  "missing_experiences": [
    "Max 2 recommended activities to add"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL, // Using GPT-3.5 for 80% cost savings
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

    // Ensure the response has the expected structure
    const formattedResult = {
      optimizedActivities: result.optimizedActivities || [],
      recommendations: result.recommendations || [],
      optimization_score: result.optimization_score || "5",
      missing_experiences: result.missing_experiences || []
    };

    res.json({
      success: true,
      trip_id,
      activities_count: tripActivities.length,
      ...formattedResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to optimize itinerary"
    });
  }
});

// POST /api/ai/chat - Conversational AI assistant for trip planning
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required"
      });
    }

    // Check if this looks like a trip creation request
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const isCreatingTrip = lastMessage.includes("create") ||
                          lastMessage.includes("plan") ||
                          lastMessage.includes("itinerary") ||
                          lastMessage.includes("weekend") ||
                          lastMessage.includes("going on a trip") ||
                          lastMessage.includes("going to") ||
                          lastMessage.includes("travel to") ||
                          lastMessage.includes("visiting") ||
                          lastMessage.includes("trip to") ||
                          (lastMessage.includes("budget") && lastMessage.includes("day")) ||
                          (lastMessage.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i) && 
                           lastMessage.match(/\d{1,2}(st|nd|rd|th)?/));

    // Add system prompt for trip planning context
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI travel assistant. Help users plan their trips by providing friendly, conversational responses.

${isCreatingTrip ? `IMPORTANT: The user wants to create a trip. 

FIRST, extract ALL trip details from their message:
- Dates: If provided, use them. If vague ("next week"), calculate actual dates
- Budget: If mentioned (e.g., "$200/day", "$3000 total"), respect it in your suggestions
- Group size: Number of adults, kids if mentioned
- Interests: Any specific things they want to do or see

BUDGET AWARENESS:
- If budget is mentioned, categorize activities as:
  - FREE: Parks, walking tours, beaches, hiking, window shopping
  - BUDGET ($): Street food, public transport, local markets, some museums
  - MODERATE ($$): Mid-range restaurants, paid attractions, guided tours
  - EXPENSIVE ($$$): Fine dining, premium experiences, private tours
- Mix free and paid activities to stay within budget
- For "$200/day for 2 adults", that's ~$100/person - focus on free/budget activities

Only proceed with trip creation if you have specific dates. You should:
1. Provide a brief, excited response about the trip (2-3 sentences max)
2. Include a JSON block at the end with trip details AND specific activities
3. DO NOT ask if they want anything else or if they want to create it - they already asked you to create it!
4. For longer trips (>4 days), generate AT LEAST 3-5 activities per day
5. If budget constraints exist, mention how you're staying within budget

Include this EXACT format at the end of your response:

<TRIP_JSON>
{
  "title": "Trip title here",
  "description": "Brief trip description",
  "startDate": "YYYY-MM-DD (actual date, e.g., '2025-03-15')",
  "endDate": "YYYY-MM-DD (actual date, e.g., '2025-03-20')",
  "city": "City name",
  "country": "Country name",
  "activities": [
    {
      "title": "Specific activity name (e.g., 'Visit Empire State Building')",
      "date": "YYYY-MM-DD (MUST be between startDate and endDate)",
      "time": "HH:MM (24-hour format, e.g., '10:00' or '14:30')",
      "locationName": "Exact location/address",
      "notes": "Brief description or tips"
    }
  ]
}
</TRIP_JSON>

CRITICAL DATE RULES:
- Today's date is ${new Date().toISOString().split('T')[0]}
- All dates MUST be in the future
- Activity dates MUST be between startDate and endDate
- Use proper YYYY-MM-DD format (e.g., '2025-03-15', not '2023-09-08')
- For "next weekend": Use the upcoming Saturday and Sunday dates
- Distribute activities evenly across the trip days

ACTIVITY GENERATION RULES:

Generate AT LEAST 3-4 activities for EACH day of the trip.
For a 13-day trip, that means 39-52 activities total.

IMPORTANT: The activities array should have 40+ items for a 13-day trip.

For each day, include:
- Morning activity (09:00-11:00)
- Lunch (12:00-13:30)  
- Afternoon activity (14:00-17:00)
- Dinner or evening activity (18:00-20:00)

Spread activities across ALL dates from startDate to endDate.
Use real, specific locations in the destination city.

Make dates start from the next Friday if not specified.` : 'Do not include any JSON blocks unless the user explicitly asks to create or plan a trip.'}

Keep your main response conversational and helpful.`
    };

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 4000  // Maximum tokens for GPT-3.5 to handle 50+ activities
    });

    const aiResponse = response.choices[0].message.content || "";

    // Extract trip JSON if present
    let tripSuggestion = null;
    const jsonMatch = aiResponse.match(/<TRIP_JSON>([\s\S]*?)<\/TRIP_JSON>/);
    if (jsonMatch) {
      try {
        tripSuggestion = JSON.parse(jsonMatch[1]);
        
        // Log for debugging
        logger.info(`AI generated trip with ${tripSuggestion.activities?.length || 0} activities for ${tripSuggestion.city} from ${tripSuggestion.startDate} to ${tripSuggestion.endDate}`);
        
        // Calculate expected activities
        const tripStart = new Date(tripSuggestion.startDate);
        const tripEnd = new Date(tripSuggestion.endDate);
        const tripDays = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const expectedActivities = tripDays * 3; // At least 3 per day
        
        logger.info(`Trip is ${tripDays} days, expecting at least ${expectedActivities} activities, got ${tripSuggestion.activities?.length || 0}`);
        // Validate dates
        const today = new Date();
        const startDate = new Date(tripSuggestion.startDate);
        const endDate = new Date(tripSuggestion.endDate);

        // If dates are in the past, adjust them to the future
        if (startDate < today) {
          const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
          const nextFriday = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
          const duration = endDate.getTime() - startDate.getTime();

          tripSuggestion.startDate = nextFriday.toISOString().split('T')[0];
          tripSuggestion.endDate = new Date(nextFriday.getTime() + duration).toISOString().split('T')[0];
        }

        // If we have activities, enrich them with geocoding
        if (tripSuggestion.activities && tripSuggestion.activities.length > 0) {
          const { geocodeLocation } = await import('../geocoding');

          // Geocode each activity location
          for (const activity of tripSuggestion.activities) {
            if (activity.locationName) {
              const coords = await geocodeLocation(activity.locationName, tripSuggestion.city, tripSuggestion.country);
              if (coords) {
                activity.latitude = coords.latitude;
                activity.longitude = coords.longitude;
              }
            }
          }
        }
      } catch (e) {
        tripSuggestion = null;
      }
    }

    // Remove the JSON block from the display message
    const displayMessage = aiResponse.replace(/<TRIP_JSON>[\s\S]*?<\/TRIP_JSON>/, '').trim();

    // If we have a tripSuggestion with activities AND the user has an account, 
    // optionally create the trip and activities automatically
    let createdTripId = null;
    if (tripSuggestion && tripSuggestion.activities && req.user) {
      // Note: Frontend will handle trip creation, but we can log this for debugging
      logger.info(`AI generated trip suggestion with ${tripSuggestion.activities.length} activities for user ${req.user.id}`);
    }

    res.json({
      success: true,
      message: displayMessage,
      tripSuggestion,
      createdTripId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/ai/suggest-activities - Get AI activity suggestions
router.post("/suggest-activities", async (req, res) => {
  try {
    const { city, interests, duration } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        error: "City is required"
      });
    }

    // Import cache service
    const { aiCache } = await import('../services/aiCacheService');

    // Check cache first
    const cacheKey = aiCache.generateKey('activities', city, `${interests || 'general'}_${duration || 'any'}`);
    const cachedResult = aiCache.get(cacheKey);

    if (cachedResult) {
      return res.json(cachedResult);
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
      model: OPENAI_MODEL, // Using GPT-3.5 for 80% cost savings
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

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const responseData = {
      success: true,
      city,
      interests: interestsText,
      duration,
      ...result
    };

    // Cache for 3 days (activity data is relatively stable)
    aiCache.set(cacheKey, responseData, aiCache.DURATIONS.LOCATION_SEARCH);

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate activity suggestions"
    });
  }
});

// POST /api/ai/generate-full-itinerary - Generate complete itinerary for existing trip
router.post("/generate-full-itinerary", async (req, res) => {
  try {
    const { trip_id } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!trip_id) {
      return res.status(400).json({
        success: false,
        error: "Trip ID is required"
      });
    }

    // Get trip details
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip_id));

    if (!trip || trip.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: "Trip not found or access denied" });
    }

    // Calculate trip duration
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    logger.info(`Generating full itinerary for ${tripDays}-day trip to ${trip.city}`);

    // Generate activities in batches of 3 days at a time
    const allActivities = [];
    const DAYS_PER_BATCH = 3;
    const visitedAttractions = new Set(); // Track unique attractions to avoid duplicates
    
    for (let dayIndex = 0; dayIndex < tripDays; dayIndex += DAYS_PER_BATCH) {
      const batchStart = dayIndex;
      const batchEnd = Math.min(dayIndex + DAYS_PER_BATCH - 1, tripDays - 1);
      
      const batchStartDate = new Date(startDate);
      batchStartDate.setDate(startDate.getDate() + batchStart);
      
      const batchEndDate = new Date(startDate);
      batchEndDate.setDate(startDate.getDate() + batchEnd);
      
      // Build list of already visited attractions
      const alreadyVisitedList = Array.from(visitedAttractions).join(', ');
      
      const batchPrompt = `Generate activities for days ${batchStart + 1}-${batchEnd + 1} of a trip to ${trip.city}, ${trip.country || 'Germany'}.
      
Dates: ${batchStartDate.toISOString().split('T')[0]} to ${batchEndDate.toISOString().split('T')[0]}
Budget: ${trip.budget || 'moderate'}
${alreadyVisitedList ? `\nIMPORTANT: DO NOT suggest these attractions again as they've already been planned: ${alreadyVisitedList}` : ''}
      
Generate EXACTLY 4 activities per day. For ${batchEnd - batchStart + 1} days, that's ${(batchEnd - batchStart + 1) * 4} activities total.
Each day should have unique attractions/activities (meals can repeat types but suggest different restaurants).

Return ONLY a JSON array of activities:
[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "title": "Activity name",
    "locationName": "Specific location in ${trip.city}",
    "notes": "Brief description",
    "tag": "food/culture/sightseeing/entertainment"
  }
]

Include breakfast, lunch, dinner, and one activity/attraction per day.`;

      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: batchPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 1500
        });

        const batchResult = JSON.parse(response.choices[0].message.content || "[]");
        const batchActivities = Array.isArray(batchResult) ? batchResult : (batchResult.activities || []);
        
        // Track non-meal activities to avoid duplicates
        for (const activity of batchActivities) {
          const activityTitle = activity.title?.toLowerCase() || '';
          const activityTag = activity.tag?.toLowerCase() || '';
          
          // Don't track meals/dining as they can have different restaurants
          if (!activityTag.includes('food') && 
              !activityTitle.includes('breakfast') && 
              !activityTitle.includes('lunch') && 
              !activityTitle.includes('dinner')) {
            visitedAttractions.add(activity.title);
          }
        }
        
        logger.info(`Generated ${batchActivities.length} activities for days ${batchStart + 1}-${batchEnd + 1}`);
        allActivities.push(...batchActivities);
      } catch (error) {
        logger.error(`Failed to generate activities for days ${batchStart + 1}-${batchEnd + 1}:`, error);
      }
    }

    // Geocode activities before saving
    const { geocodeLocation } = await import('../geocoding');
    
    for (const activity of allActivities) {
      let latitude = null;
      let longitude = null;
      
      // Try to geocode the activity location
      if (activity.locationName) {
        try {
          const coords = await geocodeLocation(
            activity.locationName, 
            trip.city, 
            trip.country || 'Germany'
          );
          
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
            logger.info(`Geocoded "${activity.title}" at "${activity.locationName}" to ${latitude}, ${longitude}`);
          } else {
            logger.warn(`Failed to geocode "${activity.locationName}" for activity "${activity.title}"`);
          }
        } catch (error) {
          logger.error(`Geocoding error for "${activity.locationName}":`, error);
        }
      }
      
      // Save activity with coordinates
      await db.insert(activities).values({
        trip_id,
        title: activity.title,
        date: activity.date,
        time: activity.time,
        location_name: activity.locationName,
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        notes: activity.notes,
        tag: activity.tag || 'activity',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    logger.info(`Created ${allActivities.length} activities for trip ${trip_id}`);

    res.json({
      success: true,
      message: `Generated ${allActivities.length} activities for your ${tripDays}-day trip`,
      activitiesCreated: allActivities.length,
      activities: allActivities
    });

  } catch (error) {
    logger.error('Error generating full itinerary:', error);
    res.status(500).json({
      success: false,
      error: "Failed to generate full itinerary"
    });
  }
});

// POST /api/ai/generate-weekend - Generate a weekend itinerary
router.post("/generate-weekend", async (req, res) => {
  try {
    const { trip_id, destination, duration = 3 } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!trip_id || !destination) {
      return res.status(400).json({
        success: false,
        error: "Trip ID and destination are required"
      });
    }

    // Get trip and verify access
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip_id));

    if (!trip || trip.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: "Trip not found or access denied" });
    }

    const prompt = `Create a perfect weekend itinerary for ${destination} (${duration} days).

Generate a fun, action-packed weekend trip with a mix of must-see attractions, great food spots, and local experiences.

Guidelines:
- Day 1 (Friday): Arrival day - start with afternoon/evening activities
- Day 2 (Saturday): Full day of activities from morning to night
- Day 3 (Sunday): Morning/afternoon activities before departure
- Include specific restaurant recommendations
- Mix tourist attractions with local favorites
- Consider realistic travel times between locations
- Include variety: sightseeing, food, culture, entertainment

Return SPECIFIC activities with REAL places in JSON format:
{
  "activities": [
    {
      "title": "Specific activity name (e.g., 'Visit Empire State Building')",
      "date": "Day 1, 2, or 3",
      "time": "HH:MM (24-hour format, e.g., '14:30')",
      "locationName": "FULL ADDRESS including street number, street name, city, state, zip",
      "locationAddress": "Alternative address format if available",
      "notes": "Brief description or tips",
      "tag": "food/sightseeing/culture/entertainment/nightlife",
      "latitude": null,
      "longitude": null
    }
  ]
}

CRITICAL LOCATION REQUIREMENTS:
- locationName MUST be a COMPLETE ADDRESS with street number and street name
- For restaurants/businesses: Include the full business name AND street address
- For landmarks: Include the official name AND street address
- For neighborhoods/areas: Include a specific intersection or landmark within it

GOOD Examples for ${destination}:
- "Hattie B's Hot Chicken, 112 19th Avenue South, Nashville, TN 37203"
- "Country Music Hall of Fame, 222 5th Avenue South, Nashville, TN 37203"
- "The Gulch at 11th Avenue South and Division Street, Nashville, TN"

BAD Examples (too vague for geocoding):
- "Hattie B's Hot Chicken" (missing address)
- "Downtown Nashville" (too general)
- "Local coffee shop" (not specific)

Include 4-6 activities per day with REAL, GEOCODABLE addresses for ${destination}.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert weekend trip planner. Create exciting, realistic weekend itineraries with specific places and optimal timing."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Calculate actual dates based on trip dates
    const startDate = new Date(trip.start_date);
    const activities = result.activities || [];

    // Map activities to actual dates
    const enrichedActivities = activities.map((activity: any, index: number) => {
      // Determine which day this activity is for
      let dayOffset = 0;
      if (activity.date?.includes('2')) dayOffset = 1;
      if (activity.date?.includes('3')) dayOffset = 2;
      
      const activityDate = new Date(startDate);
      activityDate.setDate(startDate.getDate() + dayOffset);

      return {
        ...activity,
        date: activityDate.toISOString().split('T')[0],
        trip_id,
        order: index
      };
    });

    // Geocode activities if we have the geocoding service
    try {
      const { geocodeLocation } = await import('../geocoding');
      const { generateDistributedCoordinates, getCityCenter } = await import('../services/coordinateGenerator');
      
      logger.info(`Starting geocoding for ${enrichedActivities.length} activities in ${destination}`);
      
      // Extract city and country from destination
      let city = destination;
      let country = '';
      
      // Check if destination includes country (e.g., "Sigmaringen, Germany")
      if (destination.includes(',')) {
        const parts = destination.split(',').map(p => p.trim());
        city = parts[0];
        country = parts[parts.length - 1];
      }
      
      // First, try to get the city center as a fallback
      let cityCenter = null;
      const cityCoords = await geocodeLocation(city, undefined, country);
      if (cityCoords) {
        cityCenter = {
          latitude: parseFloat(cityCoords.latitude),
          longitude: parseFloat(cityCoords.longitude)
        };
        logger.info(`City center for ${destination}: ${cityCenter.latitude}, ${cityCenter.longitude}`);
      } else {
        // Use predefined city center if available
        cityCenter = getCityCenter(destination);
        if (cityCenter) {
          logger.info(`Using predefined center for ${destination}: ${cityCenter.latitude}, ${cityCenter.longitude}`);
        }
      }
      
      // Try to geocode each activity
      let geocodingFailures = 0;
      for (const activity of enrichedActivities) {
        if (activity.locationName || activity.locationAddress) {
          // Try locationName first, then locationAddress as fallback
          const locationToGeocode = activity.locationName || activity.locationAddress;
          logger.info(`Geocoding "${activity.title}" at location: "${locationToGeocode}"`);
          
          const coords = await geocodeLocation(locationToGeocode, city, country);
          if (coords) {
            activity.latitude = coords.latitude;
            activity.longitude = coords.longitude;
            logger.info(`Successfully geocoded "${activity.title}" to ${coords.latitude}, ${coords.longitude}`);
          } else {
            geocodingFailures++;
            logger.warn(`Failed to geocode: "${locationToGeocode}" for ${destination}`);
          }
        } else {
          logger.warn(`Activity "${activity.title}" has no location to geocode`);
          geocodingFailures++;
        }
      }
      
      // If more than half of activities failed to geocode, use distributed coordinates
      if (geocodingFailures > enrichedActivities.length / 2 && cityCenter) {
        logger.warn(`High geocoding failure rate (${geocodingFailures}/${enrichedActivities.length}). Using distributed coordinates.`);
        const activitiesWithCoords = generateDistributedCoordinates(
          enrichedActivities,
          cityCenter,
          destination
        );
        
        // Update the enrichedActivities with generated coordinates
        for (let i = 0; i < enrichedActivities.length; i++) {
          if (activitiesWithCoords[i].latitude && activitiesWithCoords[i].longitude) {
            enrichedActivities[i].latitude = activitiesWithCoords[i].latitude;
            enrichedActivities[i].longitude = activitiesWithCoords[i].longitude;
          }
        }
      }
    } catch (e) {
      logger.error('Geocoding error:', e);
      // Geocoding is optional, continue without it
    }

    // Import storage for proper activity creation
    const { storage } = await import('../storage');
    
    // Save activities to database using storage layer
    const savedActivities = [];
    for (const activity of enrichedActivities) {
      try {
        // Use storage.createActivity which handles field validation properly
        const activityData = {
          trip_id: activity.trip_id,
          title: activity.title,
          date: activity.date,
          time: activity.time || '09:00', // Default time if missing
          location_name: activity.locationName || activity.location_name || activity.location || '', // Handle all field name variations
          notes: activity.notes || '',
          tag: activity.tag || 'activity',
          latitude: activity.latitude ? activity.latitude.toString() : null,
          longitude: activity.longitude ? activity.longitude.toString() : null,
          order: activity.order || 0,
          travel_mode: 'walking', // Add default travel mode
          assigned_to: null // Add default assigned_to
        };
        
        logger.info(`Creating weekend activity: ${activityData.title} on ${activityData.date} at ${activityData.time}`);
        
        // Use storage layer instead of raw db insert
        const createdActivity = await storage.createActivity(activityData);
        
        if (createdActivity) {
          savedActivities.push(createdActivity);
          logger.info(`Successfully created activity: ${createdActivity.id}`);
        }
      } catch (error) {
        logger.error(`Failed to create activity "${activity.title}":`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          activity
        });
        // Continue with other activities even if one fails
      }
    }

    res.json({
      success: true,
      trip_id,
      destination,
      duration,
      activities: savedActivities,
      message: `Generated ${savedActivities.length} activities for your weekend in ${destination}!`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate weekend itinerary"
    });
  }
});

// POST /api/ai/find-location - Find hotels and locations using AI
router.post("/find-location", async (req, res) => {
  try {
    const { search_query, city_context } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!search_query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    // Import cache service
    const { aiCache } = await import('../services/aiCacheService');

    // Check cache first
    const cacheKey = aiCache.generateKey('location', search_query, city_context);
    const cachedResult = aiCache.get(cacheKey);

    if (cachedResult) {
      return res.json(cachedResult);
    }

    const prompt = `Find places matching "${search_query}" in or near ${city_context || 'the specified location'}.

Search for ANY type of location including:
- Restaurants, cafes, bars
- Tourist attractions, landmarks, museums
- Parks, beaches, recreational areas
- Shopping centers, stores, markets
- Entertainment venues, theaters, stadiums
- Hotels and accommodations
- Transportation hubs
- Any other places that match the search

Return up to 5 locations that best match the search query. Focus on popular, well-known places.

Format as JSON:
{
  "locations": [
    {
      "name": "Place Name",
      "address": "Full street address or location description",
      "city": "${city_context || 'City'}",
      "region": "State/Province",
      "country": "Country",
      "description": "Brief description of what this place is (1-2 sentences)"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a travel expert specializing in hotel recommendations. Provide real hotel information in valid JSON format."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const responseData = {
      success: true,
      searchQuery: search_query,
      cityContext: city_context,
      ...result
    };

    // Cache the result for 7 days (location searches are relatively stable)
    aiCache.set(cacheKey, responseData, aiCache.DURATIONS.LOCATION_SEARCH);

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to find locations"
    });
  }
});

// POST /api/ai/translate-content - Translate content using AI
router.post("/translate-content", async (req, res) => {
  try {
    const { text, target_language } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

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
  "original_text": "original text here",
  "translated_text": "translated text here",
  "source_language": "detected source language",
  "target_language": "${target_language}",
  "confidence": "high/medium/low"
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL, // Using GPT-3.5 for 80% cost savings
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Provide accurate translations in valid JSON format."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to translate content"
    });
  }
});

// POST /api/ai/weather-activities - Get weather-based activity suggestions
router.post("/weather-activities", async (req, res) => {
  try {
    // After case conversion middleware, fields are in snake_case
    const location = req.body.location;
    const date = req.body.date;
    const weatherCondition = req.body.weather_condition;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!location || !weatherCondition) {
      return res.status(400).json({
        success: false,
        error: "Location and weather condition are required"
      });
    }

    // Import cache service
    const { aiCache } = await import('../services/aiCacheService');

    // Check cache first (shorter TTL for weather-based suggestions)
    const cacheKey = aiCache.generateKey('weather-activities', location, `${weatherCondition || 'any'}_${date || 'any'}`);
    const cachedResult = aiCache.get(cacheKey);

    if (cachedResult) {
      return res.json(cachedResult);
    }

    const prompt = `Suggest 5 activities in ${location} that are perfect for ${weatherCondition} weather.
    ${date ? `Date: ${date}` : ''}

Format as JSON:
{
  "activities": [
    {
      "name": "Activity Name",
      "description": "Brief description",
      "duration": "estimated time (e.g., 2-3 hours)",
      "location": "Specific location or area",
      "weatherSuitability": "Why this is good for the weather",
      "tips": "Any helpful tips"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a travel advisor specializing in weather-appropriate activities."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const responseData = {
      success: true,
      ...result
    };

    // Cache for 1 day only (weather changes daily)
    aiCache.set(cacheKey, responseData, 86400); // 1 day in seconds

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get weather activity suggestions"
    });
  }
});

// POST /api/ai/budget-options - Get budget-based suggestions
router.post("/budget-options", async (req, res) => {
  try {
    // After case conversion middleware, fields are in snake_case
    const location = req.body.location;
    const budgetLevel = req.body.budget_level;
    const activityType = req.body.activity_type;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!location || !budgetLevel) {
      return res.status(400).json({
        success: false,
        error: "Location and budget level are required"
      });
    }

    // Import cache service
    const { aiCache } = await import('../services/aiCacheService');

    // Check cache first
    const cacheKey = aiCache.generateKey('budget', location, `${budgetLevel || 'any'}_${activityType || 'any'}`);
    const cachedResult = aiCache.get(cacheKey);

    if (cachedResult) {
      return res.json(cachedResult);
    }

    const prompt = `Suggest budget-friendly options in ${location} for a ${budgetLevel} budget.
    ${activityType ? `Focus on: ${activityType}` : 'Include various categories'}

Format as JSON:
{
  "level": "${budgetLevel}",
  "location": "${location}",
  "currency": "USD",
  "breakdown": {
    "accommodation": { "low": 50, "high": 100, "average": 75, "suggestions": ["Hotel A", "Hotel B"] },
    "food": { "low": 30, "high": 60, "average": 45, "suggestions": ["Restaurant A", "Restaurant B"] },
    "transportation": { "low": 10, "high": 30, "average": 20, "suggestions": ["Metro", "Bus"] },
    "activities": { "low": 20, "high": 50, "average": 35, "suggestions": ["Museum", "Park"] }
  },
  "dailyTotal": { "low": 110, "high": 240, "average": 175 },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a travel budget advisor providing realistic cost estimates."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const responseData = {
      success: true,
      ...result
    };

    // Cache for 7 days (budget data is relatively stable)
    aiCache.set(cacheKey, responseData, aiCache.DURATIONS.LOCATION_SEARCH);

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get budget suggestions"
    });
  }
});

// POST /api/ai/trip-assistant - Conversational AI assistant for trip planning
router.post("/trip-assistant", async (req, res) => {
  try {
    const { trip_id, question, trip_context, conversation_history } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required"
      });
    }

    // Import the tripAssistant function from openai.ts
    const { tripAssistant } = await import("../openai");

    // Call the trip assistant with context
    const result = await tripAssistant(question, {
      trip: trip_context,
      conversationHistory: conversation_history || []
    });

    // Handle different response types
    if (typeof result === 'string') {
      res.json({
        success: true,
        answer: result,
        suggestions: []
      });
    } else {
      // Result contains activities (parsed itinerary)
      res.json({
        success: true,
        answer: result.answer,
        activities: result.activities || [],
        suggestions: []
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to process your request"
    });
  }
});

// POST /api/ai/recommend-tours - Get AI tour recommendations
router.post("/recommend-tours", async (req, res) => {
  try {
    const { destination, startDate, endDate, interests } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const prompt = `Recommend the top 5 must-do tours and activities for a trip to ${destination} from ${startDate} to ${endDate}.
    ${interests?.length > 0 ? `The traveler is interested in: ${interests.join(', ')}` : ''}

    Focus on:
    1. Most iconic and popular attractions
    2. Unique local experiences
    3. Best value for money
    4. Activities suitable for the season
    5. Mix of culture, food, and adventure

    Provide specific tour recommendations with brief descriptions.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || "";

    // Parse recommendations into array
    const recommendations = content
      .split('\n')
      .filter(line => line.trim().length > 0 && (line.includes('1.') || line.includes('2.') || line.includes('3.') || line.includes('4.') || line.includes('5.')))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    res.json({
      success: true,
      recommendations,
      destination,
      period: `${startDate} to ${endDate}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate tour recommendations"
    });
  }
});

// POST /api/ai/generate-trip - Generate complete AI trip itinerary
router.post("/generate-trip", async (req, res) => {
  try {
    const { prompt, conversation, tripId } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // For now, generate trip inline since businessTripGenerator is for business trips
    // We'll create a consumer-focused generation instead

    // Parse the prompt to extract trip requirements
    const promptLower = prompt.toLowerCase();
    
    // Check if user is forcing trip generation with defaults
    const forceGeneration = promptLower.includes("create the trip now") || 
                           promptLower.includes("use reasonable defaults") ||
                           promptLower.includes("just create it");

    // Use AI to extract structured data from natural language prompt
    const extractionPrompt = `Extract trip details from this request and return as JSON:
"${prompt}"

IMPORTANT: Extract dates in any format (like "next week", "June 15-22", "15 days from now") and convert to YYYY-MM-DD format.
For relative dates, use today's date as reference: ${new Date().toISOString().split('T')[0]}

Return format:
{
  "destination": "city name",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "budget": number (extract any amount mentioned, or use 3000 as default),
  "groupSize": number (default to 2 if not specified),
  "tripPurpose": "business/leisure/mixed",
  "preferences": {
    "accommodationType": "luxury/business/budget",
    "activityTypes": ["type1", "type2"],
    "foodTypes": ["cuisine1", "cuisine2"]
  }
}

Be aggressive in extracting information. For example:
- "I want to go to Paris" -> destination: "Paris"
- "next week" -> calculate actual dates
- "for a week" -> 7 days from start date
- "around $5000" -> budget: 5000
- If dates are vague but destination is clear, default to 7 days starting 2 weeks from today
- If budget isn't mentioned, use 3000 as default`;

    const extractionResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: extractionPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const extractedData = JSON.parse(extractionResponse.choices[0].message.content || "{}");

    // Check if we need more information - only ask if destination is missing
    // We can generate a trip with defaults for dates and budget
    const missingFields = [];
    if (!extractedData.destination && !forceGeneration) missingFields.push("destination");
    
    // Auto-fill destination if forcing and missing
    if (!extractedData.destination && forceGeneration) {
      // Try to extract any location mentioned or default to a popular destination
      const locationMatch = prompt.match(/\b(paris|london|tokyo|rome|barcelona|amsterdam|new york|los angeles|miami|hawaii|bali|thailand|dubai)\b/i);
      extractedData.destination = locationMatch ? locationMatch[0] : "Paris";
      logger.info(`Auto-filled destination: ${extractedData.destination}`);
    }
    
    // Auto-fill missing dates if we have a destination
    if ((extractedData.destination || forceGeneration) && !extractedData.startDate) {
      // Default to 2 weeks from now for 7 days
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() + 14);
      extractedData.startDate = defaultStart.toISOString().split('T')[0];
      
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setDate(defaultEnd.getDate() + 6);
      extractedData.endDate = defaultEnd.toISOString().split('T')[0];
      
      logger.info(`Auto-filled dates: ${extractedData.startDate} to ${extractedData.endDate}`);
    }
    
    // Auto-fill budget if missing
    if (!extractedData.budget) {
      extractedData.budget = 3000;
      logger.info(`Auto-filled budget: $${extractedData.budget}`);
    }

    if (missingFields.length > 0) {
      // Return questions to gather missing information
      const questions = `I'd love to help plan your trip! To create the perfect itinerary, could you provide:

${missingFields.map((field, i) => `${i + 1}. What's your ${field}?`).join('\n')}

Any other preferences like:
- Preferred hotel type (luxury, business, budget)?
- Activities you enjoy?
- Dietary restrictions?`;

      return res.json({
        type: "questions",
        message: questions,
        conversation: [
          ...(conversation || []),
          { role: "user", content: prompt },
          { role: "assistant", content: questions }
        ]
      });
    }
    
    // All required info is present - we're generating the trip immediately
    logger.info(`Generating trip for ${extractedData.destination} from ${extractedData.startDate} to ${extractedData.endDate} with budget $${extractedData.budget}`);

    // Calculate trip duration
    const startDate = new Date(extractedData.startDate);
    const endDate = new Date(extractedData.endDate);
    const tripDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // For longer trips, we'll generate activities in chunks to avoid token limits
    const MAX_DAYS_PER_REQUEST = 4; // Generate 4 days at a time to stay within token limits
    
    // Generate vacation itinerary using AI
    const itineraryPrompt = `Create a detailed ${extractedData.tripPurpose || 'vacation'} itinerary for:
Destination: ${extractedData.destination}
Dates: ${extractedData.startDate} to ${extractedData.endDate} (${tripDurationDays} days)
Budget: $${extractedData.budget || 3000} USD total
Travelers: ${extractedData.groupSize || 2} people
Accommodation preference: ${extractedData.preferences?.accommodationType || 'mid-range'}
Activities: ${extractedData.preferences?.activityTypes?.join(', ') || 'sightseeing, culture, relaxation'}
Food preferences: ${extractedData.preferences?.foodTypes?.join(', ') || 'local cuisine, popular restaurants'}

${tripDurationDays > MAX_DAYS_PER_REQUEST ? 
  `IMPORTANT: This is a ${tripDurationDays}-day trip. For now, provide overview information and activities for the FIRST ${MAX_DAYS_PER_REQUEST} DAYS ONLY. Focus on quality over quantity.` : 
  'Please provide a complete vacation itinerary.'}

Please provide:
1. Recommended flights (with realistic prices)
2. Hotel suggestions (2-3 options with nightly rates)
3. Daily activities schedule (morning, afternoon, evening) ${tripDurationDays > MAX_DAYS_PER_REQUEST ? `for days 1-${MAX_DAYS_PER_REQUEST}` : ''}
4. Restaurant recommendations for meals
5. Transportation tips
6. Total budget breakdown

Format as JSON with this structure:
{
  "tripSummary": {
    "title": "Trip title",
    "description": "Brief description",
    "duration": number_of_days,
    "totalCost": estimated_total,
    "highlights": ["highlight1", "highlight2"]
  },
  "flights": [
    {
      "airline": "Airline name",
      "flightNumber": "XX123",
      "route": "NYC to Paris",
      "departure": "2024-03-15 10:00 AM",
      "arrival": "2024-03-15 11:00 PM",
      "price": 600,
      "cabin": "Economy"
    }
  ],
  "accommodation": [
    {
      "name": "Hotel name",
      "address": "Address",
      "stars": 4,
      "pricePerNight": 150,
      "checkIn": "2024-03-15",
      "checkOut": "2024-03-18",
      "amenities": ["WiFi", "Pool", "Breakfast"]
    }
  ],
  "activities": [
    {
      "date": "2024-03-16",
      "time": "09:00",
      "title": "Activity name",
      "description": "Description",
      "duration": "2 hours",
      "location": "Location",
      "price": 50,
      "category": "sightseeing",
      "bookingRequired": true
    }
  ],
  "meals": [
    {
      "date": "2024-03-16",
      "time": "12:30",
      "restaurant": "Restaurant name",
      "cuisine": "French",
      "location": "Address",
      "estimatedCost": 40,
      "type": "lunch",
      "mustTry": "Dish name"
    }
  ],
  "transportation": [
    {
      "type": "Airport Transfer",
      "description": "Taxi from airport to hotel",
      "cost": 45
    }
  ],
  "budgetBreakdown": {
    "flights": 1200,
    "hotels": 450,
    "meals": 300,
    "activities": 400,
    "transportation": 150,
    "shopping": 200,
    "contingency": 300
  },
  "recommendations": [
    "Pack light layers for variable weather",
    "Book popular restaurants in advance",
    "Get city tourist pass for savings"
  ],
  "weatherConsiderations": {
    "temperature": "15-22°C",
    "conditions": "Partly cloudy with occasional rain",
    "packingTips": ["Umbrella", "Light jacket"]
  }
}`;

    const itineraryResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: itineraryPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000, // Increase token limit for initial response
    });

    const generatedTrip = JSON.parse(itineraryResponse.choices[0].message.content || "{}");

    // If trip is longer than MAX_DAYS_PER_REQUEST, generate additional days
    let allActivities = [...(generatedTrip.activities || [])];
    let allMeals = [...(generatedTrip.meals || [])];
    
    if (tripDurationDays > MAX_DAYS_PER_REQUEST) {
      // Track already suggested attractions
      const visitedAttractions = new Set();
      
      // Add initial activities to visited list
      for (const activity of allActivities) {
        if (activity.title && !activity.title.toLowerCase().includes('breakfast') && 
            !activity.title.toLowerCase().includes('lunch') && 
            !activity.title.toLowerCase().includes('dinner')) {
          visitedAttractions.add(activity.title);
        }
      }
      
      // Generate remaining days in chunks
      for (let dayStart = MAX_DAYS_PER_REQUEST + 1; dayStart <= tripDurationDays; dayStart += MAX_DAYS_PER_REQUEST) {
        const dayEnd = Math.min(dayStart + MAX_DAYS_PER_REQUEST - 1, tripDurationDays);
        
        // Calculate dates for this chunk
        const chunkStartDate = new Date(startDate);
        chunkStartDate.setDate(chunkStartDate.getDate() + dayStart - 1);
        const chunkEndDate = new Date(startDate);
        chunkEndDate.setDate(chunkEndDate.getDate() + dayEnd - 1);
        
        const alreadyVisitedList = Array.from(visitedAttractions).join(', ');
        
        const additionalDaysPrompt = `Continue creating the itinerary for days ${dayStart}-${dayEnd} of the trip to ${extractedData.destination}.
        
Previous context:
- Trip dates: ${extractedData.startDate} to ${extractedData.endDate}
- Already planned: Days 1-${dayStart - 1}
- Now planning: Days ${dayStart}-${dayEnd} (${chunkStartDate.toISOString().split('T')[0]} to ${chunkEndDate.toISOString().split('T')[0]})
- Budget remaining: Proportional amount for remaining days
- Same traveler preferences as before
${alreadyVisitedList ? `\nIMPORTANT: These attractions have already been planned, DO NOT repeat them: ${alreadyVisitedList}` : ''}

Create varied and interesting activities for days ${dayStart}-${dayEnd}, with completely NEW attractions not mentioned above.

Return ONLY a JSON object with this structure:
{
  "activities": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "title": "Activity name",
      "description": "Description",
      "duration": "X hours",
      "location": "Location",
      "price": 50,
      "category": "sightseeing/culture/food/relaxation"
    }
  ],
  "meals": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "restaurant": "Restaurant name",
      "cuisine": "Type",
      "location": "Address",
      "estimatedCost": 40,
      "type": "breakfast/lunch/dinner"
    }
  ]
}`;

        try {
          const additionalResponse = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: additionalDaysPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.8, // Slightly higher for variety
            max_tokens: 1500,
          });
          
          const additionalDays = JSON.parse(additionalResponse.choices[0].message.content || "{}");
          
          // Add the additional activities and meals
          if (additionalDays.activities) {
            // Track new attractions to avoid future duplicates
            for (const activity of additionalDays.activities) {
              if (activity.title && !activity.title.toLowerCase().includes('breakfast') && 
                  !activity.title.toLowerCase().includes('lunch') && 
                  !activity.title.toLowerCase().includes('dinner')) {
                visitedAttractions.add(activity.title);
              }
            }
            allActivities.push(...additionalDays.activities);
          }
          if (additionalDays.meals) {
            allMeals.push(...additionalDays.meals);
          }
        } catch (error) {
          logger.error(`Failed to generate days ${dayStart}-${dayEnd}:`, error);
          // Continue with what we have
        }
      }
    }
    
    // Update generatedTrip with all activities and meals
    generatedTrip.activities = allActivities;
    generatedTrip.meals = allMeals;

    // Format activities for frontend consumption
    const formattedActivities = allActivities.map((activity: any, index: number) => ({
      id: `ai-${index}`,
      title: activity.title || activity.name,
      description: activity.description,
      date: activity.date,
      time: activity.time || activity.startTime,
      duration: activity.duration,
      location: activity.location,
      category: activity.category || "activity",
      price: activity.price || 0,
      bookingUrl: activity.bookingUrl
    }));

    // If a tripId is provided, save the activities to the trip
    if (tripId) {
      let defaultTimeIndex = 0;
      const defaultTimes = ['09:00', '11:00', '14:00', '16:00', '19:00', '21:00'];

      for (const activity of formattedActivities) {
        // Ensure activity has a time, generate smart default if missing
        let activityTime = activity.time;
        if (!activityTime) {
          // Check for meal times based on title/category
          const title = (activity.title || '').toLowerCase();
          const category = (activity.category || '').toLowerCase();

          if (title.includes('breakfast') || category === 'breakfast') {
            activityTime = '08:00';
          } else if (title.includes('lunch') || category === 'lunch') {
            activityTime = '12:30';
          } else if (title.includes('dinner') || category === 'dinner') {
            activityTime = '19:00';
          } else if (title.includes('check-in')) {
            activityTime = '15:00';
          } else if (title.includes('check-out')) {
            activityTime = '11:00';
          } else {
            // Use rotating default times
            activityTime = defaultTimes[defaultTimeIndex % defaultTimes.length];
            defaultTimeIndex++;
          }
        }

        await db.insert(activities).values({
          trip_id: parseInt(tripId),
          title: activity.title,
          notes: activity.description,
          date: activity.date || null,
          time: activityTime,
          location_name: activity.location,
          category: activity.category,
          price: activity.price ? activity.price.toString() : undefined,
          booking_url: activity.bookingUrl,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    res.json({
      type: "itinerary",
      success: true,
      tripSummary: generatedTrip.tripSummary,
      flights: generatedTrip.flights,
      accommodation: generatedTrip.accommodation,
      activities: formattedActivities,
      meals: allMeals,
      groundTransportation: generatedTrip.transportation,
      budgetBreakdown: generatedTrip.budgetBreakdown,
      recommendations: generatedTrip.recommendations,
      weatherConsiderations: generatedTrip.weatherConsiderations,
      message: `Perfect! I've created your ${tripDurationDays}-day ${extractedData.destination} itinerary with ${formattedActivities.length} activities, ${allMeals.length} dining recommendations, and complete travel arrangements!`,
      savedToTrip: !!tripId,
      debug: {
        tripDurationDays,
        activitiesGenerated: formattedActivities.length,
        mealsGenerated: allMeals.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate trip itinerary"
    });
  }
});

// POST /api/ai/regenerate-activity - Generate a replacement activity
router.post("/regenerate-activity", async (req, res) => {
  try {
    const { activity_id, trip_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Get trip and verify ownership
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, trip_id),
        eq(trips.user_id, req.user.id)
      ));

    if (!trip) {
      return res.status(404).json({ success: false, error: "Trip not found" });
    }

    // Check regeneration limit
    if (trip.ai_regenerations_used >= trip.ai_regenerations_limit) {
      return res.status(429).json({
        success: false,
        error: "Regeneration limit reached",
        limit: trip.ai_regenerations_limit,
        used: trip.ai_regenerations_used
      });
    }

    // Get the activity to regenerate
    const [oldActivity] = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, activity_id),
        eq(activities.trip_id, trip_id)
      ));

    if (!oldActivity) {
      return res.status(404).json({ success: false, error: "Activity not found" });
    }

    // Get other activities for the same day to avoid duplicates
    const dayActivities = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.trip_id, trip_id),
        eq(activities.date, oldActivity.date)
      ));

    const existingTitles = dayActivities
      .filter(a => a.id !== activity_id)
      .map(a => a.title);

    // Generate new activity using OpenAI
    const prompt = `Generate a DIFFERENT activity to replace "${oldActivity.title}" for a trip to ${trip.city || 'this location'}.
    
    Context:
    - Date: ${oldActivity.date}
    - Time slot: ${oldActivity.time}
    - Location: ${trip.city || 'Unknown'}, ${trip.country || ''}
    - Current activities for this day (DO NOT DUPLICATE): ${existingTitles.join(', ')}
    
    Requirements:
    - Generate something COMPLETELY DIFFERENT from "${oldActivity.title}"
    - Make it appropriate for the time slot (${oldActivity.time})
    - Keep it interesting and location-specific
    - Avoid these existing activities: ${existingTitles.join(', ')}
    
    Return a JSON object with:
    {
      "title": "Activity name",
      "location_name": "Specific venue or area",
      "notes": "2-3 sentence description",
      "tag": "activity|dining|culture|outdoor|shopping|entertainment",
      "price": estimated cost in USD (number),
      "latitude": latitude if known (number),
      "longitude": longitude if known (number)
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a travel planning assistant. Generate unique, interesting activities for travelers. Always return valid JSON."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.9, // Higher temperature for more variety
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const newActivityData = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    // Update the activity
    await db
      .update(activities)
      .set({
        title: newActivityData.title,
        location_name: newActivityData.location_name || oldActivity.location_name,
        notes: newActivityData.notes || '',
        tag: newActivityData.tag || oldActivity.tag,
        price: newActivityData.price ? String(newActivityData.price) : oldActivity.price,
        latitude: newActivityData.latitude ? String(newActivityData.latitude) : oldActivity.latitude,
        longitude: newActivityData.longitude ? String(newActivityData.longitude) : oldActivity.longitude,
        updated_at: new Date()
      })
      .where(eq(activities.id, activity_id));

    // Increment regeneration counter
    await db
      .update(trips)
      .set({
        ai_regenerations_used: trip.ai_regenerations_used + 1
      })
      .where(eq(trips.id, trip_id));

    // Fetch updated activity
    const [updatedActivity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activity_id));

    logger.info(`Activity regenerated for trip ${trip_id}, activity ${activity_id}`);

    res.json({
      success: true,
      activity: updatedActivity,
      regenerations_remaining: trip.ai_regenerations_limit - trip.ai_regenerations_used - 1
    });

  } catch (error) {
    logger.error("Error regenerating activity:", error);
    res.status(500).json({
      success: false,
      error: "Failed to regenerate activity"
    });
  }
});

export default router;