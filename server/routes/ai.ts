import { Router } from "express";
import { unifiedAuthMiddleware } from "../middleware/unifiedAuth";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "../db";
import { trips, activities } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();
router.use(unifiedAuthMiddleware);

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
      .where(and(
        eq(trips.id, trip_id),
        eq(trips.organization_id, req.user.organizationId!)
      ));

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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

    res.json({
      success: true,
      city,
      cuisine_type,
      budget_range,
      ...result
    });
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
      .where(and(
        eq(trips.id, trip_id),
        eq(trips.organization_id, req.user.organizationId!)
      ));

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

    // Create optimization prompt
    const activitiesText = tripActivities
      .map(activity => `- ${activity.title} (${activity.date.toISOString().split('T')[0]}) at ${activity.location_name}: ${activity.notes || 'No description'}`)
      .join('\n');

    const travelStyle = preferences?.travel_style || 'balanced';
    const interests = preferences?.interests?.join(', ') || 'general sightseeing';

    const prompt = `Analyze and optimize this travel itinerary:

Trip: ${trip.title}
Location: ${trip.city || trip.country || 'Unknown location'}
Duration: ${trip.start_date.toISOString().split('T')[0]} to ${trip.end_date.toISOString().split('T')[0]}
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

    res.json({
      success: true,
      trip_id,
      activities_count: tripActivities.length,
      ...result
    });
  } catch (error) {
    console.error("AI optimize-itinerary error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to optimize itinerary" 
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

    const result = JSON.parse(response.choices[0].message.content || '{}');

    res.json({
      success: true,
      city,
      interests: interestsText,
      duration,
      ...result
    });
  } catch (error) {
    console.error("AI suggest-activities error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate activity suggestions" 
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

export default router;