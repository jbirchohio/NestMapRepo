import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
import { API_ENDPOINTS } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";

interface RenameTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ClientTrip | null;
}

export default function RenameTripDialog({ 
  isOpen, 
  onClose, 
  trip 
}: RenameTripDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  
  // Reset the title whenever the dialog opens with a new trip
  // We use a separate flag to prevent infinite render loops
  const titleSetRef = useRef(false);
  if (trip && isOpen && !titleSetRef.current) {
    setTitle(trip.title);
    titleSetRef.current = true;
  }
  
  // Reset the flag when dialog closes
  if (!isOpen && titleSetRef.current) {
    titleSetRef.current = false;
  }
  
  const renameTrip = useMutation({
    mutationFn: async () => {
      if (!trip) throw new Error("No trip to rename");
      
      const response = await apiRequest(
        "PUT", 
        `${API_ENDPOINTS.TRIPS}/${trip.id}`, 
        { title }
      );
      
      if (!response.ok) {
        throw new Error("Failed to rename trip");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS] });
      toast({
        title: "Trip renamed",
        description: "Your trip has been renamed successfully."
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to rename trip. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      renameTrip.mutate();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Trip</DialogTitle>
          <DialogDescription>
            Enter a new name for your trip.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Trip Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={renameTrip.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renameTrip.isPending || !title.trim()}
            >
              {renameTrip.isPending ? "Renaming..." : "Rename Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
