import OpenAI from "openai";
import { findLocation } from "./aiLocations";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Summarizes a daily itinerary
 */
export async function summarizeDay(activities: any[]): Promise<string> {
  try {
    if (!activities || activities.length === 0) {
      return "No activities planned for this day.";
    }

    const prompt = `
    Please summarize the following daily itinerary concisely while highlighting key activities, time allocations, and travel information:
    
    ${JSON.stringify(activities, null, 2)}
    
    Include a brief overview of what the day looks like, the main attractions/activities, meal plans if any, and overall travel distance if available.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "Unable to generate summary.";
  } catch (error) {
    console.error("Error in summarizeDay:", error);
    return "Error generating summary. Please try again later.";
  }
}

/**
 * Suggests food or coffee places near a specific location
 */
export async function suggestNearbyFood(location: string, foodType: string = "food"): Promise<any> {
  try {
    const prompt = `
    Please suggest 3-5 ${foodType} options near ${location}. Respond with JSON in this format:
    {
      "suggestions": [
        {
          "name": "Place Name",
          "type": "Type of cuisine or place",
          "description": "Brief description",
          "priceRange": "$-$$$",
          "distance": "approximate walking distance"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestNearbyFood:", error);
    return { suggestions: [] };
  }
}

/**
 * Detects time conflicts in a schedule
 */
export async function detectTimeConflicts(activities: any[]): Promise<any> {
  try {
    if (!activities || activities.length <= 1) {
      return { conflicts: [] };
    }

    const prompt = `
    Please analyze the following daily itinerary and identify any time conflicts, 
    tight connections, or logistical issues. Consider travel times between locations and the duration of activities:
    
    ${JSON.stringify(activities, null, 2)}
    
    Respond with a JSON object with the following structure:
    {
      "conflicts": [
        {
          "activityId1": "ID of first conflicting activity",
          "activityId2": "ID of second conflicting activity",
          "type": "One of: 'overlap', 'tight_connection', 'long_distance'",
          "description": "Description of the conflict",
          "severity": "One of: 'low', 'medium', 'high'"
        }
      ]
    }
    
    If there are no conflicts, return an empty array for "conflicts".
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in detectTimeConflicts:", error);
    return { conflicts: [] };
  }
}

/**
 * Generates a themed itinerary suggestion
 */
export async function generateThemedItinerary(
  location: string, 
  theme: string, 
  duration: string
): Promise<any> {
  try {
    const prompt = `
    Please create a ${duration} itinerary with the theme "${theme}" in ${location}.
    
    Respond with a JSON object with the following structure:
    {
      "title": "Catchy title for the itinerary",
      "description": "Brief description of the itinerary",
      "activities": [
        {
          "time": "Suggested time (e.g., '9:00 AM')",
          "title": "Name of the activity",
          "location": "Name of the location",
          "description": "Brief description",
          "tag": "One of: 'Culture', 'Food', 'Event', 'Rest', 'Shop'"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in generateThemedItinerary:", error);
    return { 
      title: "Error generating itinerary",
      description: "Could not generate themed itinerary",
      activities: [] 
    };
  }
}

/**
 * Handles general trip planning questions
 */
/**
 * Optimizes itinerary order to minimize travel time and avoid conflicts
 */
export async function optimizeItinerary(activities: any[], tripContext: any): Promise<{ optimizedActivities: any[], recommendations: string[] }> {
  try {
    if (!activities || activities.length === 0) {
      return { optimizedActivities: [], recommendations: ["No activities to optimize."] };
    }

    // Debug: Log what we're actually sending to AI
    console.log("DEBUG: Activities being sent to AI for optimization:", JSON.stringify(activities.map(a => ({
      id: a.id,
      title: a.title,
      time: a.time,
      locationName: a.locationName
    })), null, 2));

    const prompt = `You are an expert travel planner. I need you to IMMEDIATELY IDENTIFY TIME CONFLICTS and fix them.

CRITICAL TASK: Look at these activities and find any that have THE EXACT SAME TIME - this is a scheduling conflict that MUST be fixed!

Current Activities:
${JSON.stringify(activities.map(a => ({
  id: a.id,
  title: a.title,
  time: a.time,
  locationName: a.locationName,
  latitude: a.latitude,
  longitude: a.longitude,
  tag: a.tag,
  notes: a.notes
})), null, 2)}

STEP 1: SCAN FOR IDENTICAL TIMES
- Look through the "time" field for each activity
- If ANY two activities have the same time (like "13:00" and "13:00"), that's a CONFLICT
- Example: If Museum is at "13:00" and Food is at "13:00", you MUST change one of them

STEP 2: FIX CONFLICTS
- Move conflicting activities to different times
- Consider logical flow: meals at appropriate times, travel time between locations
- Space activities at least 30 minutes apart if they're at different locations

STEP 3: OPTIMIZE REMAINING SCHEDULE
- Group nearby activities together
- Ensure realistic travel time between distant locations
- Suggest appropriate meal times (breakfast 7-10am, lunch 11am-2pm, dinner 6-9pm)

Trip Context: ${tripContext.location || 'Unknown'}, ${tripContext.duration || 'Unknown'} days, Hotel: ${tripContext.hotel || 'Not specified'}

You MUST provide an optimization for EVERY activity. If no change needed, suggest the same time with reason "Time confirmed as optimal".

Respond with JSON:
{
  "optimizedActivities": [
    {
      "id": "activity_id",
      "suggestedTime": "HH:MM",
      "suggestedDay": 1,
      "reason": "Specific reason - especially mention if this fixes a time conflict"
    }
  ],
  "recommendations": [
    "State exactly which time conflicts were found and resolved",
    "List travel time improvements made",
    "Note any meal timing optimizations"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      optimizedActivities: result.optimizedActivities || [],
      recommendations: result.recommendations || ["Unable to generate optimization recommendations."]
    };
  } catch (error) {
    console.error("Error optimizing itinerary:", error);
    return {
      optimizedActivities: [],
      recommendations: ["Unable to optimize itinerary at this time. Please try again later."]
    };
  }
}

/**
 * Provides weather-based trip suggestions
 */
export async function suggestWeatherBasedActivities(
  location: string,
  date: string,
  weatherCondition: string
): Promise<any> {
  try {
    const prompt = `
    You are a travel planning assistant recommending activities based on weather conditions.
    
    Location: ${location}
    Date: ${date}
    Weather Condition: ${weatherCondition}
    
    Please provide activity recommendations appropriate for the weather conditions.
    Respond with a JSON object with the following structure:
    {
      "weather": {
        "condition": "Brief summary of the weather condition",
        "recommendation": "Overall advice for this weather"
      },
      "activities": [
        {
          "title": "Name of activity",
          "category": "indoor" or "outdoor" or "either",
          "description": "Brief description of the activity",
          "locationName": "A specific location for this activity if applicable",
          "tag": "One of: 'Culture', 'Food', 'Event', 'Rest', 'Shop'"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestWeatherBasedActivities:", error);
    return { 
      weather: {
        condition: "Unknown weather condition",
        recommendation: "Could not generate weather-based recommendations"
      },
      activities: [] 
    };
  }
}

/**
 * Suggests budget-friendly options for a trip
 */
export async function suggestBudgetOptions(
  location: string,
  budgetLevel: "low" | "medium" | "high",
  activityType?: string
): Promise<any> {
  try {
    const prompt = `
    You are a budget-conscious travel planning assistant.
    
    Location: ${location}
    Budget Level: ${budgetLevel}
    ${activityType ? `Activity Type: ${activityType}` : ''}
    
    Please suggest a variety of budget-friendly options for this trip.
    Respond with a JSON object with the following structure:
    {
      "budgetInfo": {
        "level": "${budgetLevel}",
        "estimatedDailyBudget": "Rough estimate in USD for daily expenses",
        "savingTips": ["2-3 tips for saving money in this location"]
      },
      "suggestions": [
        {
          "title": "Name of activity or place",
          "category": "accommodation" or "food" or "transportation" or "activity",
          "cost": "Estimated cost in USD",
          "description": "Brief description",
          "tip": "Money-saving tip for this suggestion"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestBudgetOptions:", error);
    return { 
      budgetInfo: {
        level: budgetLevel,
        estimatedDailyBudget: "Unknown",
        savingTips: ["Could not generate budget recommendations"]
      },
      suggestions: [] 
    };
  }
}

export async function tripAssistant(question: string, tripContext: any): Promise<string | { answer: string, activities?: any[] }> {
  try {
    // Check if user is explicitly requesting to import an itinerary
    const isExplicitImportRequest = 
      question.toLowerCase().includes("import my itinerary") || 
      question.toLowerCase().includes("add these activities") ||
      question.toLowerCase().includes("add this schedule") ||
      question.toLowerCase().includes("create activities from") ||
      question.toLowerCase().includes("parse this itinerary");
    
    // Check if this looks like a pasted itinerary - look for multiple time patterns
    const hasTimePatterns = (question.match(/\d{1,2}[\s]*[:-][\s]*\d{2}/g) || []).length > 2 ||  // 9:30, 10-30 formats
                           (question.match(/\d{1,2}[\s]*[AP]M/g) || []).length > 2;  // 9AM, 10 PM formats
    
    const hasDayPatterns = question.includes("Day") || 
                          question.includes("Monday") || question.includes("Tuesday") || 
                          question.includes("Wednesday") || question.includes("Thursday") || 
                          question.includes("Friday") || question.includes("Saturday") || 
                          question.includes("Sunday");
                          
    const hasMultipleLines = question.split('\n').length > 5;
    
    // Check for activity-like patterns
    const hasActivityPatterns = 
      (question.match(/visit|museum|park|breakfast|lunch|dinner|check[ -]in|arrive|leave|drive|walk/gi) || []).length > 3;
    
    // Detect itineraries with multiple time entries and sufficient length
    const isItinerary = (isExplicitImportRequest || 
                         (hasTimePatterns && hasMultipleLines && hasActivityPatterns)) && 
                        question.length > 100;
    
    if (isItinerary) {
      return await parseItinerary(question, tripContext);
    }
    
    // Detect weather-related queries
    const isWeatherQuery = question.toLowerCase().includes("weather") ||
                          question.toLowerCase().includes("rain") ||
                          question.toLowerCase().includes("sunny") ||
                          question.toLowerCase().includes("hot") ||
                          question.toLowerCase().includes("cold") ||
                          question.toLowerCase().includes("temperature") ||
                          question.toLowerCase().includes("forecast");
                          
    // Detect budget-related queries
    const isBudgetQuery = question.toLowerCase().includes("budget") ||
                         question.toLowerCase().includes("cheap") ||
                         question.toLowerCase().includes("expensive") ||
                         question.toLowerCase().includes("cost") ||
                         question.toLowerCase().includes("money") ||
                         question.toLowerCase().includes("affordable") ||
                         question.toLowerCase().includes("save") ||
                         question.toLowerCase().includes("price");
    
    const prompt = `
    You are a travel assistant helping with trip planning. You have access to the following trip information:
    
    ${JSON.stringify(tripContext, null, 2)}
    
    Question: ${question}
    
    Please provide a helpful, concise response to the user's question based on the trip information.
    If the question is about weather, provide weather-appropriate activities.
    If the question is about budget, suggest budget-friendly options.
    Consider the location and dates of the trip when providing personalized recommendations.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "I couldn't process that question. Could you try rephrasing it?";
  } catch (error) {
    console.error("Error in tripAssistant:", error);
    return "I'm having trouble answering that question right now. Please try again later.";
  }
}

/**
 * Parses a pasted itinerary and converts it to structured activities
 */
async function parseItinerary(itineraryText: string, tripContext: any): Promise<{ answer: string, activities: any[] }> {
  try {
    // Get the location context from the trip
    const city = tripContext.trip?.city || "New York City";
    
    // Get trip date range to help with date inference
    const tripStartDate = tripContext.trip?.startDate ? new Date(tripContext.trip.startDate) : new Date();
    const tripEndDate = tripContext.trip?.endDate ? new Date(tripContext.trip.endDate) : new Date(tripStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const prompt = `
    You are an expert itinerary parser and ACTIVITY CREATOR for a travel planning app. The user wants you to CREATE ACTUAL ACTIVITIES from their pasted itinerary.
    
    Trip Information:
    - City: ${city}
    - Trip Start Date: ${tripStartDate.toISOString().split('T')[0]}
    - Trip End Date: ${tripEndDate.toISOString().split('T')[0]}
    
    Itinerary Text:
    ${itineraryText}
    
    EXTREMELY IMPORTANT INSTRUCTIONS:
    1. You MUST create structured activities that will be ADDED TO THE DATABASE. This is NOT just a summary - these will become real activities in the app.
    2. EACH activity needs a specific date, time, title and real location name that can be found on a map.
    3. For days of the week (Wednesday, Thursday, etc.), calculate the actual YYYY-MM-DD dates based on the trip start/end dates.
    4. Extract START times only (not time ranges) and convert to 24-hour format (e.g., "14:30" not "2:30 PM").
    5. For location names, use OFFICIAL, PRECISE names as they appear on maps (e.g., "The Metropolitan Museum of Art" not "the art museum").
    6. Every activity MUST have a date and time.
    
    DO NOT:
    - Do not just summarize or rephrase the itinerary
    - Do not use vague location names - be VERY specific
    - Do not skip activities or combine multiple activities
    
    Format your response as a JSON object with:
    1. A brief "answer" explaining that you are CREATING ACTUAL ACTIVITIES, not just summarizing
    2. An "activities" array with objects containing:
       - title (string, required): Clear, specific activity name
       - time (string, required): Start time in 24-hour format like "14:30"
       - date (string, required): In YYYY-MM-DD format
       - locationName (string, required): EXACT, searchable location name
       - notes (string): Any additional details
       - tag (string): One of: "Food", "Culture", "Shop", "Rest", "Transport", "Event"
    
    DOUBLE-CHECK that each activity has a proper date and time, and that location names are specific enough to be found on a map.
    
    This is CREATING REAL DATABASE ENTRIES, not just a summary. The system will take your response and create actual activities in the app.
    `;

    // Define the schema for the activity parsing function
    const parseItineraryFunction = {
      name: "parse_itinerary_to_activities",
      description: "Extract structured trip activities from a pasted itinerary. Do not summarize - only return exact structured activities.",
      parameters: {
        type: "object",
        properties: {
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { 
                  type: "string", 
                  description: "Date of activity in YYYY-MM-DD format. If day of week is given, calculate the actual date based on trip start date."
                },
                time: { 
                  type: "string", 
                  description: "Time of the activity in 24-hour format (14:30). Extract only start time if a range is given."
                },
                title: { 
                  type: "string", 
                  description: "Clear title of the activity" 
                },
                locationName: { 
                  type: "string", 
                  description: "Exact location name as it would appear on a map search" 
                },
                notes: { 
                  type: "string", 
                  description: "Any extra details or instructions" 
                },
                tag: {
                  type: "string",
                  description: "Category tag (one of: 'Food', 'Culture', 'Shop', 'Rest', 'Transport', 'Event')"
                }
              },
              required: ["date", "time", "title", "locationName"]
            }
          }
        },
        required: ["activities"]
      }
    };
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a travel assistant that converts freeform pasted itineraries into a list of structured activities.

DO NOT summarize or paraphrase. Instead, extract each activity into a structured format with date, time, title, location, and optional notes.

The date should be in YYYY-MM-DD format. If only days of the week are mentioned (e.g., "Wednesday"), calculate the actual date based on:
- Trip Start Date: ${tripStartDate.toISOString().split('T')[0]}
- Trip End Date: ${tripEndDate.toISOString().split('T')[0]}

The time should be in 24-hour format (e.g., "14:30" not "2:30 PM"). If a time range is given (e.g., "2:00-3:00 PM"), use the start time.

The locationName should be the EXACT location name as it would appear on a map search (e.g., "The Metropolitan Museum of Art" not "the art museum").

Example input:
"Wednesday - Museum Day
9 AM - Metropolitan Museum of Art
2-4 PM - Natural History Museum
Evening - Dinner at Le Bernardin"

Expected output activities:
[
  { "date": "2025-05-21", "time": "09:00", "title": "Visit Art Museum", "locationName": "The Metropolitan Museum of Art", "tag": "Culture" },
  { "date": "2025-05-21", "time": "14:00", "title": "Explore Natural History", "locationName": "American Museum of Natural History", "tag": "Culture" },
  { "date": "2025-05-21", "time": "19:00", "title": "Dinner", "locationName": "Le Bernardin", "notes": "Fine dining restaurant", "tag": "Food" }
]

IMPORTANT: Each activity MUST have a specific locationName that can be found on a map, a date in YYYY-MM-DD format, and a time in 24-hour format.`
        },
        { 
          role: "user", 
          content: itineraryText 
        }
      ],
      functions: [parseItineraryFunction],
      function_call: { name: "parse_itinerary_to_activities" }
    });

    // Handle the function call response format
    let activities = [];
    let answer = "I've processed your itinerary and extracted activities.";
    
    // Parse the function call arguments
    if (response.choices[0].message.function_call) {
      try {
        const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments || "{}");
        activities = functionArgs.activities || [];
        console.log(`Extracted ${activities.length} activities from itinerary using function call`);
      } catch (error) {
        console.error("Error parsing function call arguments:", error);
      }
    } 
    // Fallback to old format if function call isn't available
    else if (response.choices[0].message.content) {
      try {
        const result = JSON.parse(response.choices[0].message.content || "{}");
        activities = result.activities || [];
        answer = result.answer || answer;
        console.log(`Extracted ${activities.length} activities from itinerary using content parsing`);
      } catch (error) {
        console.error("Error parsing content:", error);
      }
    }
    
    // Create a result object with both the answer and activities
    const result = {
      answer,
      activities
    };
    
    console.log("Parsed itinerary result:", result);
    
    // Process locations to get coordinates where possible
    if (result.activities && Array.isArray(result.activities)) {
      // For each activity location, try to get coordinates
      for (let i = 0; i < result.activities.length; i++) {
        const activity = result.activities[i];
        
        // Skip if no location
        if (!activity.locationName) continue;
        
        try {
          // Try to find the location
          const locationResult = await findLocation(activity.locationName, city);
          console.log(`Location search for "${activity.locationName}":`, locationResult);
          
          // If we have location results, use the first one
          if (locationResult.locations && locationResult.locations.length > 0) {
            const firstLocation = locationResult.locations[0];
            
            // Add location details to the activity
            result.activities[i].locationName = firstLocation.name;
            
            // We need to geocode this location to get coordinates
            // This would use our existing geocoding function, but for now we'll skip it
            // as it would require importing additional modules
          }
        } catch (locError) {
          console.error(`Error finding location for "${activity.locationName}":`, locError);
        }
      }
    }
    
    return {
      answer: result.answer || "I've processed your itinerary and extracted the activities.",
      activities: result.activities || []
    };
  } catch (error) {
    console.error("Error in parseItinerary:", error);
    return { 
      answer: "I had trouble parsing your itinerary. Please check the format and try again.",
      activities: []
    };
  }
}
