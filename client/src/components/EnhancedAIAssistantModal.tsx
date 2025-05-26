import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClientTrip, ClientActivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import WeatherSuggestionsPanel from "./WeatherSuggestionsPanel";
import BudgetOptionsPanel from "./BudgetOptionsPanel";
import { Sparkles, Calendar, Cloud, DollarSign, MessageSquare } from "lucide-react";

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
};

export default function EnhancedAIAssistantModal({
  isOpen,
  onClose,
  trip,
  activities,
  currentDate,
  onActivitiesUpdated
}: EnhancedAIAssistantModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("chat");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<MessageType[]>([
    {
      role: "assistant",
      content: `Hi there! I'm your NestMap AI Assistant. I can help you with your trip to ${trip?.city || trip?.title}. Ask me anything about your trip, get weather-based suggestions, or budget recommendations!`
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const assistantMutation = useMutation({
    mutationFn: async (question: string) => {
      // Get current date activities
      const currentDateActivities = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate.toDateString() === currentDate.toDateString();
      });

      const tripContext = {
        trip,
        activities: currentDateActivities,
        currentDate: currentDate.toISOString()
      };
      
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, { 
        question, 
        tripContext 
      });
      
      return res.json();
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Could not get AI assistant response. Please try again.",
        variant: "destructive",
      });
      console.error("Error in AI assistant:", error);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (activity: any) => {
      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, activity);
      return res.json();
    },
    onSuccess: () => {
      onActivitiesUpdated();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not create activity. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating activity:", error);
    },
  });

  const handleAddActivity = async (activity: any) => {
    await createActivityMutation.mutateAsync(activity);
    return true;
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    // Add user question to conversation
    setConversation(prev => [...prev, { role: "user", content: question }]);
    const userQuestion = question;
    setQuestion("");
    setIsProcessing(true);

    try {
      const response = await assistantMutation.mutateAsync(userQuestion);

      // Check if response is a parsed itinerary with activities
      if (typeof response === 'object' && response.answer && response.activities) {
        setConversation(prev => [
          ...prev,
          { 
            role: "assistant", 
            content: response.answer + "\n\n*I've prepared these activities for you. Would you like me to add them to your itinerary?*" 
          }
        ]);
        
        // Store the activities temporarily if needed
        // You could add a UI to confirm adding them to the itinerary
      } else {
        // Regular text response
        setConversation(prev => [
          ...prev,
          { role: "assistant", content: response.toString() }
        ]);
      }
    } catch (error) {
      console.error("Error processing AI response:", error);
      setConversation(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I had trouble processing that request. Could you try again?" 
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            NestMap AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get personalized travel recommendations, weather-based suggestions, and budget options
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chat" className="h-[calc(100%-80px)]" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="weather">
                <Cloud className="h-4 w-4 mr-2" />
                Weather
              </TabsTrigger>
              <TabsTrigger value="budget">
                <DollarSign className="h-4 w-4 mr-2" />
                Budget
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="h-full flex flex-col p-6 pt-4">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {conversation.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "assistant"
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div className="whitespace-pre-line">{message.content}</div>
                      {message.role === "assistant" && message.content.includes("food and coffee suggestions") && (
                        <div className="mt-3 space-y-2">
                          {/* Parse food suggestions and add buttons */}
                          {message.content.match(/• (.+?) - (.+?)\n(.+?)\n\$\$ \| (.+?)(?=\n|$)/g)?.map((suggestion, index) => {
                            const match = suggestion.match(/• (.+?) - (.+?)\n(.+?)\n\$\$ \| (.+)/);
                            if (match) {
                              const [, name, cuisine, description, walkTime] = match;
                              return (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="mr-2 mb-2"
                                  onClick={() => handleAddActivity({
                                    title: name.trim(),
                                    locationName: name.trim(),
                                    tag: "food",
                                    notes: `${cuisine} - ${description.trim()}`,
                                    time: "12:00" // Default lunch time
                                  })}
                                >
                                  + Add {name.trim()}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-muted text-foreground">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150"></div>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300"></div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 flex items-end space-x-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Ask me anything about your trip..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendQuestion();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSendQuestion}
                disabled={isProcessing || !question.trim()}
                className="h-10"
              >
                Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="weather" className="h-full p-6 pt-4 overflow-auto">
            <WeatherSuggestionsPanel 
              trip={trip} 
              onAddActivity={handleAddActivity} 
            />
          </TabsContent>

          <TabsContent value="budget" className="h-full p-6 pt-4 overflow-auto">
            <BudgetOptionsPanel 
              trip={trip} 
              onAddActivity={handleAddActivity} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}