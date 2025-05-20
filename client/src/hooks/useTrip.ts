import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip, Todo, Note } from "@/lib/types";

export default function useTrip(tripId: number) {
  // Fetch trip details
  const {
    data: trip,
    isLoading: isTripLoading,
    error: tripError,
  } = useQuery<ClientTrip>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const res = await fetch(`${API_ENDPOINTS.TRIPS}/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Fetch trip todos
  const {
    data: todos = [],
    isLoading: isTodosLoading,
    error: todosError,
  } = useQuery<Todo[]>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId, "todos"],
    queryFn: async () => {
      if (!tripId) return [];
      const res = await fetch(`${API_ENDPOINTS.TRIPS}/${tripId}/todos`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Fetch trip notes
  const {
    data: notesData = [],
    isLoading: isNotesLoading,
    error: notesError,
  } = useQuery<Note[]>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId, "notes"],
    queryFn: async () => {
      if (!tripId) return [];
      const res = await fetch(`${API_ENDPOINTS.TRIPS}/${tripId}/notes`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Extract the first note's content (or empty string if no notes)
  const notes = notesData.length > 0 ? notesData[0].content : "";

  // Update trip
  const updateTrip = async (updateData: Partial<ClientTrip>) => {
    if (!tripId) return null;
    
    try {
      const res = await apiRequest("PUT", `${API_ENDPOINTS.TRIPS}/${tripId}`, updateData);
      return await res.json();
    } catch (error) {
      console.error("Error updating trip:", error);
      throw error;
    }
  };

  // Delete trip
  const deleteTrip = async () => {
    if (!tripId) return false;
    
    try {
      await apiRequest("DELETE", `${API_ENDPOINTS.TRIPS}/${tripId}`, undefined);
      return true;
    } catch (error) {
      console.error("Error deleting trip:", error);
      throw error;
    }
  };

  return {
    trip,
    todos,
    notes,
    isLoading: isTripLoading || isTodosLoading || isNotesLoading,
    error: tripError || todosError || notesError,
    updateTrip,
    deleteTrip,
  };
}
