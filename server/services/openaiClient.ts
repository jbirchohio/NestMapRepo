// Centralized OpenAI client service
import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
  
  return openaiClient;
}

// Helper function to ensure we use a cost-effective model
export const OPENAI_MODEL = "gpt-3.5-turbo"; // Using GPT-3.5 for 95% cost savings vs GPT-4o!