import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
import { CloudSun, Umbrella, ThermometerSun, Snowflake, Wind } from "lucide-react";

interface WeatherSuggestionsPanelProps {
  trip: ClientTrip;
  onAddActivity: (activity: any) => Promise<void>;
}

type WeatherCondition = "sunny" | "rainy" | "hot" | "cold" | "windy";

interface WeatherActivitySuggestion {
  title: string;
  category: "indoor" | "outdoor" | "either";
  description: string;
  locationName: string;
  tag: string;
}

interface WeatherResponse {
  weather: {
    condition: string;
    recommendation: string;
  };
  activities: WeatherActivitySuggestion[];
}

export default function WeatherSuggestionsPanel({ trip, onAddActivity }: WeatherSuggestionsPanelProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("sunny");
  
  const weatherIcons = {
    sunny: <CloudSun className="h-5 w-5 text-yellow-500" />,
    rainy: <Umbrella className="h-5 w-5 text-blue-500" />,
    hot: <ThermometerSun className="h-5 w-5 text-orange-500" />,
    cold: <Snowflake className="h-5 w-5 text-blue-400" />,
    windy: <Wind className="h-5 w-5 text-gray-500" />
  };
  
  const weatherLabels = {
    sunny: "Sunny",
    rainy: "Rainy",
    hot: "Hot",
    cold: "Cold",
    windy: "Windy"
  };

  const weatherMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.WEATHER_ACTIVITIES, {
        location: trip.city || trip.location || trip.title,
        date: selectedDate,
        weatherCondition: weatherLabels[weatherCondition]
      });
      return res.json() as Promise<WeatherResponse>;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not get weather-based suggestions. Please try again.",
        variant: "destructive",
      });
      console.error("Error getting weather suggestions:", error);
    },
  });

  const handleGetSuggestions = () => {
    weatherMutation.mutate();
  };

  const handleAddActivity = async (activitySuggestion: WeatherActivitySuggestion) => {
    try {
      // Format the activity for saving
      const activityDate = new Date(selectedDate);
      const formattedActivity = {
        tripId: trip.id,
        title: activitySuggestion.title,
        date: activityDate,
        time: "12:00", // Default time
        locationName: activitySuggestion.locationName,
        notes: activitySuggestion.description,
        tag: activitySuggestion.tag,
        order: 0 // Will be adjusted when added
      };
      
      await onAddActivity(formattedActivity);
      
      toast({
        title: "Activity added",
        description: `Added "${activitySuggestion.title}" to your itinerary.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add activity to your itinerary.",
        variant: "destructive",
      });
      console.error("Error adding activity:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Weather-Based Suggestions</h3>
        <p className="text-sm text-muted-foreground">
          Get activity recommendations based on weather conditions.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input 
            id="date" 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="weather">Weather Condition</Label>
          <Select 
            value={weatherCondition} 
            onValueChange={(value) => setWeatherCondition(value as WeatherCondition)}
          >
            <SelectTrigger id="weather" className="mt-1">
              <SelectValue placeholder="Select weather" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(weatherLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="flex items-center">
                  <div className="flex items-center gap-2">
                    {weatherIcons[key as WeatherCondition]}
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button 
        onClick={handleGetSuggestions}
        disabled={weatherMutation.isPending}
        className="w-full"
      >
        {weatherMutation.isPending ? "Getting suggestions..." : "Get Weather-Based Suggestions"}
      </Button>
      
      {weatherMutation.isSuccess && weatherMutation.data && (
        <div className="mt-4 space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium flex items-center">
              {weatherIcons[weatherCondition]}
              <span className="ml-2">{weatherMutation.data.weather.condition}</span>
            </h4>
            <p className="text-sm mt-1">{weatherMutation.data.weather.recommendation}</p>
          </div>
          
          <h4 className="font-medium">Suggested Activities</h4>
          <div className="space-y-3">
            {weatherMutation.data.activities.map((activity, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{activity.title}</h5>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          activity.category === 'indoor' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                            : activity.category === 'outdoor'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {activity.category}
                        </span>
                        <span className="ml-2">{activity.locationName}</span>
                      </div>
                      <p className="text-sm mt-2">{activity.description}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddActivity(activity)}
                      className="ml-2 flex-shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {weatherMutation.data.activities.length === 0 && (
              <p className="text-sm text-muted-foreground">No activities found for this weather condition.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}