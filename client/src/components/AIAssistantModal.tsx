import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientActivity, ClientTrip, AIResponse, ParsedActivity } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
        
        // First, add the initial response to the conversation
        setConversation(prev => [
          ...prev,
          { role: 'user', content: variables },
          { 
            role: 'assistant', 
            content: data.answer + "\n\nI'm now processing these activities to add them to your trip. Please wait..." 
          }
        ]);
        
        // Then process each activity to create it in the database
        // We'll use setTimeout to allow the conversation update to render first
        setTimeout(() => {
          if (data.activities && Array.isArray(data.activities)) {
            handleAddActivities(data.activities);
          }
        }, 500);
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
  const handleAddActivities = async (activities: ParsedActivity[]) => {
    let addedCount = 0;
    const errors: string[] = [];
    
    // Add a status update in the conversation
    setConversation(prev => [
      ...prev,
      { 
        role: 'assistant', 
        content: `Found ${activities.length} activities in your itinerary. Creating them now...`
      }
    ]);
    
    // Show processing in progress
    toast({
      title: "Processing Itinerary",
      description: `Creating ${activities.length} activities from your schedule...`,
    });
    
    // Process activities in chunks to prevent overwhelming the API
    const chunks = [];
    const chunkSize = 5; // Process 5 activities at a time
    
    for (let i = 0; i < activities.length; i += chunkSize) {
      chunks.push(activities.slice(i, i + chunkSize));
    }
    
    // Process each chunk
    for (const [chunkIndex, chunk] of chunks.entries()) {
      // Add a processing status update periodically
      if (chunkIndex > 0 && chunkIndex % 1 === 0) {
        const progress = Math.min(100, Math.round((chunkIndex * chunkSize / activities.length) * 100));
        setConversation(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `Progress: ${progress}% complete (${Math.min(chunkIndex * chunkSize, activities.length)} of ${activities.length} activities)`
          }
        ]);
      }
      
      // Process activities in this chunk in parallel
      const results = await Promise.all(
        chunk.map(async (activity) => {
          try {
            // Format date properly - using trip dates if needed
            if (!activity.date || activity.date === "") {
              // Default to first day of trip
              activity.date = new Date(trip.startDate).toISOString().split('T')[0];
            }
            
            // Format time properly - default to morning if missing
            if (!activity.time || activity.time === "") {
              activity.time = "10:00";
            }
            
            // Add a proper tag if missing
            if (!activity.tag || activity.tag === "") {
              // Determine tag based on title/description
              if (activity.title.toLowerCase().includes("breakfast") || 
                  activity.title.toLowerCase().includes("lunch") || 
                  activity.title.toLowerCase().includes("dinner") ||
                  activity.title.toLowerCase().includes("restaurant") ||
                  activity.title.toLowerCase().includes("café") ||
                  activity.title.toLowerCase().includes("cafe")) {
                activity.tag = "Food";
              } else if (activity.title.toLowerCase().includes("museum") ||
                         activity.title.toLowerCase().includes("gallery") ||
                         activity.title.toLowerCase().includes("theater") ||
                         activity.title.toLowerCase().includes("theatre") ||
                         activity.title.toLowerCase().includes("park")) {
                activity.tag = "Culture";
              } else if (activity.title.toLowerCase().includes("shopping") ||
                         activity.title.toLowerCase().includes("store") ||
                         activity.title.toLowerCase().includes("mall") ||
                         activity.title.toLowerCase().includes("market")) {
                activity.tag = "Shop";
              } else if (activity.title.toLowerCase().includes("leave") ||
                         activity.title.toLowerCase().includes("arrive") ||
                         activity.title.toLowerCase().includes("drive") ||
                         activity.title.toLowerCase().includes("metro") ||
                         activity.title.toLowerCase().includes("subway")) {
                activity.tag = "Transport";
              } else {
                activity.tag = "Event";
              }
            }
            
            // Format the activity data properly to match what the API expects
            const formattedActivity = {
              tripId: trip.id,
              title: activity.title,
              // Convert ISO date string to Date object
              date: new Date(activity.date),
              time: activity.time,
              locationName: activity.locationName || "Unknown location",
              latitude: activity.latitude || null,
              longitude: activity.longitude || null,
              notes: activity.notes || "",
              tag: activity.tag || "Event",
              // Add missing required fields
              order: (await queryClient.fetchQuery({
                queryKey: [API_ENDPOINTS.TRIPS, trip.id, "activities"],
                queryFn: () => apiRequest(API_ENDPOINTS.TRIPS + '/' + trip.id + '/activities')
              })).length + addedCount,
              assignedTo: ""
            };
            
            console.log("Adding formatted activity:", formattedActivity);
            await addActivity.mutateAsync(formattedActivity);
            addedCount++;
            return { success: true, activity };
          } catch (error) {
            console.error("Error adding activity:", error, activity);
            return { success: false, activity };
          }
        })
      );
      
      // Collect any errors
      results.filter(r => !r.success).forEach(result => {
        errors.push(result.activity.title || "Unnamed activity");
      });
      
      // Add a small delay between chunks to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Query invalidation to refresh activities
    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id, "activities"] });
    
    // Notify the user of completion
    if (addedCount > 0) {
      toast({
        title: "Itinerary Imported",
        description: `Successfully added ${addedCount} activities to your trip.${errors.length > 0 ? ' Some activities could not be added.' : ''}`,
      });
      
      // Add a final confirmation message to the conversation
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `✅ Import complete! I've added ${addedCount} activities to your trip from the itinerary.${errors.length > 0 ? 
            `\n\n⚠️ I had trouble with ${errors.length} activities: ${errors.join(', ')}. Please check those manually.` : 
            '\n\nAll activities have been added and should now appear in your schedule with the correct times and locations.'}`
        }
      ]);
    } else if (errors.length > 0) {
      toast({
        title: "Import Failed",
        description: "Could not add any activities from the itinerary.",
        variant: "destructive",
      });
      
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `❌ I wasn't able to add any activities from your itinerary. There may be an issue with the format or connection. Please try again or add activities manually.`
        }
      ]);
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
