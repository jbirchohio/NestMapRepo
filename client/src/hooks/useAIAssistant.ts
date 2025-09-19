import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity, ClientTrip, AIResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function useAIAssistant() {
  const { toast } = useToast();
  // Summarize a day's activities
  const summarizeDay = useMutation({
    // Server expects { trip_id, date }
    mutationFn: async ({ tripId, date }: { tripId: number; date: string }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUMMARIZE_DAY, { tripId, date });
      return res as AIResponse;
    },
  });

  // Suggest food near a location
  const suggestFood = useMutation({
    // Server expects { city, cuisine_type?, budget_range? }
    mutationFn: async ({ city, cuisineType, budgetRange }: { city: string; cuisineType?: string; budgetRange?: 'budget' | 'mid-range' | 'luxury' }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, {
        city,
        ...(cuisineType ? { cuisineType } : {}),
        ...(budgetRange ? { budgetRange } : {}),
      });
      return res as AIResponse;
    },
  });

  // Detect scheduling conflicts
  const detectConflicts = useMutation({
    mutationFn: async (activities: ClientActivity[]): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.DETECT_CONFLICTS, { activities });
      return res as AIResponse;
    },
  });

  // Generate a themed itinerary
  const generateThemedItinerary = useMutation({
    mutationFn: async ({
      location,
      theme,
      duration,
    }: {
      location: string;
      theme: string;
      duration: string;
    }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.THEMED_ITINERARY, {
        location,
        theme,
        duration,
      });
      return res as AIResponse;
    },
  });

  // Send a question to the trip assistant
  const askTripAssistant = useMutation({
    mutationFn: async ({
      question,
      tripContext,
      tripId,
      conversationHistory,
    }: {
      question: string;
      tripContext: { trip: ClientTrip; currentDate: Date; activities: ClientActivity[] };
      tripId?: number;
      conversationHistory?: Array<{ role: string; content: string }>;
    }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, {
        question,
        tripId,
        tripContext,
        conversationHistory,
      });
      return res as AIResponse;
    },
  });

  // Optimize itinerary order
  const optimizeItinerary = useMutation({
    mutationFn: async (tripId: number): Promise<{
      optimizedActivities: Array<{
        id: string;
        suggestedTime: string;
        suggestedDay: number;
        reason: string;
      }>;
      recommendations: string[];
    }> => {
      const result = await apiRequest("POST", "/api/ai/optimize-itinerary", { tripId });
      return result as any;
    },
  });

  return {
    summarizeDay,
    suggestFood,
    detectConflicts,
    generateThemedItinerary,
    askTripAssistant,
    optimizeItinerary,
  };
}
