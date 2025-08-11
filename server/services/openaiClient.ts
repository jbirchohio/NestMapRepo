// Centralized OpenAI client service
import OpenAI from "openai";
import { CONFIG } from '../config/constants';

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

// Use configured model from environment or default to cost-effective option
export const OPENAI_MODEL = CONFIG.AI_MODEL; // Configurable via AI_MODEL env var