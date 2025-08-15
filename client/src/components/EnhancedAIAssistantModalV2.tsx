import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClientTrip, ClientActivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Calendar, Cloud, DollarSign, MessageSquare, 
  Utensils, MapPin, Camera, Building, ShoppingBag, Coffee,
  Mountain, Users, Clock, Plus, Loader2, Bot, User, ChevronRight,
  TrendingUp, Wallet, Sun, CloudRain, Wind
} from "lucide-react";

interface EnhancedAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ClientTrip;
  activities: ClientActivity[];
  currentDate: Date;
  onActivitiesUpdated: () => void;
}

type MessageType = {
  role: "assistant" | "user";
  content: string;
  suggestions?: any[];
  showCategoryPicker?: boolean;
  showActivityPicker?: boolean;
  selectedCategory?: string;
};

// Activity categories with icons
const ACTIVITY_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, color: 'bg-orange-500' },
  { id: 'culture', label: 'Culture & Museums', icon: Building, color: 'bg-purple-500' },
  { id: 'sightseeing', label: 'Sightseeing', icon: Camera, color: 'bg-blue-500' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500' },
  { id: 'cafe', label: 'Cafes & Drinks', icon: Coffee, color: 'bg-amber-500' },
  { id: 'outdoor', label: 'Outdoor & Parks', icon: Mountain, color: 'bg-green-500' },
];

// Quick action prompts
const QUICK_PROMPTS = [
  { id: 'activities', label: '🎯 Add more activities', action: 'category' },
  { id: 'food', label: '🍽️ Find restaurants nearby', action: 'food' },
  { id: 'weather', label: '☀️ Weather-based suggestions', action: 'weather' },
  { id: 'budget', label: '💰 Budget-friendly options', action: 'budget' },
  { id: 'attractions', label: '🏛️ Must-see attractions', action: 'attractions' }
];

export default function EnhancedAIAssistantModalV2({
  isOpen,
  onClose,
  trip,
  activities,
  currentDate,
  onActivitiesUpdated
}: EnhancedAIAssistantModalProps) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<MessageType[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI trip assistant for ${trip?.city || trip?.title}. I can help you discover and add real activities to your itinerary. 

Try clicking "Add more activities" below to get started!`
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [regenerationsRemaining, setRegenerationsRemaining] = useState(
    (trip.aiRegenerationsLimit || 5) - (trip.aiRegenerationsUsed || 0)
  );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);

  // Fetch real places based on category
  const fetchCategoryActivities = useMutation({
    mutationFn: async (category: string) => {
      // Map categories to appropriate OSM queries
      const categoryMap: Record<string, string> = {
        'food': 'restaurant',
        'culture': 'museum',
        'sightseeing': 'attraction',
        'shopping': 'shop',
        'cafe': 'cafe',
        'outdoor': 'park'
      };

      const res = await apiRequest("POST", "/api/ai/suggest-activities", {
        city: trip.city,
        interests: [categoryMap[category] || category],
        duration: 1
      });

      return res.json();
    },
    onSuccess: (data, category) => {
      if (data.activities && data.activities.length > 0) {
        setAvailableActivities(data.activities);
        
        // Add message showing available activities
        setConversation(prev => [...prev, {
          role: "assistant",
          content: `I found ${data.activities.length} ${ACTIVITY_CATEGORIES.find(c => c.id === category)?.label} options for you:`,
          showActivityPicker: true,
          selectedCategory: category,
          suggestions: data.activities
        }]);
      } else {
        setConversation(prev => [...prev, {
          role: "assistant",
          content: `I couldn't find any ${category} activities in ${trip.city}. Try a different category?`
        }]);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not fetch activities. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      // Check regeneration limit
      if (regenerationsRemaining <= 0) {
        throw new Error("No regenerations remaining");
      }

      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, {
        tripId: trip.id,
        ...activityData
      });

      // Update regeneration count
      await apiRequest("PUT", `${API_ENDPOINTS.TRIPS}/${trip.id}`, {
        aiRegenerationsUsed: (trip.aiRegenerationsUsed || 0) + 1
      });

      return res.json();
    },
    onSuccess: (data) => {
      setRegenerationsRemaining(prev => prev - 1);
      onActivitiesUpdated();
      
      toast({
        title: "✅ Activity added!",
        description: `"${data.title}" has been added to your itinerary. ${regenerationsRemaining - 1} suggestions remaining.`,
      });

      // Add confirmation message
      setConversation(prev => [...prev, {
        role: "assistant",
        content: `Great! I've added "${data.title}" to your itinerary for ${new Date(data.date).toLocaleDateString()}. You have ${regenerationsRemaining - 1} AI suggestions remaining.`
      }]);
    },
    onError: (error: any) => {
      if (error.message === "No regenerations remaining") {
        toast({
          title: "Limit reached",
          description: "You've used all your AI suggestions for this trip.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not add activity. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Handle quick prompt clicks
  const handleQuickPrompt = async (prompt: any) => {
    const userMessage = typeof prompt === 'string' ? prompt : prompt.label;
    const action = typeof prompt === 'string' ? 'chat' : prompt.action;
    
    setConversation(prev => [...prev, { role: "user", content: userMessage }]);
    
    switch (action) {
      case 'category':
        // Show category picker for activities
        setConversation(prev => [...prev, { 
          role: "assistant", 
          content: "What type of activities would you like to add?",
          showCategoryPicker: true 
        }]);
        break;
        
      case 'food':
        // Fetch food suggestions
        setIsProcessing(true);
        try {
          const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, {
            location: trip.city,
            foodType: "restaurant"
          });
          const data = await res.json();
          
          if (data.suggestions && data.suggestions.length > 0) {
            setAvailableActivities(data.suggestions.map((s: any) => ({
              ...s,
              title: s.name,
              locationName: s.name,
              description: `${s.type} - ${s.priceRange}`,
              category: 'food'
            })));
            
            setConversation(prev => [...prev, {
              role: "assistant",
              content: `I found these great dining options in ${trip.city}:`,
              showActivityPicker: true,
              suggestions: data.suggestions.map((s: any) => ({
                ...s,
                title: s.name,
                locationName: s.name,
                description: `${s.type} - ${s.priceRange}`,
                category: 'food'
              }))
            }]);
          }
        } catch (error) {
          setConversation(prev => [...prev, {
            role: "assistant",
            content: "I couldn't fetch restaurant suggestions right now. Try again later."
          }]);
        }
        setIsProcessing(false);
        break;
        
      case 'weather':
        // Fetch weather-based suggestions
        setIsProcessing(true);
        try {
          const res = await apiRequest("POST", API_ENDPOINTS.AI.WEATHER_ACTIVITIES, {
            location: trip.city,
            date: selectedDate.toISOString().split('T')[0]
          });
          const data = await res.json();
          
          if (data.activities && data.activities.length > 0) {
            setConversation(prev => [...prev, {
              role: "assistant",
              content: `Based on the weather forecast (${data.weather?.condition || 'current conditions'}), here are my suggestions:`,
              showActivityPicker: true,
              suggestions: data.activities.map((a: any) => ({
                ...a,
                title: a.title,
                locationName: a.locationName || a.title,
                description: a.description
              }))
            }]);
          }
        } catch (error) {
          setConversation(prev => [...prev, {
            role: "assistant",
            content: "I couldn't fetch weather-based suggestions right now."
          }]);
        }
        setIsProcessing(false);
        break;
        
      case 'budget':
        // Show budget options inline
        setConversation(prev => [...prev, {
          role: "assistant",
          content: `Here are budget-friendly options for ${trip.city}:\n\n💵 **Free Activities:**\n• Walk through city parks\n• Visit free museums on designated days\n• Explore local markets\n• Self-guided walking tours\n\n💰 **Low-Cost Options:**\n• Public transportation day passes\n• Street food tours\n• Local cafes over tourist restaurants\n• Group discounts for attractions\n\nWould you like specific recommendations for any of these?"
        }]);
        break;
        
      case 'attractions':
        // Fetch must-see attractions
        handleCategorySelect('sightseeing');
        break;
        
      default:
        // Regular chat
        setQuestion(userMessage);
        handleSendQuestion();
    }
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setIsProcessing(true);
    
    setConversation(prev => [...prev, {
      role: "user",
      content: `Show me ${ACTIVITY_CATEGORIES.find(c => c.id === category)?.label} options`
    }]);

    fetchCategoryActivities.mutate(category);
    setIsProcessing(false);
  };

  // Handle activity selection
  const handleActivitySelect = async (activity: any) => {
    // Format activity data for creation (using camelCase for frontend)
    const activityData = {
      title: activity.title,
      date: selectedDate.toISOString().split('T')[0],
      time: activity.suggestedTime || "14:00",
      locationName: activity.locationName || activity.title,
      latitude: activity.latitude,
      longitude: activity.longitude,
      notes: activity.description || "",
      category: activity.category || "activity",
      travelMode: "walking"
    };

    await createActivityMutation.mutateAsync(activityData);
  };

  // Regular chat handling
  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    setConversation(prev => [...prev, { role: "user", content: question }]);
    const userQuestion = question;
    setQuestion("");
    setIsProcessing(true);

    try {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, {
        question: userQuestion,
        trip_context: {
          trip,
          activities: activities.filter(a => 
            new Date(a.date).toDateString() === currentDate.toDateString()
          ),
          currentDate: currentDate.toISOString()
        },
        conversation_history: conversation.slice(-5).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const response = await res.json();
      const responseText = typeof response === 'object' && response.answer ? 
        response.answer : response.toString();
      
      setConversation(prev => [...prev, { 
        role: "assistant", 
        content: responseText 
      }]);
    } catch (error) {
      setConversation(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again."
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[700px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Trip Assistant
            <Badge variant="secondary" className="ml-auto">
              {regenerationsRemaining} suggestions left
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Get personalized suggestions and add real activities to your trip
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Date selector */}
          <div className="px-6 py-3 border-b bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700 font-medium">Adding activities for:</span>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="text-sm border border-purple-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={trip.startDate}
                max={trip.endDate}
              />
            </div>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 px-6 py-4 bg-gradient-to-b from-white to-gray-50">
              <div className="space-y-4">
                {conversation.map((message, index) => (
                  <div key={index}>
                    <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'assistant' ? 'bg-purple-600' : 'bg-gray-200'
                      }`}>
                        {message.role === 'assistant' ? (
                          <Bot className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className={`max-w-[80%] ${
                        message.role === 'user' ? 'bg-gray-100' : 'bg-purple-50'
                      } rounded-lg px-4 py-3`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Category picker */}
                    {message.showCategoryPicker && (
                      <div className="mt-4 ml-11">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {ACTIVITY_CATEGORIES.map(category => (
                            <Button
                              key={category.id}
                              variant="outline"
                              className="group justify-start p-4 h-auto flex-col items-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                              onClick={() => handleCategorySelect(category.id)}
                              disabled={isProcessing}
                            >
                              <div className={`${category.color} w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <category.icon className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-xs font-medium">{category.label}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity picker */}
                    {message.showActivityPicker && message.suggestions && (
                      <div className="mt-4 ml-11 space-y-2">
                        <div className="grid gap-2">
                          {message.suggestions.slice(0, 5).map((activity, idx) => (
                            <Card key={idx} className="group hover:shadow-md transition-all duration-200 border-purple-100 hover:border-purple-300">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-gray-900 group-hover:text-purple-700 transition-colors">
                                      {activity.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {activity.description || activity.locationName}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                      {activity.latitude && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-green-500" />
                                          <span className="text-xs text-green-600 font-medium">
                                            Verified location
                                          </span>
                                        </div>
                                      )}
                                      {activity.priceRange && (
                                        <span className="text-xs text-gray-500">
                                          {activity.priceRange}
                                        </span>
                                      )}
                                      {activity.category && (
                                        <Badge variant="outline" className="text-xs py-0">
                                          {activity.category}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleActivitySelect(activity)}
                                    disabled={regenerationsRemaining <= 0}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {message.suggestions.length > 5 && (
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Showing top 5 results
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-purple-50 rounded-lg px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

          {/* Quick prompts */}
          {conversation.length <= 2 && (
            <div className="px-6 py-3 border-t bg-gradient-to-r from-blue-50 to-purple-50">
              <p className="text-xs text-gray-700 font-medium mb-3">Quick actions:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="justify-start text-xs hover:bg-purple-100 hover:border-purple-300 transition-colors"
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-6 py-4 border-t bg-white">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }} className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask me anything about your trip..."
                  disabled={isProcessing}
                />
                <Button type="submit" disabled={!question.trim() || isProcessing}>
                  Send
                </Button>
              </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}