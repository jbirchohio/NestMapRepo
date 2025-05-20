import OpenAI from "openai";

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
export async function tripAssistant(question: string, tripContext: any): Promise<string> {
  try {
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
