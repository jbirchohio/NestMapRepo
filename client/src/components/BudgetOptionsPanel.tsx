import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
import { BadgeDollarSign, Bookmark, Home, Utensils, Bus, Ticket } from "lucide-react";

interface BudgetOptionsPanelProps {
  trip: ClientTrip;
  onAddActivity?: (activity: any) => Promise<void>;
}

type BudgetLevel = "low" | "medium" | "high";
type ActivityType = "accommodation" | "food" | "transportation" | "activity" | "";

interface BudgetSuggestion {
  title: string;
  category: ActivityType;
  cost: string;
  description: string;
  tip: string;
}

interface BudgetResponse {
  budgetInfo: {
    level: string;
    estimatedDailyBudget: string;
    savingTips: string[];
  };
  suggestions: BudgetSuggestion[];
}

export default function BudgetOptionsPanel({ trip, onAddActivity }: BudgetOptionsPanelProps) {
  const { toast } = useToast();
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("medium");
  const [activityType, setActivityType] = useState<ActivityType>("");
  
  const budgetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", API_ENDPOINTS.AI.BUDGET_OPTIONS, {
        location: trip.city || trip.location || trip.title,
        budgetLevel,
        activityType: activityType || undefined
      });
      return res.json() as Promise<BudgetResponse>;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not get budget suggestions. Please try again.",
        variant: "destructive",
      });
      console.error("Error getting budget suggestions:", error);
    },
  });

  const handleGetSuggestions = () => {
    budgetMutation.mutate();
  };

  const getCategoryIcon = (category: ActivityType) => {
    switch (category) {
      case "accommodation":
        return <Home className="h-4 w-4" />;
      case "food":
        return <Utensils className="h-4 w-4" />;
      case "transportation":
        return <Bus className="h-4 w-4" />;
      case "activity":
        return <Ticket className="h-4 w-4" />;
      default:
        return <Bookmark className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Budget Options</h3>
        <p className="text-sm text-muted-foreground">
          Get suggestions to help you plan your trip within budget.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="budget">Budget Level</Label>
          <Select 
            value={budgetLevel} 
            onValueChange={(value) => setBudgetLevel(value as BudgetLevel)}
          >
            <SelectTrigger id="budget" className="mt-1">
              <SelectValue placeholder="Select budget level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Budget)</SelectItem>
              <SelectItem value="medium">Medium (Moderate)</SelectItem>
              <SelectItem value="high">High (Luxury)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="category">Category (Optional)</Label>
          <Select 
            value={activityType} 
            onValueChange={(value) => setActivityType(value as ActivityType)}
          >
            <SelectTrigger id="category" className="mt-1">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="accommodation">Accommodation</SelectItem>
              <SelectItem value="food">Food & Dining</SelectItem>
              <SelectItem value="transportation">Transportation</SelectItem>
              <SelectItem value="activity">Activities & Attractions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button 
        onClick={handleGetSuggestions}
        disabled={budgetMutation.isPending}
        className="w-full"
      >
        {budgetMutation.isPending ? "Getting suggestions..." : "Get Budget Options"}
      </Button>
      
      {budgetMutation.isSuccess && budgetMutation.data && (
        <div className="mt-4 space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center">
                <BadgeDollarSign className="h-5 w-5 mr-2" />
                {budgetMutation.data.budgetInfo.level.charAt(0).toUpperCase() + 
                  budgetMutation.data.budgetInfo.level.slice(1)} Budget
              </h4>
              <span className="text-sm font-bold">
                ~{budgetMutation.data.budgetInfo.estimatedDailyBudget}/day
              </span>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium">Saving Tips:</p>
              <ul className="text-sm mt-1 list-disc list-inside">
                {budgetMutation.data.budgetInfo.savingTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <h4 className="font-medium">Suggested Options</h4>
          <div className="space-y-3">
            {budgetMutation.data.suggestions.map((suggestion, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="p-1.5 rounded-full bg-primary/10 mr-2">
                          {getCategoryIcon(suggestion.category)}
                        </span>
                        <h5 className="font-medium">{suggestion.title}</h5>
                        <span className="ml-auto font-medium text-sm">{suggestion.cost}</span>
                      </div>
                      
                      <div className="mt-1.5">
                        <p className="text-sm">{suggestion.description}</p>
                        <p className="text-xs italic mt-1 text-muted-foreground">Tip: {suggestion.tip}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {budgetMutation.data.suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">No suggestions found for this budget level.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
