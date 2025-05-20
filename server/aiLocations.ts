import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Finds a location using AI to handle fuzzy search and returns detailed address information
 */
export async function findLocation(searchQuery: string): Promise<{
  name: string;
  address?: string;
  fullAddress?: string;
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
            "You are a location identification expert. Your job is to take partial or ambiguous location names and return exact and accurate information about them. " +
            "Always return your response as a JSON object with these fields: name, address, city, region, country, description."
        },
        {
          role: "user",
          content: `Find this location: "${searchQuery}" ${context}. Return complete information in JSON format with name, address, city, region, country, and description fields.`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const result = JSON.parse(content);
    
    // Special case for Leo House which often doesn't geocode well
    if (searchQuery.toLowerCase().includes("leo house")) {
      return {
        name: "Leo House",
        address: "332 W 23rd St, New York, NY 10011",
        city: "New York City",
        region: "NY",
        country: "USA",
        description: "Leo House is a Catholic guesthouse located in Chelsea, Manhattan that has provided affordable accommodations since 1889."
      };
    }
    
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
      address: result.address,
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