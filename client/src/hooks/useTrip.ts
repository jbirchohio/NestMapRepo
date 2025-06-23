import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { Todo, Note } from "@shared/schema";
export default function useTrip(tripId: string | number) {
    // Helper function to check if trip exists in localStorage (guest mode)
    const getGuestTrip = (): ClientTrip | null => {
        if (typeof window === "undefined")
            return null;
        const stored = localStorage.getItem("nestmap_guest_trips");
        if (!stored)
            return null;
        const guestTrips = JSON.parse(stored);
        const foundTrip = guestTrips.find((trip: ClientTrip) => trip.id === Number(tripId)) || null;
        // Debug localStorage trip data
        console.log('useTrip debug:', {
            tripId,
            storedData: stored,
            guestTripsCount: guestTrips.length,
            foundTrip,
            foundTripCoords: foundTrip ? {
                cityLatitude: foundTrip.cityLatitude,
                cityLongitude: foundTrip.cityLongitude
            } : null
        });
        return foundTrip;
    };
    // Fetch trip details
    const { data: trip, isLoading: isTripLoading, error: tripError, } = useQuery<ClientTrip>({
        queryKey: [API_ENDPOINTS.TRIPS, tripId],
        queryFn: async () => {
            if (!tripId)
                return null;
            // For regular trips, fetch from server with authentication
            const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}`, undefined);
            return res.json();
        },
        enabled: !!tripId && Number(tripId) > 0, // Don't fetch for guest trips (negative IDs)
        initialData: () => {
            // For guest trips, return localStorage data immediately
            if (tripId && Number(tripId) < 0) {
                const guestTrip = getGuestTrip();
                if (guestTrip) {
                    console.log('Using guest trip from localStorage as initialData:', guestTrip);
                    return guestTrip;
                }
            }
            return undefined;
        },
    });
    // Fetch trip todos
    const { data: todos = [], isLoading: isTodosLoading, error: todosError, } = useQuery<Todo[]>({
        queryKey: [API_ENDPOINTS.TRIPS, tripId, "todos"],
        queryFn: async () => {
            if (!tripId)
                return [];
            // For guest trips, return empty todos for now
            const guestTrip = getGuestTrip();
            if (guestTrip) {
                return [];
            }
            const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}/todos`, undefined);
            return res.json();
        },
        enabled: !!tripId,
    });
    // Fetch trip notes
    const { data: notesData = [], isLoading: isNotesLoading, error: notesError, } = useQuery<Note[]>({
        queryKey: [API_ENDPOINTS.TRIPS, tripId, "notes"],
        queryFn: async () => {
            if (!tripId)
                return [];
            // For guest trips, return empty notes for now
            const guestTrip = getGuestTrip();
            if (guestTrip) {
                return [];
            }
            const res = await apiRequest("GET", `${API_ENDPOINTS.TRIPS}/${tripId}/notes`, undefined);
            return res.json();
        },
        enabled: !!tripId,
    });
    // Extract the first note's content (or empty string if no notes)
    const notes = notesData.length > 0 ? notesData[0].content : "";
    // Update trip
    const updateTrip = async (updateData: Partial<ClientTrip>) => {
        if (!tripId)
            return null;
        try {
            const res = await apiRequest("PUT", `${API_ENDPOINTS.TRIPS}/${tripId}`, updateData);
            return await res.json();
        }
        catch (error) {
            console.error("Error updating trip:", error);
            throw error;
        }
    };
    // Delete trip
    const deleteTrip = async () => {
        if (!tripId)
            return false;
        try {
            await apiRequest("DELETE", `${API_ENDPOINTS.TRIPS}/${tripId}`, undefined);
            return true;
        }
        catch (error) {
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
