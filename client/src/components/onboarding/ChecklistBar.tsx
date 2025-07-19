import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  AlertCircle,
  Trophy,
  Target
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

interface ChecklistBarProps {
  className?: string;
  compact?: boolean;
  onStepClick?: (stepIndex: number) => void;
}

export const ChecklistBar: React.FC<ChecklistBarProps> = ({
  className,
  compact = false,
  onStepClick
}) => {
  const { flow, goToStep } = useOnboarding();
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!flow) return null;

  const progress = (flow.completedSteps / flow.totalSteps) * 100;
  const isComplete = flow.isComplete;

  const handleStepClick = (stepIndex: number) => {
    if (onStepClick) {
      onStepClick(stepIndex);
    } else {
      goToStep(stepIndex);
    }
  };

  const getStepIcon = (step: typeof flow.steps[0], isActive: boolean) => {
    if (step.completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    
    if (isActive) {
      return step.required ? (
        <AlertCircle className="h-4 w-4 text-orange-500" />
      ) : (
        <Clock className="h-4 w-4 text-blue-500" />
      );
    }
    
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStepStatus = (step: typeof flow.steps[0]) => {
    if (step.completed) return 'completed';
    if (!step.required) return 'optional';
    return 'required';
  };

  if (compact && !isExpanded) {
    return (
      <Card className={cn("border-l-4 border-l-primary", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <Trophy className="h-5 w-5 text-yellow-500" />
              ) : (
                <Target className="h-5 w-5 text-primary" />
              )}
              <div>
                <h3 className="font-semibold text-sm">
                  {isComplete ? 'Setup Complete!' : 'Setup Progress'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {flow.completedSteps}/{flow.totalSteps} steps completed
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round(progress)}%
                </div>
                <Progress value={progress} className="w-16 h-2" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4 border-l-primary", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <Trophy className="h-5 w-5 text-yellow-500" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            <div>
              <h3 className="font-semibold">
                {isComplete ? 'Setup Complete! 🎉' : 'Setup Checklist'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isComplete 
                  ? 'Your NestMap account is ready to use'
                  : `Complete ${flow.totalSteps - flow.completedSteps} more steps`
                }
              </p>
            </div>
          </div>
          
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{flow.completedSteps}/{flow.totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {flow.steps.map((step, index) => {
            const isActive = index === flow.currentStepIndex;
            const status = getStepStatus(step);
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                  isActive && "bg-primary/10 border border-primary/20",
                  step.completed && "bg-green-50 border border-green-200",
                  !step.completed && !isActive && "hover:bg-muted/50"
                )}
                onClick={() => handleStepClick(index)}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step, isActive)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      "text-sm font-medium truncate",
                      step.completed && "text-green-700",
                      isActive && "text-primary"
                    )}>
                      {step.title}
                    </h4>
                    
                    {status === 'optional' && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                    
                    {step.completed && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        Done
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                    step.completed && "bg-green-500 border-green-500 text-white",
                    isActive && !step.completed && "border-primary text-primary",
                    !step.completed && !isActive && "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {step.completed ? '✓' : index + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">
                Congratulations! Your setup is complete.
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              You're ready to start using NestMap for your travel management needs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistBar;
