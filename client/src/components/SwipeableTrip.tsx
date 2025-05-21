import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientTrip } from "@/lib/types";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SwipeableTripProps {
  trip: ClientTrip;
  onNavigate: (tripId: number) => void;
  onRename: (trip: ClientTrip) => void;
}

export default function SwipeableTrip({ trip, onNavigate, onRename }: SwipeableTripProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const [longPress, setLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressDelay = 500; // milliseconds for long press

  // Handle deletion mutation
  const deleteTrip = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `${API_ENDPOINTS.TRIPS}/${trip.id}`);
      if (!response.ok) {
        throw new Error("Failed to delete trip");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS] });
      toast({
        title: "Trip deleted",
        description: "Your trip has been deleted successfully."
      });
      setIsDeleting(false);
      setSwiped(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete trip. Please try again.",
        variant: "destructive"
      });
      setIsDeleting(false);
      setSwiped(false);
    }
  });

  // Configure swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setSwiped(true);
    },
    onSwipedRight: () => {
      setSwiped(false);
    },
    trackMouse: true
  });

  // Handle long press for rename
  const handleMouseDown = () => {
    if (swiped) return; // Don't trigger long press when swiped
    
    longPressTimer.current = setTimeout(() => {
      setLongPress(true);
      onRename(trip);
    }, longPressDelay);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Only navigate if it was a short tap (not a long press) and not in swipe mode
    if (!longPress && !swiped) {
      onNavigate(trip.id);
    }
    
    // Reset long press state
    if (longPress) {
      setLongPress(false);
    }
  };
  
  const handleMouseMove = () => {
    // Cancel long press if user moves while pressing
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Handle cancel swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (swiped) {
        setSwiped(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [swiped]);

  // Handle delete confirmation
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${trip.title}"?`)) {
      setIsDeleting(true);
      deleteTrip.mutate();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-md" {...swipeHandlers}>
      {/* Delete button revealed on swipe */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center transition-transform duration-200 ease-out ${
          swiped ? "transform translate-x-0" : "transform translate-x-full"
        }`}
        style={{ width: "70px" }}
      >
        <Button
          variant="destructive"
          size="icon"
          className="h-full w-full rounded-none"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Card with transform based on swipe state */}
      <div
        className={`transition-transform duration-200 ease-out ${
          swiped ? "transform -translate-x-[70px]" : "transform translate-x-0"
        }`}
      >
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            longPress ? "bg-[hsl(var(--muted))]" : ""
          }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onTouchMove={handleMouseMove}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-lg">{trip.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </p>
              </div>
              {/* Visual indicator that trip can be renamed with long press */}
              <div className="text-[hsl(var(--muted-foreground))] opacity-50">
                <Edit size={16} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}