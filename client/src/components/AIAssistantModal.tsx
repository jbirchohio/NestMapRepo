import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APIResponse } from "@tanstack/react-query";
import { ClientActivity, ClientTrip, AIResponse } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ClientTrip;
  activities: ClientActivity[];
  currentDate: Date;
}

export default function AIAssistantModal({ 
  isOpen, 
  onClose, 
  trip, 
  activities, 
  currentDate 
}: AIAssistantModalProps) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<{ role: 'assistant' | 'user', content: string }[]>([]);
  
  const currentDateActivities = activities.filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate.toDateString() === currentDate.toDateString();
  });
  
  const summarizeDay = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUMMARIZE_DAY, { activities: currentDateActivities });
      return res.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      if (data.summary) {
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: data.summary }
        ]);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not generate summary. Please try again.",
        variant: "destructive",
      });
      console.error("Error summarizing day:", error);
    },
  });
  
  const suggestFood = useMutation({
    mutationFn: async () => {
      // Use the location of the first activity for this example
      const location = currentDateActivities.length > 0 
        ? currentDateActivities[0].locationName 
        : trip.title;
      
      const res = await apiRequest("POST", API_ENDPOINTS.AI.SUGGEST_FOOD, { 
        location, 
        foodType: "food and coffee" 
      });
      return res.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        const content = `
          Here are some food and coffee suggestions:
          ${data.suggestions.map(s => `
            • ${s.name} - ${s.type}
            ${s.description}
            ${s.priceRange} | ${s.distance}
          `).join('\n')}
        `;
        
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: content.trim() }
        ]);
      } else {
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: "I couldn't find any food suggestions for this location." }
        ]);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not generate food suggestions. Please try again.",
        variant: "destructive",
      });
      console.error("Error suggesting food:", error);
    },
  });
  
  const detectConflicts = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.DETECT_CONFLICTS, { 
        activities: currentDateActivities 
      });
      return res.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      if (data.conflicts && data.conflicts.length > 0) {
        const content = `
          I've detected the following potential issues with your schedule:
          ${data.conflicts.map(c => `
            • ${c.description} (${c.severity} severity)
          `).join('\n')}
        `;
        
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: content.trim() }
        ]);
      } else {
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: "I didn't find any scheduling conflicts in your itinerary for this day." }
        ]);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not detect conflicts. Please try again.",
        variant: "destructive",
      });
      console.error("Error detecting conflicts:", error);
    },
  });
  
  const suggestActivities = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.THEMED_ITINERARY, { 
        location: trip.title,
        theme: "local experience",
        duration: "half-day"
      });
      return res.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      if (data.themedItinerary) {
        const itinerary = data.themedItinerary;
        const content = `
          ${itinerary.title}
          
          ${itinerary.description}
          
          Suggested activities:
          ${itinerary.activities.map(a => `
            • ${a.time} - ${a.title} (${a.location})
            ${a.description}
          `).join('\n')}
        `;
        
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: content.trim() }
        ]);
      } else {
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: "I couldn't generate activity suggestions at this time." }
        ]);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not suggest activities. Please try again.",
        variant: "destructive",
      });
      console.error("Error suggesting activities:", error);
    },
  });
  
  const askQuestion = useMutation({
    mutationFn: async (question: string) => {
      const tripContext = {
        trip,
        currentDate,
        activities: currentDateActivities,
      };
      
      const res = await apiRequest("POST", API_ENDPOINTS.AI.ASSISTANT, { 
        question,
        tripContext,
      });
      return res.json() as Promise<AIResponse>;
    },
    onSuccess: (data, variables) => {
      // Check if this is a parsed itinerary with activities
      if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
        // This is a parsed itinerary
        console.log("Received parsed itinerary with activities:", data.activities);
        
        // Add the answer to conversation
        setConversation(prev => [
          ...prev,
          { role: 'user', content: variables },
          { role: 'assistant', content: data.answer || "I've processed your itinerary and extracted activities." }
        ]);
        
        // Process each activity to create it in the database
        handleAddActivities(data.activities);
      } else {
        // Regular conversation response
        setConversation(prev => [
          ...prev,
          { role: 'user', content: variables },
          { role: 'assistant', content: data.answer || "I couldn't answer that question." }
        ]);
      }
      setQuestion("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not process your question. Please try again.",
        variant: "destructive",
      });
      console.error("Error asking question:", error);
    },
  });
  
  /**
   * Adds activities from a parsed itinerary
   */
  const addActivity = useMutation({
    mutationFn: async (activityData: any) => {
      // Format the activity data properly for the API
      const formattedActivity = {
        title: activityData.title,
        date: activityData.date || currentDate.toISOString().split('T')[0],
        time: activityData.time || "12:00",
        locationName: activityData.locationName,
        notes: activityData.notes || "",
        tag: activityData.tag || "Event", 
        tripId: trip.id,
        latitude: activityData.latitude,
        longitude: activityData.longitude,
      };
      
      const res = await apiRequest("POST", API_ENDPOINTS.ACTIVITIES, formattedActivity);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Activity created:", data);
    },
    onError: (error) => {
      console.error("Error creating activity:", error);
      toast({
        title: "Error",
        description: "Could not create activity from itinerary.",
        variant: "destructive",
      });
    },
  });
  
  /**
   * Process multiple activities from a parsed itinerary
   */
  const handleAddActivities = async (activities: any[]) => {
    let addedCount = 0;
    const errors: string[] = [];
    
    // Add a delay between activity additions to prevent rate limiting
    for (const activity of activities) {
      try {
        await addActivity.mutateAsync(activity);
        addedCount++;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Error adding activity:", error);
        errors.push(activity.title || "Unnamed activity");
      }
    }
    
    // Notify the user
    if (addedCount > 0) {
      toast({
        title: "Itinerary Imported",
        description: `Successfully added ${addedCount} activities to your trip.${errors.length > 0 ? ' Some activities could not be added.' : ''}`,
      });
      
      // Add a confirmation message to the conversation
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `I've added ${addedCount} activities to your trip from the itinerary.${errors.length > 0 ? 
            ` I had trouble with: ${errors.join(', ')}. Please check those manually.` : 
            ' They should now appear in your schedule.'}`
        }
      ]);
    } else if (errors.length > 0) {
      toast({
        title: "Import Failed",
        description: "Could not add any activities from the itinerary.",
        variant: "destructive",
      });
    }
  };
  
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askQuestion.mutate(question);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[hsl(var(--card))] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-[hsl(var(--border))] flex justify-between items-center">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[hsl(var(--primary))] mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold">NestMap Assistant</h3>
          </div>
          <button 
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" 
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-medium mb-2">How can I help with your trip?</h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="p-3 border rounded-lg bg-blue-50 border-blue-200 text-left col-span-2"
                onClick={() => {
                  // Add a prompt to help users understand how to import itineraries
                  setConversation(prev => [
                    ...prev,
                    { 
                      role: 'assistant', 
                      content: "To import your itinerary, paste your full schedule below and I'll create activities with all the correct locations and times. I can handle many formats including day-by-day schedules, time ranges, and bulleted lists."
                    }
                  ]);
                  setQuestion("I'd like to import my itinerary:\n\n");
                  // Focus the textarea after a short delay
                  setTimeout(() => {
                    const textarea = document.querySelector('textarea[name="question"]');
                    if (textarea) {
                      (textarea as HTMLTextAreaElement).focus();
                    }
                  }, 100);
                }}
              >
                <span className="block font-medium text-blue-700">Import Itinerary</span>
                <span className="text-sm text-blue-600">Paste your schedule to add all activities to your trip</span>
              </button>
              
              <button 
                className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 text-left"
                onClick={() => summarizeDay.mutate()}
                disabled={summarizeDay.isPending}
              >
                <span className="block font-medium">Summarize day</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Get a brief overview</span>
              </button>
              <button 
                className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 text-left"
                onClick={() => suggestFood.mutate()}
                disabled={suggestFood.isPending}
              >
                <span className="block font-medium">Food nearby</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Find places to eat</span>
              </button>
              <button 
                className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 text-left"
                onClick={() => detectConflicts.mutate()}
                disabled={detectConflicts.isPending}
              >
                <span className="block font-medium">Find time conflicts</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Check schedule issues</span>
              </button>
              <button 
                className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 text-left"
                onClick={() => suggestActivities.mutate()}
                disabled={suggestActivities.isPending}
              >
                <span className="block font-medium">Suggest activities</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Based on interests</span>
              </button>
            </div>
          </div>
          
          {(conversation.length > 0 || summarizeDay.isPending || suggestFood.isPending || 
            detectConflicts.isPending || suggestActivities.isPending || askQuestion.isPending) && (
            <div className="border-t pt-4 mt-4 max-h-[300px] overflow-y-auto">
              {conversation.map((message, index) => (
                <div key={index} className="flex items-start mb-4">
                  <div className={`
                    ${message.role === 'assistant' ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'} 
                    rounded-full h-8 w-8 flex items-center justify-center 
                    ${message.role === 'assistant' ? 'text-white' : 'text-[hsl(var(--foreground))]'} 
                    shrink-0 mr-3
                  `}>
                    {message.role === 'assistant' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className={`
                    ${message.role === 'assistant' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-[hsl(var(--muted))]'} 
                    p-3 rounded-lg ${message.role === 'assistant' ? 'rounded-tl-none' : 'rounded-tr-none'} flex-1
                  `}>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {(summarizeDay.isPending || suggestFood.isPending || detectConflicts.isPending || 
                suggestActivities.isPending || askQuestion.isPending) && (
                <div className="flex items-start mb-4">
                  <div className="bg-[hsl(var(--primary))] rounded-full h-8 w-8 flex items-center justify-center text-white shrink-0 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg rounded-tl-none flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-[hsl(var(--primary))] rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmitQuestion} className="mt-4">
            <div className="flex items-center border rounded-lg overflow-hidden dark:border-[hsl(var(--border))]">
              <Input
                type="text"
                className="flex-1 px-4 py-2 border-0 focus:outline-none"
                placeholder="Ask anything about your trip..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={askQuestion.isPending}
              />
              <Button
                type="submit"
                variant="ghost"
                className="p-2 text-[hsl(var(--primary))]"
                disabled={!question.trim() || askQuestion.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
