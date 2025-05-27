import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Checkbox } from "@/components/ui/checkbox";
import { formatDateRange, formatDate } from "@/lib/constants";
import { ClientTrip, ClientActivity, Todo } from "@/lib/types";
import ActivityTimeline from "./ActivityTimeline";
import EnhancedAIAssistantModal from "./EnhancedAIAssistantModal";
import CalendarIntegration from "./CalendarIntegration";
import PdfExport from "./PdfExport";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Circle } from "lucide-react";

interface ItinerarySidebarProps {
  trip: ClientTrip;
  activities: ClientActivity[];
  todos: Todo[];
  notes: string;
  activeDay: Date;
  onChangeDayClick: (day: Date) => void;
  onActivitiesUpdated: () => void;
}

export default function ItinerarySidebar({
  trip,
  activities,
  todos,
  notes,
  activeDay,
  onChangeDayClick,
  onActivitiesUpdated,
}: ItinerarySidebarProps) {
  const { toast } = useToast();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newNote, setNewNote] = useState("");
  
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
          <h2 className="text-2xl font-semibold">{trip.title}</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            {formatDateRange(new Date(trip.startDate), new Date(trip.endDate))}
          </p>
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
                  // Call the function from ActivityTimeline component
                  const timeline = document.querySelector(".timeline-container");
                  if (timeline) {
                    const addButton = timeline.querySelector("button");
                    if (addButton) addButton.click();
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
              
              {/* Calendar Export Button */}
              <CalendarIntegration trip={trip} activities={activities} />
              
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
    </>
  );
}
