import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, MapPin, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import useAIAssistant from "@/hooks/useAIAssistant";
import { ClientTrip, ClientActivity } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ItineraryOptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: ClientTrip;
  activities: ClientActivity[];
  onApplyOptimization?: (optimizedActivities: any[]) => void;
  autoApply?: boolean;
}

export function ItineraryOptimizationModal({
  open,
  onOpenChange,
  trip,
  activities,
  onApplyOptimization,
  autoApply = false,
}: ItineraryOptimizationModalProps) {
  const [optimizationResult, setOptimizationResult] = useState<{
    optimizedActivities: Array<{
      id: string;
      suggestedTime: string;
      suggestedDay: number;
      reason: string;
    }>;
    recommendations: string[];
  } | null>(null);

  const { optimizeItinerary } = useAIAssistant();
  const { toast } = useToast();

  const handleOptimize = async () => {
    try {
      const result = await optimizeItinerary.mutateAsync(parseInt(trip.id));
      setOptimizationResult(result);
      
      // Auto-apply if enabled
      if (autoApply && onApplyOptimization) {
        onApplyOptimization(result.optimizedActivities);
        toast({
          title: "Itinerary Auto-Optimized!",
          description: "Your activities have been automatically reordered for better efficiency.",
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Unable to optimize your itinerary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyChanges = () => {
    if (optimizationResult && onApplyOptimization) {
      onApplyOptimization(optimizationResult.optimizedActivities);
      toast({
        title: "Itinerary Optimized!",
        description: "Your activities have been reordered for better efficiency.",
      });
      onOpenChange(false);
    }
  };

  const getActivityById = (id: string) => {
    return activities.find(a => a.id.toString() === id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-electric-600" />
            AI Itinerary Optimization
          </DialogTitle>
          <DialogDescription>
            Let our AI analyze your itinerary and suggest improvements to minimize travel time and avoid conflicts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!optimizationResult ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <Sparkles className="h-12 w-12 text-electric-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Ready to Optimize</h3>
                <p className="text-muted-foreground">
                  Analyze {activities.length} activities across {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
              
              <Button
                onClick={handleOptimize}
                disabled={optimizeItinerary.isPending || activities.length === 0}
                className="bg-electric-600 hover:bg-electric-700"
              >
                {optimizeItinerary.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Optimize My Itinerary
                  </>
                )}
              </Button>

              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Add some activities to your trip first to enable optimization.
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-6">
                {/* Recommendations Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Optimization Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {optimizationResult.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="h-2 w-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Optimized Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Suggested Changes
                    </CardTitle>
                    <CardDescription>
                      Review the proposed time and day adjustments for your activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {optimizationResult.optimizedActivities.map((optimization) => {
                        const activity = getActivityById(optimization.id);
                        if (!activity) return null;

                        const currentTime = activity.time || "Not set";
                        const currentDay = 1; // Default to day 1 for now
                        const hasTimeChange = currentTime !== optimization.suggestedTime;
                        const hasDayChange = currentDay !== optimization.suggestedDay;

                        return (
                          <div key={optimization.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{activity.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {activity.locationName || "Location not set"}
                                </div>
                              </div>
                              {(hasTimeChange || hasDayChange) && (
                                <Badge variant="secondary" className="bg-electric-100 text-electric-700">
                                  Changes suggested
                                </Badge>
                              )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground">Current Schedule</p>
                                <p>Day {currentDay} at {currentTime}</p>
                              </div>
                              <div>
                                <p className="font-medium text-green-600">Suggested Schedule</p>
                                <p className="font-medium">Day {optimization.suggestedDay} at {optimization.suggestedTime}</p>
                              </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  <strong>Why this change:</strong> {optimization.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplyChanges}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Apply Optimization
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
