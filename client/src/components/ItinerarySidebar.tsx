import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Checkbox } from "@/components/ui/checkbox";
import { formatDateRange, formatDate } from "@/lib/constants";
import { ClientTrip, ClientActivity, Todo } from "@/lib/types";
import ActivityTimeline from "./ActivityTimeline";
import EnhancedAIAssistantModal from "./EnhancedAIAssistantModal";

import PdfExport from "./PdfExport";
import { ItineraryOptimizationModal } from "./ItineraryOptimizationModal";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import useAIAssistant from "@/hooks/useAIAssistant";

interface ItinerarySidebarProps {
  trip: ClientTrip;
  activities: ClientActivity[];
  todos: Todo[];
  notes: string;
  activeDay: Date;
  onChangeDayClick: (day: Date) => void;
  onActivitiesUpdated: () => void;
  onAddActivity?: (activity: ClientActivity | null, day: Date | null) => void;
  mobileView?: 'itinerary' | 'map';
  setMobileView?: (view: 'itinerary' | 'map') => void;
}

export default function ItinerarySidebar({
  trip,
  activities,
  todos,
  notes,
  activeDay,
  onChangeDayClick,
  onActivitiesUpdated,
  onAddActivity,
  mobileView,
  setMobileView,
}: ItinerarySidebarProps) {
  const { toast } = useToast();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newNote, setNewNote] = useState("");
  
  const { optimizeItinerary } = useAIAssistant();

  // One-click auto-optimization function
  const handleAutoOptimize = async () => {
    setIsAutoOptimizing(true);
    try {
      const result = await optimizeItinerary.mutateAsync(trip.id);
      
      // Debug: Log what optimizations we received
      console.log("Optimization result:", result);
      
      // Apply each optimization by updating the activity times
      for (const optimization of result.optimizedActivities) {
        // Try to find activity by ID first, then by title as fallback
        let activity = activities.find(a => a.id.toString() === optimization.id);
        
        // Fallback: If ID matching fails, try matching by title
        if (!activity) {
          activity = activities.find(a => a.title.toLowerCase() === optimization.id.toLowerCase());
          console.log(`Fallback: Matching by title "${optimization.id}" found:`, !!activity);
        }
        
        console.log(`Processing optimization for activity ${optimization.id}:`, {
          foundActivity: !!activity,
          matchedById: activities.some(a => a.id.toString() === optimization.id),
          matchedByTitle: activities.some(a => a.title.toLowerCase() === optimization.id.toLowerCase()),
          currentTime: activity?.time,
          suggestedTime: optimization.suggestedTime,
          willUpdate: activity && activity.time !== optimization.suggestedTime
        });
        
        if (activity && activity.time !== optimization.suggestedTime) {
          try {
            console.log(`Updating activity ${activity.id} (${activity.title}) from ${activity.time} to ${optimization.suggestedTime}`);
            await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, {
              ...activity,
              time: optimization.suggestedTime,
            });
          } catch (updateError) {
            console.error("Failed to update activity:", updateError);
          }
        }
      }
      
      // Refresh activities to show changes
      onActivitiesUpdated();
      
      toast({
        title: "🚀 Itinerary Auto-Optimized!",
        description: `Applied ${result.optimizedActivities.length} time optimizations. ${result.recommendations.join(". ")}`,
      });
    } catch (error) {
      toast({
        title: "Optimization Failed", 
        description: "Unable to auto-optimize your itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoOptimizing(false);
    }
  };
  
  const toggleTodo = useMutation({
    mutationFn: async (todo: Todo) => {
      const res = await apiRequest("PUT", `${API_ENDPOINTS.TODOS}/${todo.id}`, {
        ...todo,
        completed: !todo.completed,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id, "todos"] });
    }
  });
  
  const addTodo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.TODOS, {
        tripId: trip.id,
        task: newTodoText,
        completed: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id, "todos"] });
      setNewTodoText("");
      toast({
        title: "Todo added",
        description: "Your todo has been added to the list.",
      });
    }
  });

  const toggleTripCompletion = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/trips/${trip.id}/toggle-complete`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS] });
      toast({
        title: trip.completed ? "Trip marked as ongoing" : "Trip completed!",
        description: trip.completed ? "Trip has been marked as ongoing" : "Congratulations on completing your trip!",
      });
    }
  });
  
  const updateNotes = useMutation({
    mutationFn: async () => {
      // If notes are empty but we're adding content, create a new note
      if (!notes && newNote) {
        const res = await apiRequest("POST", API_ENDPOINTS.NOTES, {
          tripId: trip.id,
          content: newNote,
        });
        return res.json();
      } 
      // Otherwise update existing note (assuming there's only one note per trip for simplicity)
      else {
        const res = await apiRequest("PUT", `${API_ENDPOINTS.NOTES}/1`, {
          tripId: trip.id,
          content: newNote,
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id, "notes"] });
      toast({
        title: "Notes updated",
        description: "Your notes have been saved.",
      });
    }
  });
  
  const handleSubmitTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      addTodo.mutate();
    }
  };
  
  const handleSubmitNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim() !== notes) {
      updateNotes.mutate();
    }
  };
  
  // Filter activities for the active day
  const activeDayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate.toDateString() === activeDay.toDateString();
  });
  
  return (
    <>
      <aside id="sidebar" className="w-full h-full bg-white dark:bg-[hsl(var(--card))] border-r dark:border-[hsl(var(--border))] overflow-y-auto p-4">
        {/* Trip Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{trip.title}</h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                {formatDateRange(new Date(trip.startDate), new Date(trip.endDate))}
              </p>
            </div>
            <Button
              variant={trip.completed ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTripCompletion.mutate()}
              disabled={toggleTripCompletion.isPending}
              className="flex items-center gap-2"
            >
              {trip.completed ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="itinerary">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="todo">To-Do</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="itinerary" className="space-y-4">
            {/* Day Selection - better stacking for days */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2">
                {trip.days?.map((day, index) => (
                  <button
                    key={day.toISOString()}
                    className={`px-3 py-2 ${
                      day.toDateString() === activeDay.toDateString() 
                        ? 'bg-[hsl(var(--primary))] text-white' 
                        : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]'
                    } rounded-md text-sm md:text-base`}
                    onClick={() => onChangeDayClick(day)}
                  >
                    Day {index + 1} - {formatDate(day)}
                  </button>
                ))}
              </div>
            </div>

            {/* Split buttons into separate containers */}
            <div className="space-y-2 mb-4">
              {/* Add Activity Button */}
              <button 
                className="w-full py-3 px-4 bg-[hsl(var(--primary))] text-white rounded-md flex items-center justify-center"
                onClick={() => {
                  if (onAddActivity) {
                    onAddActivity(null, activeDay);
                  } else {
                    // Fallback to clicking timeline button if centralized handler not available
                    const timeline = document.querySelector(".timeline-container");
                    if (timeline) {
                      const addButton = timeline.querySelector("button");
                      if (addButton) addButton.click();
                    }
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Activity
              </button>
              
              {/* AI Assistant Button */}
              <button 
                className="w-full py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-[hsl(var(--primary))] rounded-md border border-blue-100 dark:border-blue-900/40 flex items-center justify-center"
                onClick={() => setIsAIModalOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                AI Assistant
              </button>

              {/* AI Itinerary Optimization Buttons */}
              <div className="flex gap-2">
                {/* One-Click Auto Optimize Button */}
                <button 
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800/50 flex items-center justify-center hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAutoOptimize}
                  disabled={activities.length === 0 || isAutoOptimizing}
                >
                  {isAutoOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      Auto-Optimize
                    </>
                  )}
                </button>
                
                {/* Review & Optimize Button */}
                <button 
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800/50 flex items-center justify-center hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all text-sm"
                  onClick={() => setIsOptimizationModalOpen(true)}
                  disabled={activities.length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3h5v5"/>
                    <path d="m21 3-5 5"/>
                    <path d="M8 3H3v5"/>
                    <path d="m3 3 5 5"/>
                    <path d="M16 21h5v-5"/>
                    <path d="m21 21-5-5"/>
                    <path d="M8 21H3v-5"/>
                    <path d="m3 21 5-5"/>
                  </svg>
                  Review & Optimize
                </button>
              </div>
              

              
              {/* PDF Export Button */}
              <PdfExport trip={trip} />
            </div>

            {/* Itinerary Timeline */}
            <ActivityTimeline 
              activities={activeDayActivities} 
              date={activeDay} 
              tripId={trip.id}
              onActivityUpdated={onActivitiesUpdated}
            />
          </TabsContent>
          
          <TabsContent value="todo">
            <div className="space-y-4">
              <form onSubmit={handleSubmitTodo} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  className="flex-1 px-3 py-2 border dark:border-[hsl(var(--border))] rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                />
                <Button type="submit" disabled={!newTodoText.trim() || addTodo.isPending}>
                  Add
                </Button>
              </form>
              
              <div className="space-y-2">
                {todos.length === 0 ? (
                  <p className="text-center py-4 text-[hsl(var(--muted-foreground))]">No tasks yet. Add one above!</p>
                ) : (
                  todos.map((todo) => (
                    <div key={todo.id} className="flex items-center space-x-2 p-2 hover:bg-[hsl(var(--muted))] rounded-md">
                      <Checkbox 
                        id={`todo-${todo.id}`} 
                        checked={todo.completed}
                        onCheckedChange={() => toggleTodo.mutate(todo)}
                      />
                      <label 
                        htmlFor={`todo-${todo.id}`}
                        className={`flex-1 cursor-pointer ${todo.completed ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}
                      >
                        {todo.task}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notes">
            <form onSubmit={handleSubmitNotes}>
              <textarea
                className="w-full h-64 p-3 border dark:border-[hsl(var(--border))] rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="Add notes for your trip..."
                value={newNote || notes}
                onChange={(e) => setNewNote(e.target.value)}
              ></textarea>
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={updateNotes.isPending || (newNote.trim() === notes)}>
                  Save Notes
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </aside>
      
      {/* AI Assistant Modal */}
      <EnhancedAIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        trip={trip}
        activities={activities}
        currentDate={activeDay}
        onActivitiesUpdated={() => {
          queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS, trip.id, "activities"] });
        }}
      />

      {/* AI Itinerary Optimization Modal */}
      <ItineraryOptimizationModal
        open={isOptimizationModalOpen}
        onOpenChange={setIsOptimizationModalOpen}
        trip={trip}
        activities={activities}
        onApplyOptimization={(optimizedActivities) => {
          // Here we would typically update the activities with the new times/days
          // For now, we'll just refresh the activities to show the user feedback
          onActivitiesUpdated();
        }}
      />
    </>
  );
}
