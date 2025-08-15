import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Checkbox } from "@/components/ui/checkbox";
import { formatDateRange, formatDate } from "@/lib/constants";
import { ClientTrip, ClientActivity, Todo } from "@/lib/types";
import ActivityTimeline from "./ActivityTimeline";
import EnhancedAIAssistantModalV2 from "./EnhancedAIAssistantModalV2";
import { ItineraryOptimizationModal } from "./ItineraryOptimizationModal";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import useAIAssistant from "@/hooks/useAIAssistant";
import BudgetTracker from "./BudgetTracker";
import FamilyQuickActions from "./FamilyQuickActions";
import CollaborativeSuggestions from "./CollaborativeSuggestions";
import TripComments from "./TripComments";
import { jwtAuth } from "@/lib/jwtAuth";

interface ItinerarySidebarProps {
  trip: ClientTrip;
  activities: ClientActivity[];
  todos: Todo[];
  notes: string;
  activeDay: Date | null;
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
  const [dayPage, setDayPage] = useState(0);

  const { optimizeItinerary } = useAIAssistant();
  const user = jwtAuth.getUser();

  // One-click auto-optimization function
  const handleAutoOptimize = async () => {
    setIsAutoOptimizing(true);
    try {
      const result = await optimizeItinerary.mutateAsync(trip.id);

      // Debug: Log what optimizations we received
      // Apply each optimization by updating the activity times
      let successfulUpdates = 0;
      for (const optimization of result.optimizedActivities) {
        // Find activity by ID - optimization.id should be a string representation of the numeric ID
        const activity = activities.find(a => a.id.toString() === optimization.id.toString());

        if (!activity) {
          continue;
        }

        if (activity.time !== optimization.suggestedTime) {
          try {
            // Update activity time from optimization suggestion

            // Send update request with minimal data to avoid overwrites
            await apiRequest("PUT", `${API_ENDPOINTS.ACTIVITIES}/${activity.id}`, {
              time: optimization.suggestedTime,
            });

            successfulUpdates++;
          } catch (updateError) {
            // Handle update error silently
          }
        }
      }

      // Refresh activities to show changes
      onActivitiesUpdated();

      toast({
        title: "🚀 Itinerary Auto-Optimized!",
        description: `Applied ${successfulUpdates} time optimization${successfulUpdates !== 1 ? 's' : ''}. ${result.recommendations?.length ? result.recommendations.join(". ") : ''}`,
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
        completed: !(todo as any).completed || !todo.is_completed,
      });
      return res;
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
      return res;
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

  const updateNotes = useMutation({
    mutationFn: async () => {
      // If notes are empty but we're adding content, create a new note
      if (!notes && newNote) {
        const res = await apiRequest("POST", API_ENDPOINTS.NOTES, {
          tripId: trip.id,
          content: newNote,
        });
        return res;
      }
      // Otherwise update existing note (assuming there's only one note per trip for simplicity)
      else {
        const res = await apiRequest("PUT", `${API_ENDPOINTS.NOTES}/1`, {
          tripId: trip.id,
          content: newNote,
        });
        return res;
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
  const activeDayActivities = activeDay ? activities.filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate.toDateString() === activeDay.toDateString();
  }) : [];

  return (
    <>
      <aside id="sidebar" className="w-full h-full bg-white dark:bg-[hsl(var(--card))] border-r dark:border-[hsl(var(--border))] overflow-y-auto p-4">
        {/* Trip Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">{trip.title}</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            {formatDateRange(new Date(trip.startDate), new Date(trip.endDate))}
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="itinerary">
          <TabsList className={`grid grid-cols-${trip.collaborativeMode ? '5' : '4'} mb-4`}>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="todo">To-Do</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            {trip.collaborativeMode && (
              <TabsTrigger value="collaborate">Collab</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="itinerary" className="space-y-4">
            {/* Day Selection with pagination for many days */}
            <div className="mb-4">
              {trip.days && trip.days.length > 0 ? (
                trip.days.length > 7 ? (
                  // Paginated view for trips longer than 7 days
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDayPage(Math.max(0, dayPage - 1))}
                        disabled={dayPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Days {dayPage * 6 + 1}-{Math.min((dayPage + 1) * 6, trip.days.length)} of {trip.days.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDayPage(Math.min(Math.floor((trip.days.length - 1) / 6), dayPage + 1))}
                        disabled={(dayPage + 1) * 6 >= trip.days.length}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {trip.days.slice(dayPage * 6, (dayPage + 1) * 6).map((day, index) => {
                        const actualIndex = dayPage * 6 + index;
                        return (
                          <Button
                            key={day.toISOString()}
                            variant={day.toDateString() === activeDay?.toDateString() ? "default" : "outline"}
                            className="px-3 py-2 text-sm h-auto"
                            onClick={() => onChangeDayClick(day)}
                          >
                            Day {actualIndex + 1} - {formatDate(day)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Regular grid for 7 days or less
                  <div className="grid grid-cols-2 gap-2">
                    {trip.days.map((day, index) => (
                      <Button
                        key={day.toISOString()}
                        variant={day.toDateString() === activeDay?.toDateString() ? "default" : "outline"}
                        className="px-3 py-2 text-sm md:text-base h-auto"
                        onClick={() => onChangeDayClick(day)}
                      >
                        Day {index + 1} - {formatDate(day)}
                      </Button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No days available for this trip
                </div>
              )}
            </div>

            {/* Split buttons into separate containers */}
            <div className="space-y-2 mb-4">
              {/* Add Activity Button */}
              <Button
                className="w-full"
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
              </Button>

              {/* AI Assistant Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsAIModalOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                AI Assistant
              </Button>

              {/* AI Itinerary Optimization Button */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
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
              </Button>
            </div>

            {/* Family Quick Actions */}
            {trip.travelingWithKids && (
              <FamilyQuickActions
                tripId={trip.id}
                date={activeDay || new Date()}
                onActivityAdded={onActivitiesUpdated}
                travelingWithKids={trip.travelingWithKids}
              />
            )}

            {/* Itinerary Timeline */}
            <ActivityTimeline
              activities={activeDayActivities}
              date={activeDay || new Date()}
              tripId={trip.id}
              onActivityUpdated={onActivitiesUpdated}
              regenerationsRemaining={
                trip.aiRegenerationsLimit !== undefined && trip.aiRegenerationsUsed !== undefined
                  ? trip.aiRegenerationsLimit - trip.aiRegenerationsUsed
                  : undefined
              }
              onRegenerationsUpdate={(remaining) => {
                // Update will happen through refetch
                onActivitiesUpdated();
              }}
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
                        checked={(todo as any).completed ?? todo.is_completed ?? false}
                        onCheckedChange={() => toggleTodo.mutate(todo)}
                      />
                      <label
                        htmlFor={`todo-${todo.id}`}
                        className={`flex-1 cursor-pointer ${(todo as any).completed || todo.is_completed ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}
                      >
                        {(todo as any).content || todo.content}
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

          <TabsContent value="budget">
            <BudgetTracker 
              trip={trip} 
              onBudgetUpdate={onActivitiesUpdated}
            />
          </TabsContent>

          {trip.collaborativeMode && (
            <TabsContent value="collaborate" className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  🤝 Collaborative Mode is active! Friends can suggest activities and comment on your trip.
                </p>
              </div>
              
              <CollaborativeSuggestions
                tripId={trip.id}
                isOwner={trip.userId === user?.id}
                isAuthenticated={!!user}
              />
              
              <div className="mt-6">
                <TripComments
                  tripId={trip.id}
                  isAuthenticated={!!user}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </aside>

      {/* AI Assistant Modal */}
      <EnhancedAIAssistantModalV2
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        trip={trip}
        activities={activities}
        currentDate={activeDay || new Date()}
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
