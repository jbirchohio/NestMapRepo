// Test script for AI location search
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function findLocation(searchQuery) {
  try {
    // Default to NYC context if not specified
    const context = searchQuery.toLowerCase().includes("nyc") || 
                  searchQuery.toLowerCase().includes("new york") ? 
                  "" : "in New York City";
    
    console.log(`Searching for: "${searchQuery}" ${context}`);
    
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
    console.log("AI Location result:", result);
    
    // Return the result
    return result;
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

// Test with a specific query
async function runTest() {
  const result = await findLocation("Leo House");
  console.log("Final result:", result);
}

runTest();