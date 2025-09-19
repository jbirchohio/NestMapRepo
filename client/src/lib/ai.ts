import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/constants';

// Shared lightweight helpers for AI endpoints

export async function aiSuggestActivities(payload: { city: string; interests: string[]; duration?: number }) {
  return apiRequest('POST', API_ENDPOINTS.AI.SUGGEST_ACTIVITIES, payload);
}

export async function aiWeatherActivities(payload: { location: string; date?: string; weatherCondition: string }) {
  return apiRequest('POST', API_ENDPOINTS.AI.WEATHER_ACTIVITIES, payload);
}

export async function aiFindLocation(payload: { searchQuery: string; cityContext?: string; limit?: number }) {
  return apiRequest('POST', API_ENDPOINTS.AI.FIND_LOCATION, payload);
}

export async function aiChat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
  return apiRequest('POST', API_ENDPOINTS.AI.CHAT, { messages });
}

export async function aiTripAssistant(payload: { tripId?: number | string; question: string; tripContext: any; conversationHistory?: any[] }) {
  const body = {
    tripId: payload.tripId,
    question: payload.question,
    tripContext: payload.tripContext,
    conversationHistory: payload.conversationHistory,
  };
  return apiRequest('POST', API_ENDPOINTS.AI.ASSISTANT, body);
}

export async function aiGenerateWeekend(payload: { destination: string; startDate: string; endDate: string; interests?: string[] }) {
  return apiRequest('POST', '/api/ai/generate-weekend', payload);
}

export async function aiRecommendTours(payload: { destination: string; startDate: string; endDate: string; interests?: string[] }) {
  return apiRequest('POST', '/api/ai/recommend-tours', payload);
}

export async function aiGenerateTrip(payload: { prompt?: string; conversation?: any[]; tripId?: number }) {
  return apiRequest('POST', '/api/ai/generate-trip', payload);
}

export async function aiGenerateFullItinerary(payload: { trip_id: number }) {
  return apiRequest('POST', API_ENDPOINTS.AI.GENERATE_FULL_ITINERARY, payload);
}
