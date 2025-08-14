import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GenerateFullItineraryOptions {
  tripId: number;
  startDate: string;
  endDate: string;
  currentActivitiesCount?: number;
}

export function useGenerateFullItinerary() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateFullItinerary = async ({
    tripId,
    startDate,
    endDate,
    currentActivitiesCount = 0
  }: GenerateFullItineraryOptions): Promise<number> => {
    // Calculate expected activities
    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    const tripDays = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedActivities = tripDays * 3; // At least 3 per day

    // If we already have enough activities, return
    if (currentActivitiesCount >= expectedActivities) {
      console.log(`Trip already has ${currentActivitiesCount} activities for ${tripDays} days`);
      return currentActivitiesCount;
    }

    console.log(`Trip needs ${expectedActivities} activities for ${tripDays} days, currently has ${currentActivitiesCount}`);
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-full-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ trip_id: tripId })
      });

      if (!response.ok) {
        throw new Error('Failed to generate full itinerary');
      }

      const result = await response.json();
      const activitiesCreated = result.activitiesCreated || 0;
      
      console.log(`Generated ${activitiesCreated} activities for trip ${tripId}`);
      
      if (activitiesCreated > 0) {
        toast({
          title: "🎉 Full Itinerary Generated!",
          description: `Added ${activitiesCreated} activities to your ${tripDays}-day trip`,
        });
      }
      
      return activitiesCreated;
    } catch (error) {
      console.error('Failed to generate full itinerary:', error);
      toast({
        title: "Partial Itinerary",
        description: "We created your trip with a basic itinerary. You can add more activities manually.",
        variant: "default",
      });
      return 0;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateFullItinerary,
    isGenerating
  };
}