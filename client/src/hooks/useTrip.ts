import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { Todo, Note } from "@shared/schema";

export default function useTrip(tripId: string | number) {
  // Safeguard against objects being passed as tripId
  if (typeof tripId === 'object') {
    // tripId is an object! This should never happen.
    // Try to extract the ID if possible
    const extractedId = (tripId as any)?.id;
    if (extractedId && (typeof extractedId === 'string' || typeof extractedId === 'number')) {
      tripId = extractedId;
      // Extracted ID from object
    } else {
      // If we can't extract a valid ID, return early to avoid making bad API calls
      // Could not extract valid ID from object, using empty string
      tripId = '';
    }
  }
  
  // Additional check for '[object Object]' string
  if (tripId === '[object Object]') {
    // tripId is the string "[object Object]"! This indicates an object was stringified.
    tripId = '';
  }
  
  // Helper function to check if trip exists in localStorage (guest mode)
  const getGuestTrip = (): ClientTrip | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("remvana_guest_trips");
    if (!stored) return null;
    
    const guestTrips = JSON.parse(stored);
    const foundTrip = guestTrips.find((trip: ClientTrip) => trip.id === Number(tripId)) || null;
    
    // Trip data validation and retrieval
    
    return foundTrip;
  };

  // Fetch trip details
  const {
    data: trip,
    isLoading: isTripLoading,
    error: tripError,
  } = useQuery<ClientTrip>({
    queryKey: [API_ENDPOINTS.TRIPS, tripId],
    queryFn: async () => {
      if (!tripId) return null;
      
      // For regular trips, fetch from server with authentication
      const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}`, undefined);
      return res; // apiRequest already parses JSON
    },
    enabled: !!tripId && Number(tripId) > 0, // Don't fetch for guest trips (negative IDs)
    initialData: () => {
      // For guest trips, return localStorage data immediately
      if (tripId && Number(tripId) < 0) {
        const guestTrip = getGuestTrip();
        if (guestTrip) {
          // Using guest trip from localStorage
          return guestTrip;
        }
      }
      return undefined;
    },
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
      
      // For guest trips, return empty todos for now
      const guestTrip = getGuestTrip();
      if (guestTrip) {
        return [];
      }
      
      const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}/todos`, undefined);
      return res; // apiRequest already parses JSON
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
      
      // For guest trips, return empty notes for now
      const guestTrip = getGuestTrip();
      if (guestTrip) {
        return [];
      }
      
      const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}/notes`, undefined);
      return res; // apiRequest already parses JSON
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
      return res; // apiRequest already parses JSON
    } catch (error) {
      // Error updating trip
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
      // Error deleting trip
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
