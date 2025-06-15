import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
import { UtensilsCrossed, Coffee, MapPin, DollarSign } from "lucide-react";

// Define a proper Activity interface to replace 'any'
interface FoodActivity {
  title: string;
  date: Date;
  time: string;
  locationName: string;
  notes?: string;
  tag?: string;
  latitude?: string;
  longitude?: string;
  travelMode?: string;
}

interface FoodSuggestionsPanelProps {
  trip: ClientTrip;
  onAddActivity: (activity: FoodActivity) => Promise<void>;
}

interface FoodSuggestion {
  name: string;
  type: string;
  description: string;
  priceRange: string;
  distance: string;
}

interface FoodResponse {
  suggestions: FoodSuggestion[];
}

export default function FoodSuggestionsPanel({ trip, onAddActivity }: FoodSuggestionsPanelProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);

  const foodMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, {
        location: trip.city || trip.location || trip.title,
        foodType: "food"
      });
      return res.json() as Promise<FoodResponse>;
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        toast({
          title: "No suggestions found",
          description: "Couldn't find food recommendations for this location.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not get food suggestions. Please try again.",
        variant: "destructive",
      });
      console.error("Error getting food suggestions:", error);
    },
  });

  const handleGetSuggestions = () => {
    foodMutation.mutate();
  };

  const handleAddFood = async (suggestion: FoodSuggestion) => {
    try {
      const formattedActivity = {
        tripId: trip.id,
        title: suggestion.name,
        locationName: suggestion.name,
        tag: "food",
        notes: `${suggestion.type} - ${suggestion.description}\nPrice: ${suggestion.priceRange}\nDistance: ${suggestion.distance}`,
        time: "12:00", // Default lunch time
        date: new Date().toISOString().split('T')[0] // Today's date
      };

      await onAddActivity(formattedActivity);
      
      toast({
        title: "Added to trip!",
        description: `${suggestion.name} has been added to your itinerary.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add this restaurant to your trip.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Food & Coffee Recommendations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get personalized restaurant and cafe suggestions for {trip.city || trip.location || trip.title}
        </p>
        
        <Button 
          onClick={handleGetSuggestions} 
          disabled={foodMutation.isPending}
          className="w-full"
        >
          {foodMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Getting Recommendations...
            </>
          ) : (
            <>
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Get Food Recommendations
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            Found {suggestions.length} recommendations:
          </h4>
          
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  {suggestion.type.toLowerCase().includes('coffee') ? (
                    <Coffee className="h-4 w-4 mr-2 text-amber-600" />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4 mr-2 text-orange-600" />
                  )}
                  {suggestion.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {suggestion.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {suggestion.priceRange}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {suggestion.distance}
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleAddFood(suggestion)}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  Add to Trip
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
