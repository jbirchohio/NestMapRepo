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
interface Activity {
    id?: string;
    title: string;
    description: string;
    category: string;
    locationName: string;
    tag: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    duration?: number;
    price?: number;
    rating?: number;
    imageUrl?: string;
    weatherCondition?: WeatherCondition;
    // These will be populated from coordinates if not provided directly
    lat?: number;
    lng?: number;
}
interface WeatherSuggestionsPanelProps {
    trip: ClientTrip;
    onAddActivity: (activity: Activity) => Promise<void>;
}
type WeatherCondition = "sunny" | "rainy" | "hot" | "cold" | "windy" | "cloudy";

// Type guard for WeatherCondition
const isWeatherCondition = (condition: string): condition is WeatherCondition => {
    return ["sunny", "rainy", "hot", "cold", "windy", "cloudy"].includes(condition);
};
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
export default function WeatherSuggestionsPanel({ trip, onAddActivity }: WeatherSuggestionsPanelProps) {
    const { toast } = useToast();
    const getInitialDate = (): string => {
        try {
            const date = trip.startDate ? new Date(trip.startDate) : new Date();
            if (isNaN(date.getTime())) throw new Error('Invalid date');
            const dateStr = date.toISOString().split('T')[0];
            if (!dateStr) throw new Error('Invalid date format');
            return dateStr;
        } catch (error) {
            console.error('Error getting initial date:', error);
            return new Date().toISOString().split('T')[0] || '2023-01-01';
        }
    };
    
    const [selectedDate, setSelectedDate] = useState<string>(() => getInitialDate());
    const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("sunny");
    const [autoWeatherData, setAutoWeatherData] = useState<WeatherData[]>([]);
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [selectedDayWeather, setSelectedDayWeather] = useState<WeatherData | null>(null);
    const weatherIcons: Record<WeatherCondition, JSX.Element> = {
        sunny: <CloudSun className="h-5 w-5 text-yellow-500"/>,
        rainy: <Umbrella className="h-5 w-5 text-blue-500"/>,
        hot: <ThermometerSun className="h-5 w-5 text-orange-500"/>,
        cold: <Snowflake className="h-5 w-5 text-blue-400"/>,
        windy: <Wind className="h-5 w-5 text-gray-500"/>,
        cloudy: <CloudSun className="h-5 w-5 text-gray-400"/>
    };
    
    const weatherLabels: Record<WeatherCondition, string> = {
        sunny: "Sunny",
        rainy: "Rainy",
        hot: "Hot",
        cold: "Cold",
        windy: "Windy",
        cloudy: "Cloudy"
    };
    // Auto weather detection
    const autoWeatherMutation = useMutation<WeatherForecastResponse, Error>({
        mutationFn: async () => {
            try {
                const tripDates: string[] = [];
                if (trip.startDate) {
                    const start = new Date(trip.startDate);
                    if (isNaN(start.getTime())) {
                        throw new Error('Invalid start date');
                    }
                    
                    const end = trip.endDate ? new Date(trip.endDate) : start;
                    if (trip.endDate && isNaN(end.getTime())) {
                        throw new Error('Invalid end date');
                    }

                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        if (dateStr) {
                            tripDates.push(dateStr);
                        }
                    }
                }
                
                const location = trip.city || trip.location || trip.title;
                if (!location) {
                    throw new Error('No location information available');
                }

                const res = await apiRequest("POST", API_ENDPOINTS.WEATHER.FORECAST, {
                    location,
                    dates: tripDates
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to fetch weather data');
                }

                const data = await res.json() as WeatherForecastResponse;
                
                // Validate the response data
                if (!data.forecast && !data.current) {
                    throw new Error('Invalid weather data received');
                }
                
                return data;
            } catch (error) {
                console.error('Error in autoWeatherMutation:', error);
                throw error;
            }
        },
        onSuccess: (data: WeatherForecastResponse) => {
            try {
                if (data.forecast?.length) {
                    setAutoWeatherData(data.forecast);
                    setIsAutoDetected(true);
                    toast({
                        title: "Weather detected!",
                        description: `Found weather data for ${data.forecast.length} days of your trip.`,
                    });
                }
                else if (data.current) {
                    setAutoWeatherData([data.current]);
                    setIsAutoDetected(true);
                    toast({
                        title: "Current weather detected!",
                        description: "Found current weather for your location.",
                    });
                } else {
                    throw new Error('No weather data available');
                }
            } catch (error) {
                console.error('Error processing weather data:', error);
                throw error; // Re-throw to trigger onError
            }
        },
        onError: (error: Error) => {
            console.error("Error getting auto weather:", error);
            toast({
                title: "Weather detection failed",
                description: error.message || "Couldn't auto-detect weather. You can still use manual selection.",
                variant: "destructive",
            });
        }
    });
    const weatherMutation = useMutation<WeatherResponse, Error>({
        mutationFn: async (): Promise<WeatherResponse> => {
            try {
                // Use actual weather data if available, otherwise fall back to manual selection
                const weatherToUse = selectedDayWeather ?
                    selectedDayWeather.description :
                    weatherLabels[weatherCondition];
                    
                const location = trip.city || trip.location || trip.title;
                if (!location) {
                    throw new Error('No location information available');
                }

                const res = await apiRequest("POST", API_ENDPOINTS.AI.WEATHER_ACTIVITIES, {
                    location,
                    date: selectedDate,
                    weatherCondition: weatherToUse
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to fetch weather activities');
                }

                return await res.json() as WeatherResponse;
            } catch (error) {
                console.error('Error in weatherMutation:', error);
                throw error;
            }
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
    // General activity suggestions
    interface GeneralActivitiesResponse {
        activities: WeatherActivitySuggestion[];
    }

    const generalMutation = useMutation<GeneralActivitiesResponse, Error>({
        mutationFn: async (): Promise<GeneralActivitiesResponse> => {
            try {
                const location = trip.city || trip.location || trip.title;
                if (!location) {
                    throw new Error('No location information available');
                }

                const res = await apiRequest("POST", API_ENDPOINTS.AI.THEMED_ITINERARY, {
                    location,
                    theme: "general exploration",
                    days: 1,
                    preferences: "popular attractions and local experiences"
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to fetch general activities');
                }

                return await res.json() as GeneralActivitiesResponse;
            } catch (error) {
                console.error('Error in generalMutation:', error);
                throw error;
            }
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Could not get activity suggestions. Please try again.",
                variant: "destructive",
            });
            console.error("Error getting general suggestions:", error);
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
    }, [selectedDate, autoWeatherData]);
    // Handle date selection and trigger weather-based activities
    const handleDateSelect = (dateString: string) => {
        if (!dateString) {
            console.error('No date string provided');
            return;
        }
        setSelectedDate(dateString);
        
        // Find weather for this day
        const dayWeather = autoWeatherData.find(weather => weather.date === dateString);
        if (dayWeather) {
            setSelectedDayWeather(dayWeather);
            // Auto-trigger weather activities for this day
            weatherMutation.mutate();
        } else {
            console.warn(`No weather data found for date: ${dateString}`);
        }
    };
    const handleGetSuggestions = () => {
        weatherMutation.mutate();
    };
    const handleGeneralSuggestions = () => {
        generalMutation.mutate();
    };

    const handleAddActivity = async (activitySuggestion: WeatherActivitySuggestion): Promise<void> => {
        if (!activitySuggestion) {
            console.error('No activity suggestion provided');
            toast({
                title: "Error",
                description: "No activity suggestion provided",
                variant: "destructive",
            });
            return;
        }

        try {
            // Create a new activity with proper typing
            const activity: Activity = {
                id: `activity-${Date.now()}`,
                title: activitySuggestion.title,
                description: activitySuggestion.description,
                category: activitySuggestion.category,
                locationName: activitySuggestion.locationName,
                tag: activitySuggestion.tag,
                // Default coordinates (should be populated with actual coordinates from a geocoding service)
                coordinates: {
                    lat: 0,
                    lng: 0
                },
                // For backward compatibility
                lat: 0,
                lng: 0,
                weatherCondition: weatherCondition
            };
            
            await onAddActivity(activity);
            
            toast({
                title: "Activity added",
                description: `Added "${activitySuggestion.title}" to your trip.`,
            });
        } catch (error) {
            console.error("Error adding activity:", error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to add activity to your trip.';
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
            throw error; // Re-throw to allow parent components to handle the error if needed
        }
    };
    const getWeatherIcon = (condition: string): JSX.Element => {
        const conditionLower = condition.toLowerCase();
        
        // Map conditions to weather types
        if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
            return weatherIcons.rainy;
        }
        if (conditionLower.includes('snow') || conditionLower.includes('sleet')) {
            return weatherIcons.cold;
        }
        if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
            return weatherIcons.sunny;
        }
        if (conditionLower.includes('cloud')) {
            return weatherIcons.cloudy;
        }
        if (conditionLower.includes('wind')) {
            return weatherIcons.windy;
        }
        if (conditionLower.includes('hot') || conditionLower.includes('warm')) {
            return weatherIcons.hot;
        }
        
        // Default to cloudy if no match is found
        return weatherIcons.cloudy;
    };
    return (<div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5"/>
          Weather & Activity Hub
        </h3>
        <p className="text-sm text-muted-foreground">
          Get real-time weather data and personalized activity recommendations for {trip.city || trip.location || trip.title}.
        </p>
      </div>

      {/* Auto-detected Weather Section */}
      {isAutoDetected && autoWeatherData.length > 0 && (<div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-blue-600"/>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">Live Weather Data</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {autoWeatherData.slice(0, 6).map((weather, index) => (<div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWeatherIcon(weather.condition)}
                    <div>
                      <p className="text-sm font-medium">{new Date(weather.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground capitalize">{weather.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{weather.temperature}°{weather.unit || 'C'}</p>
                    <p className="text-xs text-muted-foreground">{weather.humidity}% humidity</p>
                  </div>
                </div>
              </div>))}
          </div>
        </div>)}

      <Tabs defaultValue="weather-based" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weather-based">Weather-Based</TabsTrigger>
          <TabsTrigger value="general">Popular Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weather-based" className="space-y-4">
          {/* Trip Date Pills */}
          {trip.startDate && trip.endDate && (<TripDatePicker startDate={new Date(trip.startDate)} endDate={new Date(trip.endDate)} selectedDate={selectedDate} onDateSelect={handleDateSelect} label="Select Trip Day"/>)}
          
          {/* Auto-detected Weather for Selected Day */}
          {selectedDayWeather && (<div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getWeatherIcon(selectedDayWeather.condition)}
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      {selectedDayWeather.description.charAt(0).toUpperCase() + selectedDayWeather.description.slice(1)}
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {new Date(selectedDayWeather.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{selectedDayWeather.temperature}°{selectedDayWeather.unit || 'C'}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">{selectedDayWeather.humidity}% humidity</p>
                </div>
              </div>
            </div>)}
          
          <Button onClick={handleGetSuggestions} disabled={weatherMutation.isPending || !selectedDayWeather} className="w-full">
            {weatherMutation.isPending ? "Getting suggestions..." :
            selectedDayWeather ? `Get Activities for ${selectedDayWeather.description}` :
                "Select a day to see weather activities"}
          </Button>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Discover popular attractions and local experiences perfect for any weather condition.
            </p>
            <Button onClick={handleGeneralSuggestions} disabled={generalMutation.isPending} className="w-full">
              {generalMutation.isPending ? "Finding activities..." : "Get Popular Activities"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Weather-based activity suggestions */}
      {weatherMutation.isSuccess && weatherMutation.data && (<div className="mt-4 space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium flex items-center">
              {weatherIcons[weatherCondition]}
              <span className="ml-2">{weatherMutation.data.weather.condition}</span>
            </h4>
            <p className="text-sm mt-1">{weatherMutation.data.weather.recommendation}</p>
          </div>
          
          <h4 className="font-medium">Weather-Based Activities</h4>
          <div className="space-y-3">
            {weatherMutation.data.activities.map((activity, index) => (<Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{activity.title}</h5>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activity.category === 'indoor'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : activity.category === 'outdoor'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {activity.category}
                        </span>
                        <span className="ml-2">{activity.locationName}</span>
                      </div>
                      <p className="text-sm mt-2">{activity.description}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddActivity(activity)} className="ml-2 flex-shrink-0">
                      Add to Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>))}
            
            {weatherMutation.data.activities.length === 0 && (<p className="text-sm text-muted-foreground">No activities found for this weather condition.</p>)}
          </div>
        </div>)}

      {/* General activity suggestions */}
      {generalMutation.isSuccess && generalMutation.data && (<div className="mt-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4"/>
            Popular Activities
          </h4>
          <div className="space-y-3">
            {generalMutation.data.activities.map((activity, index) => (<Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{activity.title}</h5>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activity.category === 'indoor'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : activity.category === 'outdoor'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {activity.category || 'general'}
                        </span>
                        <span className="ml-2">{activity.locationName}</span>
                      </div>
                      <p className="text-sm mt-2">{activity.description}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddActivity(activity)} className="ml-2 flex-shrink-0">
                      Add to Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>))}
            
            {generalMutation.data.activities.length === 0 && (<p className="text-sm text-muted-foreground">No popular activities found for this location.</p>)}
          </div>
        </div>)}
    </div>);
}
