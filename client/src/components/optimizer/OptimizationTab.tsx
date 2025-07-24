// Optimization tab component
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, Clock, Route, Target } from 'lucide-react';

export interface Improvement {
  type: string;
  description: string;
  impact: number;
  timeSaved?: number;
  moneySaved?: number;
}

export interface Optimization {
  improvements: Improvement[];
  timeSaved: number;
  moneySaved: number;
  efficiencyGain: number;
  optimizedActivities: any[];
}

interface OptimizationTabProps {
  optimization: Optimization | null;
  isLoading: boolean;
  onApplyOptimization: () => void;
  isApplying: boolean;
}

export function OptimizationTab({ 
  optimization, 
  isLoading, 
  onApplyOptimization, 
  isApplying 
}: OptimizationTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!optimization) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <div className="text-lg font-medium">No optimizations available</div>
        <div className="text-muted-foreground">
          Add more activities to get optimization suggestions.
        </div>
      </div>
    );
  }

  const { improvements, timeSaved, moneySaved, efficiencyGain } = optimization;

  return (
    <div className="space-y-6">
      {/* Optimization Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Optimization Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{timeSaved}min</div>
              <div className="text-sm text-muted-foreground">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${moneySaved}</div>
              <div className="text-sm text-muted-foreground">Money Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{efficiencyGain}%</div>
              <div className="text-sm text-muted-foreground">Efficiency Gain</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Efficiency</span>
              <span>{efficiencyGain}%</span>
            </div>
            <Progress value={efficiencyGain} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Improvements List */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Improvements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {improvements.map((improvement, index) => (
              <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{improvement.type}</Badge>
                    <Badge 
                      variant={improvement.impact >= 7 ? "default" : improvement.impact >= 4 ? "secondary" : "outline"}
                    >
                      Impact: {improvement.impact}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{improvement.description}</p>
                  {(improvement.timeSaved || improvement.moneySaved) && (
                    <div className="flex gap-4 mt-2 text-xs">
                      {improvement.timeSaved && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {improvement.timeSaved}min saved
                        </span>
                      )}
                      {improvement.moneySaved && (
                        <span className="text-green-600">
                          ${improvement.moneySaved} saved
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Apply Optimization */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Apply Optimizations</h3>
              <p className="text-sm text-muted-foreground">
                This will update your trip schedule with the suggested improvements.
              </p>
            </div>
            <Button 
              onClick={onApplyOptimization}
              disabled={isApplying}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isApplying ? 'Applying...' : 'Apply All'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
