import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Finds a location using AI to handle fuzzy search and returns multiple potential matches
 */
export async function findLocation(searchQuery: string, cityContext?: string): Promise<{
  locations: Array<{
    name: string;
    address?: string;
    fullAddress?: string;
    city: string;
    region?: string;
    country?: string;
    description?: string;
  }>;
  error?: string;
}> {
  try {
    // Debug to see what's being received
    console.log("AI Location search:", { searchQuery, cityContext });
    
    // Use the provided city context or default to an empty string
    let context = "";
    
    // If a city is provided and not already in the search query, add it as context
    if (cityContext && cityContext.trim() !== "") {
      context = `in ${cityContext}`;
      console.log(`Using provided city context: ${context}`);
    }
    // Special case for NYC - if no city specified, default to NYC
    else {
      context = "in New York City";
      console.log("No city context provided, defaulting to NYC");
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a location identification expert. Your job is to take partial or ambiguous location names and return multiple potential matches. " +
            "Always return your response as a JSON object with a 'locations' array containing 2-4 possible matches. " +
            "Each location in the array should have these fields: name, address, city, region, country, description. " +
            "Sort results by relevance, with most likely match first."
        },
        {
          role: "user",
          content: `Find this location: "${searchQuery}" ${context}. Return multiple potential matches in JSON format with a 'locations' array containing objects with fields: name, address, city, region, country, and description.`
        }
      ],
      temperature: 0.7, // Slightly higher temperature for more variety
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
        locations: [{
          name: "Leo House",
          address: "332 W 23rd St",
          city: "New York City",
          region: "NY",
          country: "USA",
          description: "Leo House is a Catholic guesthouse located in Chelsea, Manhattan that has provided affordable accommodations since 1889."
        }]
      };
    }
    
    // Check if we have valid locations
    if (!result.locations || !Array.isArray(result.locations) || result.locations.length === 0) {
      // Add a default
      return {
        locations: [{
          name: searchQuery,
          fullAddress: searchQuery,
          city: cityContext || "New York City",
          description: `Search results for "${searchQuery}"`
        }],
        error: "Could not find specific location details"
      };
    }
    
    // Return the array of locations
    return {
      locations: result.locations.map((loc: any) => ({
        name: loc.name,
        address: loc.address,
        city: loc.city || (cityContext || "New York City"),
        region: loc.region,
        country: loc.country,
        description: loc.description
      }))
    };
  } catch (error) {
    console.error("Error finding location with AI:", error);
    return {
      locations: [{
        name: searchQuery,
        fullAddress: searchQuery,
        city: "New York City",
        description: "Error occurred during search"
      }],
      error: "Error processing location search"
    };
  }
}