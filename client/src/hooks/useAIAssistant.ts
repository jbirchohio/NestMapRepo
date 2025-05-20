import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity, ClientTrip, AIResponse } from "@/lib/types";

export default function useAIAssistant() {
  // Summarize a day's activities
  const summarizeDay = useMutation({
    mutationFn: async (activities: ClientActivity[]): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUMMARIZE_DAY, { activities });
      return res.json();
    },
  });

  // Suggest food near a location
  const suggestFood = useMutation({
    mutationFn: async ({
      location,
      foodType = "food",
    }: {
      location: string;
      foodType?: string;
    }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, {
        location,
        foodType,
      });
      return res.json();
    },
  });

  // Detect scheduling conflicts
  const detectConflicts = useMutation({
    mutationFn: async (activities: ClientActivity[]): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.DETECT_CONFLICTS, { activities });
      return res.json();
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
      return res.json();
    },
  });

  // Send a question to the trip assistant
  const askTripAssistant = useMutation({
    mutationFn: async ({
      question,
      tripContext,
    }: {
      question: string;
      tripContext: {
        trip: ClientTrip;
        currentDate: Date;
        activities: ClientActivity[];
      };
    }): Promise<AIResponse> => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, {
        question,
        tripContext,
      });
      return res.json();
    },
  });

  return {
    summarizeDay,
    suggestFood,
    detectConflicts,
    generateThemedItinerary,
    askTripAssistant,
  };
}
