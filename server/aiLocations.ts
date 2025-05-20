import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Finds a location using AI to handle fuzzy search and returns detailed address information
 */
export async function findLocation(searchQuery: string): Promise<{
  name: string;
  fullAddress: string;
  city: string;
  region?: string;
  country?: string;
  description?: string;
  error?: string;
}> {
  try {
    // Default to NYC context if not specified
    const context = searchQuery.toLowerCase().includes("nyc") || 
                    searchQuery.toLowerCase().includes("new york") ? 
                    "" : "in New York City";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a location identification expert that specializes in finding exact addresses from vague or partial descriptions. " +
            "Focus on real places that exist. If the location appears to be a landmark, hotel, restaurant, museum, etc., " +
            "provide the most accurate information about the real place."
        },
        {
          role: "user",
          content: `Find this location: "${searchQuery}" ${context}. If it's a landmark, business, or known place, provide its real information.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const result = JSON.parse(content);
    
    // Check if we have a valid location
    if (!result.name || !result.address) {
      return {
        name: searchQuery,
        fullAddress: searchQuery,
        city: "New York City",
        error: "Could not find specific location details"
      };
    }
    
    return {
      name: result.name,
      fullAddress: result.address,
      city: result.city || "New York City",
      region: result.region,
      country: result.country,
      description: result.description
    };
  } catch (error) {
    console.error("Error finding location with AI:", error);
    return {
      name: searchQuery,
      fullAddress: searchQuery,
      city: "New York City",
      error: "Error processing location search"
    };
  }
}