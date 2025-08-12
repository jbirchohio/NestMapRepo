import { useState, useEffect } from "react";
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
import { CloudSun, Umbrella, ThermometerSun, Snowflake, Wind, Sparkles, MapPin } from "lucide-react";
import TripDatePicker from "@/components/TripDatePicker";

interface WeatherSuggestionsPanelProps {
  trip: ClientTrip;
  activities?: any[];
  onAddActivity: (activity: any) => Promise<void>;
}

type WeatherCondition = "sunny" | "rainy" | "hot" | "cold" | "windy";

interface WeatherActivitySuggestion {
  title?: string;
  name: string;
  category?: "indoor" | "outdoor" | "either";
  description: string;
  locationName?: string;
  location?: string;
  tag?: string;
  duration?: string;
  weatherSuitability?: string;
  tips?: string;
}

interface WeatherResponse {
  activities: Array<{
    name: string;
    description: string;
    duration: string;
    location: string;
    weatherSuitability: string;
    tips: string;
  }>;
}

interface WeatherData {
  date: string;
  condition: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  unit: 'C' | 'F';
}

interface WeatherForecastResponse {
  forecast?: WeatherData[];
  current?: WeatherData;
}

export default function WeatherSuggestionsPanel({ trip, activities = [], onAddActivity }: WeatherSuggestionsPanelProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (trip.startDate) {
      const date = new Date(trip.startDate);
      // Get local date string
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  });
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("sunny");
  const [autoWeatherData, setAutoWeatherData] = useState<WeatherData[]>([]);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [selectedDayWeather, setSelectedDayWeather] = useState<WeatherData | null>(null);
  
  // Track recently added activities in this session
  const [pendingActivityTimes, setPendingActivityTimes] = useState<string[]>([]);
  
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

  // Auto weather detection
  const autoWeatherMutation = useMutation({
    mutationFn: async () => {
      const tripDates = [];
      if (trip.startDate) {
        const start = new Date(trip.startDate);
        const end = trip.endDate ? new Date(trip.endDate) : start;
        
        // Create new date for iteration to avoid modifying original
        let currentDate = new Date(start);
        while (currentDate <= end) {
          // Format date consistently without timezone issues
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          tripDates.push(`${year}-${month}-${day}`);
          
          // Move to next day
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      const res = await apiRequest("POST", API_ENDPOINTS.WEATHER.FORECAST, {
        location: trip.city || trip.location || trip.title,
        dates: tripDates
      });
      return res as WeatherForecastResponse;
    },
    onSuccess: (data) => {
      if (data.forecast && data.forecast.length > 0) {
        setAutoWeatherData(data.forecast);
        setIsAutoDetected(true);
        toast({
          title: "Weather detected!",
          description: `Found weather data for ${data.forecast.length} days of your trip.`,
        });
      } else if (data.current) {
        setAutoWeatherData([data.current]);
        setIsAutoDetected(true);
        toast({
          title: "Current weather detected!",
          description: "Found current weather for your location.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Weather detection failed",
        description: "Couldn't auto-detect weather. You can still use manual selection.",
        variant: "destructive",
      });
      // Error getting auto weather
    },
  });

  const weatherMutation = useMutation({
    mutationFn: async () => {
      // Use actual weather data if available, otherwise fall back to manual selection
      const weatherToUse = selectedDayWeather ? 
        `${selectedDayWeather.description} with temperature ${selectedDayWeather.temperature}°F` : 
        weatherLabels[weatherCondition];

      const res = await apiRequest("POST", API_ENDPOINTS.AI.WEATHER_ACTIVITIES, {
        location: trip.city || trip.location || trip.title,
        date: selectedDate,
        weatherCondition: weatherToUse
      });
      return res as WeatherResponse;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not get weather-based suggestions. Please try again.",
        variant: "destructive",
      });
      // Error getting weather suggestions
    },
  });

  // General activity suggestions
  const generalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest-activities", {
        city: trip.city || trip.location || trip.title,
        interests: ["popular attractions", "local experiences"],
        duration: 1
      });
      return res as { activities: WeatherActivitySuggestion[] };
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not get activity suggestions. Please try again.",
        variant: "destructive",
      });
      // Error getting general suggestions
    },
  });

  // Auto-detect weather when component mounts
  useEffect(() => {
    if (trip.startDate && (trip.city || trip.location || trip.title)) {
      autoWeatherMutation.mutate();
    }
  }, []);

  // Update selected day weather when date changes
  useEffect(() => {
    if (autoWeatherData.length > 0 && selectedDate) {
      const dayWeather = autoWeatherData.find(weather => weather.date === selectedDate);
      setSelectedDayWeather(dayWeather || null);
    }
    // Clear pending times when date changes
    setPendingActivityTimes([]);
  }, [selectedDate, autoWeatherData]);

  // Handle date selection and trigger weather-based activities
  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    
    // Find weather for this day
    const dayWeather = autoWeatherData.find(weather => weather.date === dateString);
    if (dayWeather) {
      setSelectedDayWeather(dayWeather);
    }
  };

  const handleGetSuggestions = () => {
    weatherMutation.mutate();
  };

  const handleGeneralSuggestions = () => {
    generalMutation.mutate();
  };

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <Umbrella className="h-5 w-5 text-blue-500" />;
    }
    if (conditionLower.includes('snow')) {
      return <Snowflake className="h-5 w-5 text-blue-300" />;
    }
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return <CloudSun className="h-5 w-5 text-yellow-500" />;
    }
    if (conditionLower.includes('cloud')) {
      return <CloudSun className="h-5 w-5 text-gray-500" />;
    }
    if (conditionLower.includes('wind')) {
      return <Wind className="h-5 w-5 text-gray-600" />;
    }
    return <CloudSun className="h-5 w-5 text-gray-500" />;
  };

  const handleAddActivity = async (activitySuggestion: WeatherActivitySuggestion): Promise<void> => {
    try {
      // Format the activity for saving - use noon to avoid timezone issues
      const activityDate = new Date(selectedDate + 'T12:00:00');
      
      // Get existing activities for this date
      const existingActivitiesForDate = activities.filter(a => {
        const actDate = new Date(a.date).toISOString().split('T')[0];
        return actDate === selectedDate;
      });
      
      // Get occupied time slots - combine existing activities and pending ones
      const occupiedTimes = [
        ...existingActivitiesForDate.map(a => a.time),
        ...pendingActivityTimes
      ];
      
      // Weather activity scheduling
      
      // Determine appropriate time based on activity type and avoid conflicts
      let defaultTime = "10:00"; // Default morning time
      const lowerDesc = (activitySuggestion.description + activitySuggestion.name + activitySuggestion.title).toLowerCase();
      
      // Determine ideal time based on activity type
      let idealTimes: string[] = [];
      if (lowerDesc.includes('breakfast') || lowerDesc.includes('morning') || lowerDesc.includes('sunrise')) {
        idealTimes = ["08:00", "09:00", "07:00"];
      } else if (lowerDesc.includes('lunch') || lowerDesc.includes('midday') || lowerDesc.includes('noon')) {
        idealTimes = ["12:00", "13:00", "11:30"];
      } else if (lowerDesc.includes('dinner') || lowerDesc.includes('evening') || lowerDesc.includes('sunset')) {
        idealTimes = ["18:00", "19:00", "17:30", "20:00"];
      } else if (lowerDesc.includes('night') || lowerDesc.includes('bar') || lowerDesc.includes('club')) {
        idealTimes = ["20:00", "21:00", "22:00", "19:00"];
      } else if (lowerDesc.includes('museum') || lowerDesc.includes('gallery') || lowerDesc.includes('tour')) {
        idealTimes = ["10:00", "11:00", "14:00", "15:00"];
      } else if (lowerDesc.includes('beach') || lowerDesc.includes('park') || lowerDesc.includes('hike')) {
        idealTimes = ["09:00", "10:00", "11:00", "08:00"];
      } else {
        // General activities - spread throughout the day
        idealTimes = ["10:00", "11:00", "14:00", "15:00", "16:00", "13:00"];
      }
      
      // Find first available time from ideal times
      for (const time of idealTimes) {
        if (!occupiedTimes.includes(time)) {
          defaultTime = time;
          break;
        }
      }
      
      // If all ideal times are taken, find any available slot
      if (occupiedTimes.includes(defaultTime)) {
        const allTimes = [
          "07:00", "08:00", "09:00", "10:00", "11:00", 
          "12:00", "13:00", "14:00", "15:00", "16:00", 
          "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
        ];
        
        for (const time of allTimes) {
          if (!occupiedTimes.includes(time)) {
            defaultTime = time;
            break;
          }
        }
      }
      
      // Selected time for activity
      
      // Determine tag based on activity
      let tag = 'event';
      if (lowerDesc.includes('food') || lowerDesc.includes('restaurant') || lowerDesc.includes('eat') || 
          lowerDesc.includes('breakfast') || lowerDesc.includes('lunch') || lowerDesc.includes('dinner')) {
        tag = 'food';
      } else if (lowerDesc.includes('museum') || lowerDesc.includes('art') || lowerDesc.includes('culture') || 
                 lowerDesc.includes('historic') || lowerDesc.includes('gallery')) {
        tag = 'culture';
      } else if (lowerDesc.includes('shop') || lowerDesc.includes('market') || lowerDesc.includes('mall')) {
        tag = 'shop';
      } else if (lowerDesc.includes('spa') || lowerDesc.includes('relax') || lowerDesc.includes('massage')) {
        tag = 'rest';
      }
      
      const formattedActivity = {
        tripId: trip.id,
        title: activitySuggestion.title || activitySuggestion.name || '',
        date: activityDate,
        time: defaultTime,
        locationName: activitySuggestion.locationName || activitySuggestion.location || activitySuggestion.title,
        notes: `${activitySuggestion.description}${activitySuggestion.tips ? `\n\nTip: ${activitySuggestion.tips}` : ''}${activitySuggestion.weatherSuitability ? `\n\nWeather: ${activitySuggestion.weatherSuitability}` : ''}${activitySuggestion.duration ? `\n\nDuration: ${activitySuggestion.duration}` : ''}`,
        tag: activitySuggestion.tag || tag,
        order: 0 // Will be adjusted when added
      };
      
      await onAddActivity(formattedActivity);
      
      // Add this time to pending times so next activity picks a different time
      setPendingActivityTimes(prev => [...prev, defaultTime]);
      
      toast({
        title: "Activity added",
        description: `Added "${activitySuggestion.title || activitySuggestion.name}" to ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${defaultTime}.${existingActivitiesForDate.length > 0 ? ` (${existingActivitiesForDate.length} other activities on this day)` : ''}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add activity to your itinerary.",
        variant: "destructive",
      });
      // Error adding activity
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Weather & Activity Hub
        </h3>
        <p className="text-sm text-muted-foreground">
          Get real-time weather data and personalized activity recommendations for {trip.city || trip.location || trip.title}.
        </p>
      </div>

      {/* Auto-detected Weather Section */}
      {isAutoDetected && autoWeatherData.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Live Weather Data</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {autoWeatherData.slice(0, 6).map((weather, index) => {
              // Parse the date string directly without creating a Date object to avoid timezone issues
              const [year, month, day] = weather.date.split('-');
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const weatherDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              weatherDate.setHours(0, 0, 0, 0);
              const daysFromNow = Math.floor((weatherDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isForecast = daysFromNow >= 0 && daysFromNow <= 5;
              
              // Create display date string
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const displayMonth = monthNames[parseInt(month) - 1];
              const displayDay = parseInt(day);
              
              return (
                <div 
                  key={index} 
                  className="bg-white dark:bg-gray-800 p-3 rounded-md border cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => {
                    handleDateSelect(weather.date);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(weather.condition)}
                      <div>
                        <p className="text-sm font-medium">
                          {displayMonth} {displayDay}
                          {!isForecast && <span className="text-xs text-muted-foreground"> (est.)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{weather.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{weather.temperature}°F</p>
                      <p className="text-xs text-muted-foreground">{weather.humidity}% humidity</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="weather-based" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weather-based">Weather-Based</TabsTrigger>
          <TabsTrigger value="general">Popular Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weather-based" className="space-y-4">
          {/* Trip Date Pills */}
          {trip.startDate && trip.endDate && (
            <TripDatePicker
              startDate={new Date(trip.startDate)}
              endDate={new Date(trip.endDate)}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              label="Select Trip Day"
            />
          )}
          
          {/* Auto-detected Weather for Selected Day */}
          {selectedDayWeather && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getWeatherIcon(selectedDayWeather.condition)}
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      {selectedDayWeather.description.charAt(0).toUpperCase() + selectedDayWeather.description.slice(1)}
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {(() => {
                        const [year, month, day] = selectedDayWeather.date.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{selectedDayWeather.temperature}°{selectedDayWeather.unit || 'C'}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">{selectedDayWeather.humidity}% humidity</p>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleGetSuggestions}
            disabled={weatherMutation.isPending}
            className="w-full"
          >
            {weatherMutation.isPending ? "Getting suggestions..." : 
             selectedDayWeather ? `Get Activities for ${selectedDayWeather.description}` : 
             "Get Weather-Based Activities"}
          </Button>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Discover popular attractions and local experiences perfect for any weather condition.
            </p>
            <Button 
              onClick={handleGeneralSuggestions}
              disabled={generalMutation.isPending}
              className="w-full"
            >
              {generalMutation.isPending ? "Finding activities..." : "Get Popular Activities"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Weather-based activity suggestions */}
      {weatherMutation.isSuccess && weatherMutation.data && (
        <div className="mt-4 space-y-4">
          {selectedDayWeather && (
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-medium flex items-center">
                {getWeatherIcon(selectedDayWeather.condition)}
                <span className="ml-2">Activities for {selectedDayWeather.description}</span>
              </h4>
              <p className="text-sm mt-1">Perfect activities for {selectedDayWeather.temperature}°F weather</p>
            </div>
          )}
          
          <h4 className="font-medium">Weather-Based Activities</h4>
          <div className="space-y-3">
            {weatherMutation.data.activities.map((activity: WeatherActivitySuggestion, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{activity.name || activity.title}</h5>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          activity.weatherSuitability?.toLowerCase().includes('indoor') 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                            : activity.weatherSuitability?.toLowerCase().includes('outdoor')
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {activity.weatherSuitability?.toLowerCase().includes('indoor') ? 'indoor' : 
                           activity.weatherSuitability?.toLowerCase().includes('outdoor') ? 'outdoor' : 'either'}
                        </span>
                        <span className="ml-2">{activity.location || activity.locationName}</span>
                        {activity.duration && <span className="ml-2">• {activity.duration}</span>}
                      </div>
                      <p className="text-sm mt-2">{activity.description}</p>
                      {activity.weatherSuitability && (
                        <p className="text-xs text-muted-foreground mt-1">🌤️ {activity.weatherSuitability}</p>
                      )}
                      {activity.tips && (
                        <p className="text-xs italic text-muted-foreground mt-1">💡 {activity.tips}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddActivity(activity)}
                      className="ml-2 flex-shrink-0"
                    >
                      Add to Trip
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

      {/* General activity suggestions */}
      {generalMutation.isSuccess && generalMutation.data && (
        <div className="mt-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Popular Activities
          </h4>
          <div className="space-y-3">
            {generalMutation.data.activities.map((activity, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{activity.name || activity.title}</h5>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          activity.category === 'indoor' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                            : activity.category === 'outdoor'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {activity.category || 'general'}
                        </span>
                        <span className="ml-2">{activity.locationName || activity.location || trip.city}</span>
                      </div>
                      <p className="text-sm mt-2">{activity.description}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddActivity(activity)}
                      className="ml-2 flex-shrink-0"
                    >
                      Add to Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {generalMutation.data.activities.length === 0 && (
              <p className="text-sm text-muted-foreground">No popular activities found for this location.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}