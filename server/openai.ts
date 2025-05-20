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
    // Check if this looks like a pasted itinerary
    const isItinerary = question.includes("Day") && 
                        (question.includes("AM") || question.includes("PM")) && 
                        question.length > 200;
    
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
    
    const prompt = `
    You are a travel itinerary parser. The user has pasted a travel itinerary text. 
    Convert it into structured activities for their trip planning app.
    
    Trip City: ${city}
    Itinerary Text:
    ${itineraryText}
    
    Please extract each activity, including:
    1. Date and time (if available)
    2. Activity title
    3. Location name (this is very important)
    4. Any notes or descriptions
    
    Format your response as a JSON object with:
    1. A brief "answer" explaining what you've done
    2. An "activities" array with objects containing:
       - title (string): The activity name
       - time (string): In 24-hour format like "14:30"
       - date (string): In YYYY-MM-DD format
       - locationName (string): The name of the location
       - notes (string): Any additional details
       - tag (string): Category tag (one of: "Food", "Culture", "Shop", "Rest", "Transport", "Event")
    
    For each location, try to determine the most accurate and specific location name that could be found on a map.
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
