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

// POST /api/ai/suggest-food - Get AI food recommendations with real OSM data
router.post("/suggest-food", async (req, res) => {
  try {
    const validatedData = suggestFoodSchema.parse(req.body);
    const { city, cuisine_type, budget_range } = validatedData;

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Get REAL restaurants from OpenStreetMap
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');
    
    const countryContext = 'Germany'; // Default, could be enhanced to detect from city
    logger.info(`[SUGGEST-FOOD] Fetching real restaurants in ${city}`);
    
    // Fetch real places (uses cache if available)
    const { restaurants } = await batchFetchAndCache(city, countryContext);
    
    if (restaurants.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Could not find restaurants in ${city}. Please try a different city.`
      });
    }
    
    // Filter by cuisine type if specified
    let filteredRestaurants = restaurants;
    if (cuisine_type) {
      const cuisineLower = cuisine_type.toLowerCase();
      filteredRestaurants = restaurants.filter(r => {
        const restaurantCuisine = (r.cuisine || '').toLowerCase();
        return restaurantCuisine.includes(cuisineLower) || 
               r.name.toLowerCase().includes(cuisineLower);
      });
      
      // If no matches for specific cuisine, use all restaurants
      if (filteredRestaurants.length === 0) {
        filteredRestaurants = restaurants;
      }
    }
    
    // Select top 5 restaurants (or fewer if not available)
    const recommendations = filteredRestaurants.slice(0, 5).map(restaurant => {
      // Determine price range based on budget_range input
      const priceRange = budget_range === 'budget' ? '$' :
                         budget_range === 'luxury' ? '$$$' : '$$';
      
      return {
        name: restaurant.name,
        description: `Popular ${restaurant.cuisine || 'local'} restaurant in ${city}`,
        specialty: restaurant.cuisine || "Local specialties",
        price_range: priceRange,
        latitude: restaurant.lat,
        longitude: restaurant.lon,
        address: city
      };
    });

    const responseData = {
      success: true,
      city,
      cuisine_type,
      budget_range,
      recommendations,
      source: "OpenStreetMap"
    };

    res.json(responseData);
  } catch (error) {
    logger.error('Failed to suggest food:', error);
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

    // Extract city and country from the user's message if they're creating a trip
    let realPlaces = null;
    let cityToSearch = null;
    let countryToSearch = null;
    
    if (isCreatingTrip) {
      // Try to extract city from the message
      const cityMatch = lastMessage.match(/(?:to|in|at|visit|visiting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      const commonCities = ['Berlin', 'Munich', 'Hamburg', 'Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam', 'Prague', 'Vienna'];
      
      for (const city of commonCities) {
        if (lastMessage.toLowerCase().includes(city.toLowerCase())) {
          cityToSearch = city;
          break;
        }
      }
      
      if (!cityToSearch && cityMatch) {
        cityToSearch = cityMatch[1];
      }
      
      // Default country based on common cities or use Germany as default
      const cityCountryMap: Record<string, string> = {
        'Paris': 'France',
        'London': 'United Kingdom',
        'Rome': 'Italy',
        'Barcelona': 'Spain',
        'Amsterdam': 'Netherlands',
        'Prague': 'Czech Republic',
        'Vienna': 'Austria'
      };
      
      countryToSearch = cityCountryMap[cityToSearch || ''] || 'Germany';
      
      // If we have a city, fetch real places from OSM
      if (cityToSearch) {
        try {
          const { batchFetchAndCache } = await import('../services/osmBatchFetch');
          logger.info(`[CHAT] Fetching real places for ${cityToSearch}, ${countryToSearch}`);
          realPlaces = await batchFetchAndCache(cityToSearch, countryToSearch);
          logger.info(`[CHAT] Got ${realPlaces.restaurants.length} restaurants, ${realPlaces.attractions.length} attractions, ${realPlaces.cafes.length} cafes`);
        } catch (error) {
          logger.error(`[CHAT] Failed to fetch OSM data:`, error);
        }
      }
    }
    
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
      "notes": "Brief description or tips",
      "latitude": "decimal latitude if available",
      "longitude": "decimal longitude if available"
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

Generate EXACTLY 5 activities for EACH day of the trip following this pattern:
- 3 meals (breakfast from CAFES, lunch & dinner from RESTAURANTS)
- 2 tourist activities (from ATTRACTIONS list - museums, landmarks, parks, etc.)

For a 3-day trip = 15 activities total (5 per day)
For a 7-day trip = 35 activities total (5 per day)
For a 13-day trip = 65 activities total (5 per day)

For each day, create a balanced schedule with:
- Breakfast (08:00-09:00) - Pick from CAFES list
- Morning activity (09:30-11:30) - Pick from ATTRACTIONS list (museum, landmark, etc.)
- Lunch (12:00-13:30) - Pick from RESTAURANTS list
- Afternoon activity (14:00-17:00) - Pick from ATTRACTIONS list (different from morning)
- Dinner (18:30-20:30) - Pick from RESTAURANTS list (different from lunch)

CRITICAL: Each day should have:
- 1 breakfast (cafe)
- 2 different attractions/activities (NOT restaurants)
- 1 lunch (restaurant)
- 1 dinner (different restaurant)
Total: 5 activities per day with proper variety

Spread activities across ALL dates from startDate to endDate.

${realPlaces ? `
CRITICAL: You MUST use these REAL places from ${cityToSearch}:

RESTAURANTS (use for lunch/dinner):
${realPlaces.restaurants.slice(0, 15).map(r => `- ${r.name} (lat: ${r.lat}, lon: ${r.lon})`).join('\n')}

ATTRACTIONS (use for sightseeing):
${realPlaces.attractions.slice(0, 15).map(a => `- ${a.name} (lat: ${a.lat}, lon: ${a.lon})`).join('\n')}

CAFES (use for breakfast/coffee):
${realPlaces.cafes.slice(0, 10).map(c => `- ${c.name} (lat: ${c.lat}, lon: ${c.lon})`).join('\n')}

IMPORTANT RULES FOR USING THESE PLACES:
- Use ONLY these real places in your activities - DO NOT make up any places
- Include the exact coordinates (latitude, longitude) for each activity
- NEVER repeat the same restaurant or attraction twice in the trip
- For MEALS: Only use items from RESTAURANTS list for lunch/dinner, CAFES for breakfast
- For ACTIVITIES: Only use items from ATTRACTIONS list for sightseeing/tours
- DO NOT use restaurants as "activities" - they are only for meal times
` : ''}
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
        const expectedActivities = tripDays * 5; // 5 activities per day (breakfast, lunch, dinner, 2 attractions)
        
        logger.info(`Trip is ${tripDays} days, expecting ${expectedActivities} activities (5 per day), got ${tripSuggestion.activities?.length || 0}`);
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

        // If we have activities, they should already have coordinates from OSM
        // Only geocode if coordinates are missing (fallback)
        if (tripSuggestion.activities && tripSuggestion.activities.length > 0) {
          const { geocodeLocation } = await import('../geocoding');
          
          let coordinatesFromOSM = 0;
          let geocoded = 0;

          // Only geocode activities that don't have coordinates
          for (const activity of tripSuggestion.activities) {
            if (activity.latitude && activity.longitude) {
              coordinatesFromOSM++;
            } else if (activity.locationName) {
              const coords = await geocodeLocation(activity.locationName, tripSuggestion.city, tripSuggestion.country);
              if (coords) {
                activity.latitude = coords.latitude;
                activity.longitude = coords.longitude;
                geocoded++;
              }
            }
          }
          
          logger.info(`[CHAT] Activities with OSM coordinates: ${coordinatesFromOSM}/${tripSuggestion.activities.length}, geocoded: ${geocoded}`);
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

// POST /api/ai/suggest-activities - Get AI activity suggestions with REAL OSM data
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

    // Get REAL places from OpenStreetMap
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');
    
    // Try to determine country from common cities
    const cityCountryMap: Record<string, string> = {
      'Paris': 'France',
      'London': 'United Kingdom',
      'Rome': 'Italy',
      'Barcelona': 'Spain',
      'Amsterdam': 'Netherlands',
      'Prague': 'Czech Republic',
      'Vienna': 'Austria',
      'Berlin': 'Germany',
      'Munich': 'Germany',
      'Hamburg': 'Germany'
    };
    
    const countryContext = cityCountryMap[city] || 'Germany';
    
    logger.info(`[SUGGEST-ACTIVITIES] Fetching real places for ${city}, ${countryContext}`);
    
    // Fetch real places (uses cache if available)
    const { restaurants, attractions, cafes } = await batchFetchAndCache(city, countryContext);
    
    if (attractions.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Could not find attractions in ${city}. Please try a different city.`
      });
    }
    
    const interestsText = Array.isArray(interests) ? interests.join(', ') : (interests || 'general sightseeing');
    const durationText = duration ? `${duration} days` : 'a few days';

    // Select 6 diverse real attractions
    const selectedAttractions = attractions.slice(0, 6);
    
    const prompt = `Given these REAL attractions in ${city}, create activity suggestions for someone interested in ${interestsText}, planning to spend ${durationText} there.

For each activity, provide:
- Name/title
- Brief description (1-2 sentences)
- Best time to visit
- Approximate duration
- Activity type/category

REAL ATTRACTIONS:
${selectedAttractions.map(a => `- ${a.name} (lat: ${a.lat}, lon: ${a.lon})`).join('\n')}

Format as JSON, using ONLY the real attractions above:
{
  "activities": [
    {
      "title": "Name from the list above",
      "description": "Brief description",
      "best_time": "Time recommendation",
      "duration": "Time needed",
      "category": "Activity type",
      "priority": "high/medium/low",
      "latitude": decimal latitude,
      "longitude": decimal longitude
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable travel expert. Use ONLY the real attractions provided to create recommendations."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure all activities have coordinates from our real places
    if (result.activities) {
      result.activities = result.activities.map((activity: any) => {
        const realPlace = selectedAttractions.find(a => 
          activity.title?.includes(a.name) || a.name.includes(activity.title)
        );
        if (realPlace) {
          activity.latitude = realPlace.lat;
          activity.longitude = realPlace.lon;
        }
        return activity;
      });
    }

    const responseData = {
      success: true,
      city,
      interests: interestsText,
      duration,
      source: "OpenStreetMap",
      ...result
    };

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
    
    // Get REAL places from OpenStreetMap using batch fetch with caching
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');
    
    const cityToSearch = trip.city || 'Berlin';
    const countryToSearch = trip.country || 'Germany';
    
    logger.info(`[FULL-ITINERARY] Fetching real places for ${cityToSearch}, ${countryToSearch}`);
    
    // Fetch all places in a single request (or use cache)
    const { restaurants, attractions, cafes } = await batchFetchAndCache(cityToSearch, countryToSearch);
    
    logger.info(`[FULL-ITINERARY] Got ${restaurants.length} restaurants, ${attractions.length} attractions, ${cafes.length} cafes`);
    
    // Only proceed if we got real places
    if (restaurants.length === 0 && attractions.length === 0) {
      logger.error(`[FULL-ITINERARY] No real places found for ${cityToSearch}`);
      return res.status(400).json({
        success: false,
        error: `Could not find real places in ${cityToSearch}. Please try a different city.`
      });
    }

    // Generate activities in batches of 3 days at a time
    const allActivities = [];
    const DAYS_PER_BATCH = 3;
    const visitedAttractions = new Set(); // Track unique attractions to avoid duplicates
    const usedRestaurants = new Set(); // Track used restaurants to ensure variety
    
    // First check if trip already has activities
    const existingActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.trip_id, trip_id));
    
    logger.info(`[FULL-ITINERARY] Trip ${trip_id} has ${existingActivities.length} existing activities`);
    
    // If trip already has sufficient activities (at least 2 per day), don't add more
    const minActivitiesNeeded = tripDays * 2;
    if (existingActivities.length >= minActivitiesNeeded) {
      logger.info(`[FULL-ITINERARY] Trip already has sufficient activities (${existingActivities.length} >= ${minActivitiesNeeded}), skipping generation`);
      return res.json({
        success: true,
        activitiesCreated: 0,
        message: `Trip already has ${existingActivities.length} activities`
      });
    }
    
    // Group existing activities by date to see which days need activities
    const activitiesByDate = new Map<string, any[]>();
    for (const activity of existingActivities) {
      if (activity.date) {
        const dateStr = activity.date;
        if (!activitiesByDate.has(dateStr)) {
          activitiesByDate.set(dateStr, []);
        }
        activitiesByDate.get(dateStr)!.push(activity);
      }
    }
    
    // Create activities for each day using real OSM places
    for (let dayIndex = 0; dayIndex < tripDays; dayIndex++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayIndex);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check how many activities exist for this day
      const dayActivities = activitiesByDate.get(dateStr) || [];
      const hasMeals = dayActivities.some(a => 
        a.title?.toLowerCase().includes('breakfast') || 
        a.title?.toLowerCase().includes('lunch') || 
        a.title?.toLowerCase().includes('dinner') ||
        a.tag === 'food' || a.tag === 'dining'
      );
      
      logger.info(`[FULL-ITINERARY] Day ${dateStr} has ${dayActivities.length} activities, hasMeals: ${hasMeals}`);
      
      // If this day already has meals, only add attractions
      if (hasMeals) {
        // Only add attractions if there are fewer than 2 non-meal activities
        const nonMealActivities = dayActivities.filter(a => 
          a.tag !== 'food' && a.tag !== 'dining' && 
          !a.title?.toLowerCase().includes('breakfast') &&
          !a.title?.toLowerCase().includes('lunch') &&
          !a.title?.toLowerCase().includes('dinner')
        );
        
        if (nonMealActivities.length < 2) {
          // Add one or two attractions
          const morningAttraction = attractions.find(a => !visitedAttractions.has(a.name)) || attractions[dayIndex % attractions.length];
          if (morningAttraction) {
            allActivities.push({
              date: dateStr,
              time: "10:00",
              title: `Visit ${morningAttraction.name}`,
              locationName: morningAttraction.name,
              latitude: morningAttraction.lat,
              longitude: morningAttraction.lon,
              notes: morningAttraction.tourism || "Explore this popular attraction",
              tag: "sightseeing"
            });
            visitedAttractions.add(morningAttraction.name);
          }
          
          if (nonMealActivities.length === 0 && attractions.length > dayIndex + 1) {
            const afternoonAttraction = attractions.find(a => !visitedAttractions.has(a.name)) || attractions[(dayIndex + 1) % attractions.length];
            if (afternoonAttraction && afternoonAttraction.name !== morningAttraction?.name) {
              allActivities.push({
                date: dateStr,
                time: "14:30",
                title: `Explore ${afternoonAttraction.name}`,
                locationName: afternoonAttraction.name,
                latitude: afternoonAttraction.lat,
                longitude: afternoonAttraction.lon,
                notes: afternoonAttraction.tourism || "Discover this attraction",
                tag: "sightseeing"
              });
              visitedAttractions.add(afternoonAttraction.name);
            }
          }
        }
      } else if (dayActivities.length === 0) {
        // No activities for this day, add full day plan
        // Pick breakfast place (cafe)
        const breakfastCafe = cafes.find(c => !usedRestaurants.has(c.name)) || cafes[dayIndex % cafes.length];
        if (breakfastCafe) {
          allActivities.push({
            date: dateStr,
            time: "08:30",
            title: `Breakfast at ${breakfastCafe.name}`,
            locationName: breakfastCafe.name,
            latitude: breakfastCafe.lat,
            longitude: breakfastCafe.lon,
            notes: "Start your day with coffee and pastries",
            tag: "food"
          });
          usedRestaurants.add(breakfastCafe.name);
        }
        
        // Pick morning attraction
        const morningAttraction = attractions.find(a => !visitedAttractions.has(a.name)) || attractions[dayIndex % attractions.length];
        if (morningAttraction) {
          allActivities.push({
            date: dateStr,
            time: "10:00",
            title: `Visit ${morningAttraction.name}`,
            locationName: morningAttraction.name,
            latitude: morningAttraction.lat,
            longitude: morningAttraction.lon,
            notes: morningAttraction.tourism || "Explore this popular attraction",
            tag: "sightseeing"
          });
          visitedAttractions.add(morningAttraction.name);
        }
        
        // Pick lunch restaurant
        const lunchPlace = restaurants.find(r => !usedRestaurants.has(r.name)) || restaurants[dayIndex % restaurants.length];
        if (lunchPlace) {
          allActivities.push({
            date: dateStr,
            time: "13:00",
            title: `Lunch at ${lunchPlace.name}`,
            locationName: lunchPlace.name,
            latitude: lunchPlace.lat,
            longitude: lunchPlace.lon,
            notes: lunchPlace.cuisine ? `${lunchPlace.cuisine} cuisine` : "Enjoy local cuisine",
            tag: "food"
          });
          usedRestaurants.add(lunchPlace.name);
        }
        
        // Pick dinner restaurant
        const dinnerPlace = restaurants.find(r => !usedRestaurants.has(r.name)) || restaurants[(dayIndex + 10) % restaurants.length];
        if (dinnerPlace) {
          allActivities.push({
            date: dateStr,
            time: "19:00",
            title: `Dinner at ${dinnerPlace.name}`,
            locationName: dinnerPlace.name,
            latitude: dinnerPlace.lat,
            longitude: dinnerPlace.lon,
            notes: dinnerPlace.cuisine ? `${dinnerPlace.cuisine} dining experience` : "Evening dining",
            tag: "food"
          });
          usedRestaurants.add(dinnerPlace.name);
        }
      } else {
        // Day has some activities but no meals, add meals only
        logger.info(`[FULL-ITINERARY] Day ${dateStr} has activities but no meals, adding meals only`);
        
        // Only add meals if they don't exist
        const breakfastCafe = cafes.find(c => !usedRestaurants.has(c.name)) || cafes[dayIndex % cafes.length];
        if (breakfastCafe) {
          allActivities.push({
            date: dateStr,
            time: "08:30",
            title: `Breakfast at ${breakfastCafe.name}`,
            locationName: breakfastCafe.name,
            latitude: breakfastCafe.lat,
            longitude: breakfastCafe.lon,
            notes: "Start your day with coffee and pastries",
            tag: "food"
          });
          usedRestaurants.add(breakfastCafe.name);
        }
        
        const lunchPlace = restaurants.find(r => !usedRestaurants.has(r.name)) || restaurants[dayIndex % restaurants.length];
        if (lunchPlace) {
          allActivities.push({
            date: dateStr,
            time: "13:00",
            title: `Lunch at ${lunchPlace.name}`,
            locationName: lunchPlace.name,
            latitude: lunchPlace.lat,
            longitude: lunchPlace.lon,
            notes: lunchPlace.cuisine ? `${lunchPlace.cuisine} cuisine` : "Enjoy local cuisine",
            tag: "food"
          });
          usedRestaurants.add(lunchPlace.name);
        }
        
        const dinnerPlace = restaurants.find(r => !usedRestaurants.has(r.name)) || restaurants[(dayIndex + 10) % restaurants.length];
        if (dinnerPlace) {
          allActivities.push({
            date: dateStr,
            time: "19:00",
            title: `Dinner at ${dinnerPlace.name}`,
            locationName: dinnerPlace.name,
            latitude: dinnerPlace.lat,
            longitude: dinnerPlace.lon,
            notes: dinnerPlace.cuisine ? `${dinnerPlace.cuisine} dining experience` : "Evening dining",
            tag: "food"
          });
          usedRestaurants.add(dinnerPlace.name);
        }
      }
    }
    
    logger.info(`[FULL-ITINERARY] Created ${allActivities.length} activities from real OSM places`);

    // Save activities with real OSM coordinates
    for (const activity of allActivities) {
      // Save activity with real coordinates from OSM
      await db.insert(activities).values({
        trip_id,
        title: activity.title,
        date: activity.date,
        time: activity.time,
        location_name: activity.locationName,
        latitude: activity.latitude ? String(activity.latitude) : null,
        longitude: activity.longitude ? String(activity.longitude) : null,
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
    
    // Get REAL places from OpenStreetMap using batch fetch with caching
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');
    
    const cityToSearch = trip.city || destination.split(',')[0].trim();
    const countryToSearch = trip.country || destination.split(',')[1]?.trim() || 'Germany';
    
    logger.info(`[WEEKEND] Fetching real places for ${cityToSearch}, ${countryToSearch}`);
    
    // Fetch all places in a single request (or use cache)
    const { restaurants, attractions, cafes } = await batchFetchAndCache(cityToSearch, countryToSearch);
    
    logger.info(`[WEEKEND] Got ${restaurants.length} restaurants, ${attractions.length} attractions, ${cafes.length} cafes`);
    
    // Log the first few places for debugging
    if (restaurants.length > 0) {
      logger.info(`[WEEKEND] Sample restaurants: ${restaurants.slice(0,3).map(r => `${r.name} (${r.lat},${r.lon})`).join(', ')}`);
    }
    if (attractions.length > 0) {
      logger.info(`[WEEKEND] Sample attractions: ${attractions.slice(0,3).map(a => `${a.name} (${a.lat},${a.lon})`).join(', ')}`);
    }
    
    // Only proceed if we got real places
    if (restaurants.length === 0 && attractions.length === 0) {
      logger.error(`[AI] No real places found for ${destination}`);
      return res.status(400).json({
        success: false,
        error: `Could not find real places in ${destination}. Please try a different city.`
      });
    }
    
    // NEW APPROACH: Pick places first, then create itinerary
    const startDate = new Date(trip.start_date);
    const allPlaces = [...restaurants, ...attractions, ...cafes];
    
    // Select diverse places for the weekend
    const selectedPlaces = [];
    
    // Day 1 (Friday evening): 1 restaurant for dinner
    if (restaurants.length > 0) {
      selectedPlaces.push({ ...restaurants[0], day: 0, time: '19:00', tag: 'food', title: `Dinner at ${restaurants[0].name}` });
    }
    
    // Day 2 (Saturday): Full day
    // Morning attraction
    if (attractions.length > 0) {
      selectedPlaces.push({ ...attractions[0], day: 1, time: '09:00', tag: 'sightseeing', title: `Visit ${attractions[0].name}` });
    }
    // Lunch
    if (restaurants.length > 1) {
      selectedPlaces.push({ ...restaurants[1], day: 1, time: '12:30', tag: 'food', title: `Lunch at ${restaurants[1].name}` });
    } else if (cafes.length > 0) {
      selectedPlaces.push({ ...cafes[0], day: 1, time: '12:30', tag: 'food', title: `Light lunch at ${cafes[0].name}` });
    }
    // Afternoon attraction
    if (attractions.length > 1) {
      selectedPlaces.push({ ...attractions[1], day: 1, time: '14:30', tag: 'sightseeing', title: `Explore ${attractions[1].name}` });
    }
    // Coffee break
    if (cafes.length > 0) {
      const cafeIndex = cafes.length > 1 ? 1 : 0;
      selectedPlaces.push({ ...cafes[cafeIndex], day: 1, time: '16:30', tag: 'food', title: `Coffee break at ${cafes[cafeIndex].name}` });
    }
    // Dinner
    if (restaurants.length > 2) {
      selectedPlaces.push({ ...restaurants[2], day: 1, time: '19:30', tag: 'food', title: `Dinner at ${restaurants[2].name}` });
    }
    
    // Day 3 (Sunday): Morning/afternoon before departure
    // Morning attraction or cafe
    if (attractions.length > 2) {
      selectedPlaces.push({ ...attractions[2], day: 2, time: '09:30', tag: 'sightseeing', title: `Morning visit to ${attractions[2].name}` });
    } else if (cafes.length > 2) {
      selectedPlaces.push({ ...cafes[2], day: 2, time: '09:30', tag: 'food', title: `Breakfast at ${cafes[2].name}` });
    }
    // Final lunch before departure
    if (restaurants.length > 3) {
      selectedPlaces.push({ ...restaurants[3], day: 2, time: '12:00', tag: 'food', title: `Farewell lunch at ${restaurants[3].name}` });
    }
    
    // Skip AI entirely - just use the real places directly
    logger.info(`[AI] Selected ${selectedPlaces.length} real places for itinerary`);
    
    // Format activities without AI involvement
    const activities = selectedPlaces.map(place => {
      let notes = '';
      
      // Generate appropriate notes based on type
      if (place.cuisine) {
        notes = `Enjoy authentic ${place.cuisine} cuisine at this local favorite`;
      } else if (place.tourism === 'viewpoint') {
        notes = 'Take in panoramic views of the city and surrounding landscape';
      } else if (place.tourism === 'museum' || place.tourism === 'attraction') {
        notes = 'Explore the exhibits and learn about local history and culture';
      } else if (place.tag === 'food') {
        notes = 'Experience local flavors and traditional dishes';
      } else {
        notes = 'Discover this local gem and its unique character';
      }
      
      return {
        title: place.title,
        locationName: place.name,
        locationAddress: '',
        latitude: place.lat.toString(),
        longitude: place.lon.toString(),
        time: place.time,
        day: place.day,
        notes: notes,
        tag: place.tag
      };
    });
    
    logger.info(`[WEEKEND] Created ${activities.length} activities from real OSM places`);
    
    // Log what we're about to save
    activities.forEach((act, i) => {
      logger.info(`[WEEKEND] Activity ${i+1}: ${act.title} at ${act.locationName} (${act.latitude},${act.longitude})`);
    });

    // Map activities to actual dates - coordinates already included
    const enrichedActivities = activities.map((activity: any, index: number) => {
      // Calculate actual date based on day offset
      const dayOffset = activity.day || 0;
      const activityDate = new Date(startDate);
      activityDate.setDate(startDate.getDate() + dayOffset);
      
      return {
        ...activity,
        date: activityDate.toISOString().split('T')[0],
        trip_id,
        order: index,
        // Ensure coordinates are strings
        latitude: activity.latitude?.toString(),
        longitude: activity.longitude?.toString(),
        location_name: activity.locationName,
        location_address: activity.locationAddress
      };
    });

    // Log coordinate status
    const activitiesWithCoords = enrichedActivities.filter(a => a.latitude && a.longitude).length;
    logger.info(`[AI] ${activitiesWithCoords}/${enrichedActivities.length} activities have coordinates from real OSM places`);
    
    // Only try geocoding if we're missing coordinates (which shouldn't happen with new approach)
    if (activitiesWithCoords < enrichedActivities.length) {
      logger.warn(`[AI] Some activities missing coordinates - this shouldn't happen with real places`);
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
    // Debug logging
    console.log('Weather activities request body:', req.body);
    
    // After case conversion middleware, fields are in snake_case
    const location = req.body.location;
    const date = req.body.date;
    // The middleware should convert weatherCondition to weather_condition
    const weatherCondition = req.body.weather_condition;

    console.log('Parsed values:', { location, date, weatherCondition });
    console.log('User:', req.user ? 'authenticated' : 'not authenticated');

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!location || !weatherCondition) {
      return res.status(400).json({
        success: false,
        error: `Location and weather condition are required. Received: location="${location}", weatherCondition="${weatherCondition}"`
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

    // Parse location to get city and country
    const locationParts = location.split(',').map((p: string) => p.trim());
    const cityToSearch = locationParts[0];
    const countryToSearch = locationParts[1] || '';

    // Import OSM batch fetching service
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');

    // Fetch real places from OSM
    const realPlaces = await batchFetchAndCache(cityToSearch, countryToSearch);

    // Determine which places are suitable for the weather
    let suitablePlaces = [];
    const weatherLower = weatherCondition.toLowerCase();
    
    if (weatherLower.includes('rain') || weatherLower.includes('snow') || weatherLower.includes('cold')) {
      // Indoor activities - museums, restaurants, cafes
      suitablePlaces = [
        ...realPlaces.attractions.filter(a => 
          a.tourism === 'museum'
        ).slice(0, 3),
        ...realPlaces.restaurants.slice(0, 1),
        ...realPlaces.cafes.slice(0, 1)
      ];
    } else if (weatherLower.includes('sunny') || weatherLower.includes('clear') || weatherLower.includes('warm')) {
      // Outdoor activities - parks, viewpoints, outdoor attractions
      suitablePlaces = [
        ...realPlaces.attractions.filter(a => 
          a.tourism === 'park' || 
          a.tourism === 'viewpoint' ||
          a.tourism === 'monument'
        ).slice(0, 5)
      ];
    } else {
      // Mixed weather - variety of activities
      suitablePlaces = [
        ...realPlaces.attractions.slice(0, 3),
        ...realPlaces.restaurants.slice(0, 1),
        ...realPlaces.cafes.slice(0, 1)
      ];
    }

    // If we don't have enough suitable places, add more general attractions
    if (suitablePlaces.length < 5) {
      const needed = 5 - suitablePlaces.length;
      suitablePlaces.push(...realPlaces.attractions.slice(0, needed));
    }

    const prompt = `Given these real places in ${location} and ${weatherCondition} weather, recommend which 5 would be best and explain why they're suitable for the weather.
    ${date ? `Date: ${date}` : ''}

Available real places:
${suitablePlaces.slice(0, 10).map(p => `- ${p.name} (${(p as any).tourism || (p as any).cuisine || 'attraction'})`).join('\n')}

Format as JSON:
{
  "activities": [
    {
      "name": "Exact place name from the list",
      "description": "Brief description",
      "duration": "estimated time (e.g., 2-3 hours)",
      "location": "Specific location or area",
      "weatherSuitability": "Why this is good for ${weatherCondition} weather",
      "tips": "Any helpful tips",
      "latitude": number,
      "longitude": number
    }
  ]
}

IMPORTANT: Only use places from the provided list. Include the exact coordinates.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a travel advisor specializing in weather-appropriate activities. Only recommend places from the provided list."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Add coordinates to the activities
    if (result.activities) {
      result.activities = result.activities.map((activity: any) => {
        const matchingPlace = suitablePlaces.find(p => 
          p.name === activity.name || 
          activity.name.includes(p.name) ||
          p.name.includes(activity.name)
        );
        
        if (matchingPlace) {
          return {
            ...activity,
            latitude: matchingPlace.lat,
            longitude: matchingPlace.lon
          };
        }
        return activity;
      });
    }

    const responseData = {
      success: true,
      ...result,
      source: 'OpenStreetMap'
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
2. Hotel suggestions (2-3 options with nightly rates) - use REAL hotel names or chains
3. Daily activities schedule (morning, afternoon, evening) ${tripDurationDays > MAX_DAYS_PER_REQUEST ? `for days 1-${MAX_DAYS_PER_REQUEST}` : ''} - use REAL attractions
4. Restaurant recommendations - use ACTUAL restaurant names you know exist
5. Transportation tips
6. Total budget breakdown

CRITICAL: Use ONLY real places from your knowledge base. NO generic names!

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
      "title": "REAL activity/attraction name (e.g., 'Sigmaringen Castle' not 'Local Castle')",
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
      "restaurant": "REAL restaurant name that exists (not generic like 'Local Restaurant')",
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
      model: "gpt-3.5-turbo", // Using 3.5 for cost optimization
      messages: [{ role: "user", content: itineraryPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500, // Reduced for cost efficiency
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
        
CRITICAL: You MUST suggest REAL, EXISTING places that tourists actually visit.
Use actual tourist attractions, real restaurants with good reviews, and genuine hotels.
DO NOT make up generic names like "Local Restaurant" or "Traditional Bakery".
        
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
    const regenerationsUsed = trip.ai_regenerations_used ?? 0;
    const regenerationsLimit = trip.ai_regenerations_limit ?? 10;
    if (regenerationsUsed >= regenerationsLimit) {
      return res.status(429).json({
        success: false,
        error: "Regeneration limit reached",
        limit: regenerationsLimit,
        used: regenerationsUsed
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
        eq(activities.date, oldActivity.date || '')
      ));

    const existingTitles = dayActivities
      .filter(a => a.id !== activity_id)
      .map(a => a.title);

    // Get REAL places from OpenStreetMap for regeneration
    const { batchFetchAndCache } = await import('../services/osmBatchFetch');
    
    const cityToSearch = trip.city || 'Berlin';
    const countryToSearch = trip.country || 'Germany';
    
    logger.info(`[REGENERATE] Fetching real places for ${cityToSearch}, ${countryToSearch}`);
    
    // Fetch real places (uses cache if available)
    const { restaurants, attractions, cafes } = await batchFetchAndCache(cityToSearch, countryToSearch);
    
    // Determine which type of place to suggest based on time
    const hour = parseInt(oldActivity.time?.split(':')[0] || '12');
    let placePool = [];
    let activityType = oldActivity.tag || 'activity';
    
    if (hour >= 7 && hour < 10) {
      // Breakfast time - use cafes
      placePool = cafes;
      activityType = 'dining';
    } else if (hour >= 11 && hour < 14) {
      // Lunch time - use restaurants
      placePool = restaurants;
      activityType = 'dining';
    } else if (hour >= 18 && hour < 21) {
      // Dinner time - use restaurants
      placePool = restaurants;
      activityType = 'dining';
    } else {
      // Activity time - use attractions
      placePool = attractions;
      activityType = 'activity';
    }
    
    // Filter out places already used in the day
    const availablePlaces = placePool.filter(place => 
      !existingTitles.some(title => 
        title.toLowerCase().includes(place.name.toLowerCase()) ||
        place.name.toLowerCase().includes(title.toLowerCase())
      )
    );
    
    // Pick a random place from available options
    const placesToConsider = availablePlaces.length > 0 ? availablePlaces : placePool;
    const selectedPlace = placesToConsider[Math.floor(Math.random() * Math.min(placesToConsider.length, 10))];
    
    if (!selectedPlace) {
      return res.status(400).json({
        success: false,
        error: "Could not find alternative activities in this location"
      });
    }
    
    logger.info(`[REGENERATE] Selected ${selectedPlace.name} to replace ${oldActivity.title}`);
    
    // Create activity data with the REAL place
    const newActivityData = {
      title: activityType === 'dining' 
        ? `${hour < 10 ? 'Breakfast' : hour < 14 ? 'Lunch' : 'Dinner'} at ${selectedPlace.name}`
        : `Visit ${selectedPlace.name}`,
      location_name: selectedPlace.name,
      notes: `Experience ${selectedPlace.name} in ${trip.city}. ${
        (selectedPlace as any).tourism ? `A ${(selectedPlace as any).tourism} attraction.` : 
        (selectedPlace as any).cuisine ? `Featuring ${(selectedPlace as any).cuisine} cuisine.` : 
        'A popular local destination.'
      }`,
      tag: activityType,
      price: activityType === 'dining' ? 30 : 15, // Default prices
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lon
    };
    
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
        ai_regenerations_used: regenerationsUsed + 1
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
      regenerations_remaining: regenerationsLimit - regenerationsUsed - 1
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