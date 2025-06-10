import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface TripTemplate {
  id: string;
  title: string;
  description: string;
  duration: number;
  city: string;
  country: string;
  tags: string[];
  activities: any[];
  suggestedTodos: string[];
  bestTimeToVisit?: string;
  budget?: {
    low: number;
    medium: number;
    high: number;
  };
}

interface TripTemplatesProps {
  userId: number;
  onTripCreated?: (tripId: number) => void;
}

export default function TripTemplates({ userId, onTripCreated }: TripTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [startDate, setStartDate] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const { toast } = useToast();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const text = await response.text();
      const data = JSON.parse(text);
      return data;
    }
  });

  // Query state for templates

  const createTripMutation = useMutation({
    mutationFn: async ({ templateId, userId, startDate, customTitle }: {
      templateId: string;
      userId: number;
      startDate: string;
      customTitle?: string;
    }) => {
      const response = await fetch(`/api/templates/${templateId}/create-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, startDate, customTitle })
      });
      if (!response.ok) throw new Error("Failed to create trip");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Trip created!",
        description: `Your ${data.trip.title} itinerary is ready to explore.`,
      });
      setIsOpen(false);
      setSelectedTemplate(null);
      setStartDate("");
      setCustomTitle("");
      if (onTripCreated) {
        onTripCreated(data.trip.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating trip",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !startDate) return;

    createTripMutation.mutate({
      templateId: selectedTemplate.id,
      userId,
      startDate,
      customTitle: customTitle || undefined
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEndDate = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    return end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MapPin className="h-4 w-4 mr-2" />
          Browse Trip Templates
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto"
        style={{
          position: 'fixed',
          top: '10px',
          left: '5vw',
          right: '5vw',
          width: '90vw',
          maxWidth: '800px',
          maxHeight: 'calc(100vh - 20px)',
          overflow: 'auto',
          margin: '0 auto',
          zIndex: 50
        }}
      >
        <DialogHeader>
          <DialogTitle>Choose a Trip Template</DialogTitle>
        </DialogHeader>
        
        {selectedTemplate ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedTemplate.title}</h3>
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedTemplate.duration} days
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedTemplate.city}, {selectedTemplate.country}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedTemplate.activities.length} activities
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedTemplate(null)}
              >
                Back to Templates
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTemplate.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            {selectedTemplate.budget && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                <span>Budget: ${selectedTemplate.budget.low} - ${selectedTemplate.budget.high} per day</span>
              </div>
            )}

            {selectedTemplate.bestTimeToVisit && (
              <div className="text-sm">
                <strong>Best time to visit:</strong> {selectedTemplate.bestTimeToVisit}
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customTitle">Trip Title (optional)</Label>
                  <Input
                    id="customTitle"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={selectedTemplate.title}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>
              </div>

              {startDate && (
                <div className="text-sm text-muted-foreground">
                  Trip dates: {formatDate(startDate)} - {getEndDate(startDate, selectedTemplate.duration)}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={!startDate || createTripMutation.isPending}
                  className="flex-1"
                >
                  {createTripMutation.isPending ? "Creating Trip..." : "Create Trip"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : (
              <div className="grid gap-4">
                {templates?.map((template: TripTemplate) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {template.duration} days
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {template.city}, {template.country}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {template.activities.length} activities
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{template.tags.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                      {template.budget && (
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            ${template.budget.low}-{template.budget.high}/day
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
