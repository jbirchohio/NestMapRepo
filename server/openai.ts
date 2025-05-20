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
    
    const prompt = `
    You are a travel assistant helping with trip planning. You have access to the following trip information:
    
    ${JSON.stringify(tripContext, null, 2)}
    
    Question: ${question}
    
    Please provide a helpful, concise response to the user's question based on the trip information.
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

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
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
