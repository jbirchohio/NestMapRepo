import { Router } from "express";
import { jwtAuthMiddleware } from "../middleware/jwtAuth";
import { z } from "zod";
import { aiRateLimit } from "../middleware/rateLimiting";
import { db } from "../db-connection";
import { trips, activities } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getOpenAIClient, OPENAI_MODEL } from '../services/openaiClient';

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
    console.error("AI summarize-day error:", error);
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
    const cacheKey = aiCache.generateKey('food', city, { cuisine_type, budget_range });
    const cachedResult = aiCache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Returning cached food suggestions for: ${city}`);
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
    console.error("AI suggest-food error:", error);
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
      .map(activity => `- ID: ${activity.id}, Title: "${activity.title}", Date: ${activity.date.toISOString().split('T')[0]}, Time: ${activity.time || 'No time set'}, Location: ${activity.location_name}`)
      .join('\n');

    const travelStyle = preferences?.travel_style || 'balanced';
    const interests = preferences?.interests?.join(', ') || 'general sightseeing';

    const prompt = `Analyze and optimize this travel itinerary by suggesting better times for activities:

Trip: ${trip.title}
Location: ${trip.city || trip.country || 'Unknown location'}
Duration: ${trip.start_date.toISOString().split('T')[0]} to ${trip.end_date.toISOString().split('T')[0]}
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
    console.error("AI optimize-itinerary error:", error);
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
                          lastMessage.includes("weekend");
    
    // Add system prompt for trip planning context
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI travel assistant. Help users plan their trips by providing friendly, conversational responses.

${isCreatingTrip ? `IMPORTANT: The user wants to create a trip. You should:
1. Provide a conversational response describing the trip plan
2. Include a JSON block at the end with trip details AND specific activities

Include this EXACT format at the end of your response:

<TRIP_JSON>
{
  "title": "Trip title here",
  "description": "Brief trip description",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD", 
  "city": "City name",
  "country": "Country name",
  "activities": [
    {
      "title": "Specific activity name (e.g., 'Visit Empire State Building')",
      "date": "YYYY-MM-DD",
      "time": "HH:MM (e.g., '10:00')",
      "locationName": "Exact location/address",
      "notes": "Brief description or tips"
    }
  ]
}
</TRIP_JSON>

Guidelines for activities:
- Include 3-5 SPECIFIC activities per day
- Use real place names (museums, restaurants, landmarks, etc.)
- Provide realistic times
- Mix different types of activities (sightseeing, dining, entertainment)
- For the city they mentioned, use actual popular attractions

CRITICAL: Use REAL, SPECIFIC places that actually exist. Examples:

For NYC:
- "Visit Empire State Building" at "350 5th Ave, New York, NY 10118"
- "Lunch at Joe's Pizza" at "7 Carmine St, New York, NY 10014"  
- "See The Lion King on Broadway" at "Minskoff Theatre, 200 W 45th St, New York, NY"
- "Walk the High Line" at "High Line Park, New York, NY 10011"
- "Brunch at Jacob's Pickles" at "509 Amsterdam Ave, New York, NY 10024"

For other cities, use similarly specific, real locations:
- London: "Visit British Museum" at "Great Russell St, London WC1B 3DG"
- Paris: "Lunch at Café de Flore" at "172 Bd Saint-Germain, 75006 Paris"
- Tokyo: "Dinner at Ichiran Ramen" at "3-34-11 Shinjuku, Tokyo"

Make dates start from the next Friday if not specified.` : 'Do not include any JSON blocks unless the user explicitly asks to create or plan a trip.'}

Keep your main response conversational and helpful.`
    };
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000  // Increased for detailed activities
    });
    
    const aiResponse = response.choices[0].message.content || "";
    
    // Extract trip JSON if present
    let tripSuggestion = null;
    const jsonMatch = aiResponse.match(/<TRIP_JSON>([\s\S]*?)<\/TRIP_JSON>/);
    if (jsonMatch) {
      try {
        tripSuggestion = JSON.parse(jsonMatch[1]);
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
              const coords = await geocodeLocation(activity.locationName, tripSuggestion.city);
              if (coords) {
                activity.latitude = coords.latitude;
                activity.longitude = coords.longitude;
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse trip JSON:", e);
        tripSuggestion = null;
      }
    }
    
    // Remove the JSON block from the display message
    const displayMessage = aiResponse.replace(/<TRIP_JSON>[\s\S]*?<\/TRIP_JSON>/, '').trim();
    
    res.json({
      success: true,
      message: displayMessage,
      tripSuggestion
    });
  } catch (error) {
    console.error("AI chat error:", error);
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
    const cacheKey = aiCache.generateKey('activities', city, { interests, duration });
    const cachedResult = aiCache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Returning cached activity suggestions for: ${city}`);
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
    console.error("AI suggest-activities error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate activity suggestions" 
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
      console.log(`Returning cached location search for: ${search_query}`);
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
    console.error("AI find-location error:", error);
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
    console.error("AI translate-content error:", error);
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
    const cacheKey = aiCache.generateKey('weather-activities', location, { weatherCondition, date });
    const cachedResult = aiCache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Returning cached weather activities for: ${location}, ${weatherCondition}`);
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
    aiCache.set(cacheKey, responseData, aiCache.DURATIONS.DAILY_SUMMARY);
    
    res.json(responseData);
  } catch (error) {
    console.error("AI weather-activities error:", error);
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
    const cacheKey = aiCache.generateKey('budget', location, { budgetLevel, activityType });
    const cachedResult = aiCache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Returning cached budget options for: ${location}, ${budgetLevel}`);
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
    console.error("AI budget-options error:", error);
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
    console.error("AI trip-assistant error:", error);
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
    console.error("AI recommend-tours error:", error);
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
    
    // Use AI to extract structured data from natural language prompt
    const extractionPrompt = `Extract trip details from this request and return as JSON:
"${prompt}"

Return format:
{
  "destination": "city name",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD", 
  "budget": number,
  "groupSize": number,
  "tripPurpose": "business/leisure/mixed",
  "preferences": {
    "accommodationType": "luxury/business/budget",
    "activityTypes": ["type1", "type2"],
    "foodTypes": ["cuisine1", "cuisine2"]
  }
}

If any information is missing, use reasonable defaults or mark as null.`;

    const extractionResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: extractionPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const extractedData = JSON.parse(extractionResponse.choices[0].message.content || "{}");
    
    // Check if we need more information
    const missingFields = [];
    if (!extractedData.destination) missingFields.push("destination");
    if (!extractedData.startDate) missingFields.push("travel dates");
    if (!extractedData.budget) missingFields.push("budget");
    
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

    // Generate vacation itinerary using AI
    const itineraryPrompt = `Create a detailed ${extractedData.tripPurpose || 'vacation'} itinerary for:
Destination: ${extractedData.destination}
Dates: ${extractedData.startDate} to ${extractedData.endDate}
Budget: $${extractedData.budget || 3000} USD total
Travelers: ${extractedData.groupSize || 2} people
Accommodation preference: ${extractedData.preferences?.accommodationType || 'mid-range'}
Activities: ${extractedData.preferences?.activityTypes?.join(', ') || 'sightseeing, culture, relaxation'}
Food preferences: ${extractedData.preferences?.foodTypes?.join(', ') || 'local cuisine, popular restaurants'}

Please provide a complete vacation itinerary with:
1. Recommended flights (with realistic prices)
2. Hotel suggestions (2-3 options with nightly rates)
3. Daily activities schedule (morning, afternoon, evening)
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
    });

    const generatedTrip = JSON.parse(itineraryResponse.choices[0].message.content || "{}");
    
    // Format activities for frontend consumption
    const formattedActivities = generatedTrip.activities.map((activity: any, index: number) => ({
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
          description: activity.description,
          date: new Date(activity.date),
          time: activityTime,
          duration: activity.duration,
          location: activity.location,
          category: activity.category,
          price: activity.price,
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
      meals: generatedTrip.meals,
      groundTransportation: generatedTrip.transportation,
      budgetBreakdown: generatedTrip.budgetBreakdown,
      recommendations: generatedTrip.recommendations,
      weatherConsiderations: generatedTrip.weatherConsiderations,
      message: "Your personalized itinerary has been created!",
      savedToTrip: !!tripId
    });
    
  } catch (error) {
    console.error("AI generate-trip error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate trip itinerary" 
    });
  }
});

export default router;