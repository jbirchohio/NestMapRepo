import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientActivity, ClientTrip, AIResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function useAIAssistant() {
  const { toast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Check AI usage before making request
  const checkAIUsage = async () => {
    const response = await apiRequest('GET', '/api/subscription/can-use/ai_suggestion');
    if (!response.canUse) {
      toast({
        title: "AI Limit Reached",
        description: response.upgradeMessage || "Upgrade to Pro for unlimited AI suggestions",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Track AI usage after successful request
  const trackAIUsage = async () => {
    await apiRequest('POST', '/api/subscription/track-usage', {
      feature: 'ai_suggestion',
      count: 1
    });
  };
  // Summarize a day's activities
  const summarizeDay = useMutation({
    mutationFn: async (activities: ClientActivity[]): Promise<AIResponse> => {
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUMMARIZE_DAY, { activities });
      await trackAIUsage();
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
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, {
        location,
        foodType,
      });
      await trackAIUsage();
      return res.json();
    },
  });

  // Detect scheduling conflicts
  const detectConflicts = useMutation({
    mutationFn: async (activities: ClientActivity[]): Promise<AIResponse> => {
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const res = await apiRequest("POST", API_ENDPOINTS.AI.DETECT_CONFLICTS, { activities });
      await trackAIUsage();
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
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const res = await apiRequest("POST", API_ENDPOINTS.AI.THEMED_ITINERARY, {
        location,
        theme,
        duration,
      });
      await trackAIUsage();
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
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, {
        question,
        tripContext,
      });
      await trackAIUsage();
      return res.json();
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
      if (!await checkAIUsage()) throw new Error('AI limit reached');
      const result = await apiRequest("POST", "/api/ai/optimize-itinerary", {
        tripId,
      });
      await trackAIUsage();
      return result;
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
