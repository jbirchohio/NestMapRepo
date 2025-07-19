import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useOnboarding, UserRole } from '@/contexts/OnboardingContext';

// Import step components
import { AdminSteps } from './steps/AdminSteps';
import { TravelManagerSteps } from './steps/TravelManagerSteps';
import { TravelerSteps } from './steps/TravelerSteps';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const { 
    flow, 
    nextStep, 
    previousStep, 
    completeStep, 
    skipStep,
    finishOnboarding,
    trackEvent 
  } = useOnboarding();

  const [isCompleting, setIsCompleting] = useState(false);

  if (!flow) return null;

  const currentStep = flow.steps[flow.currentStepIndex];
  const progress = (flow.completedSteps / flow.totalSteps) * 100;
  const canGoNext = flow.currentStepIndex < flow.totalSteps - 1;
  const canGoPrevious = flow.currentStepIndex > 0;

  const handleStepComplete = async (stepId: string) => {
    completeStep(stepId);
    
    // Auto-advance to next step after completion
    setTimeout(() => {
      if (canGoNext) {
        nextStep();
      } else {
        // Last step completed
        handleFinishOnboarding();
      }
    }, 1000);
  };

  const handleSkipStep = (stepId: string) => {
    skipStep(stepId);
    if (canGoNext) {
      nextStep();
    }
  };

  const handleFinishOnboarding = async () => {
    setIsCompleting(true);
    try {
      finishOnboarding();
      trackEvent('onboarding_wizard_completed', { role: flow.role });
      
      // Simulate completion process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const renderStepContent = () => {
    const stepProps = {
      step: currentStep,
      onComplete: handleStepComplete,
      onSkip: handleSkipStep,
    };

    switch (flow.role) {
      case 'admin':
        return <AdminSteps {...stepProps} />;
      case 'travel_manager':
        return <TravelManagerSteps {...stepProps} />;
      case 'traveler':
        return <TravelerSteps {...stepProps} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'travel_manager': return 'Travel Manager';
      case 'traveler': return 'Traveler';
      default: return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold">
                Setup Wizard
              </DialogTitle>
              <Badge variant="secondary">
                {getRoleDisplayName(flow.role)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {flow.currentStepIndex + 1} of {flow.totalSteps}
              </span>
              <span className="text-muted-foreground">
                {flow.completedSteps}/{flow.totalSteps} completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step Info */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              {currentStep.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : currentStep.required ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-semibold">{currentStep.title}</h3>
            </div>
            {!currentStep.required && (
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStep.description}
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {isCompleting ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Completing Setup...</h3>
                <p className="text-muted-foreground">
                  Finalizing your NestMap configuration
                </p>
              </div>
            </div>
          ) : (
            renderStepContent()
          )}
        </div>

        {/* Footer */}
        {!isCompleting && (
          <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={!canGoPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {!currentStep.required && !currentStep.completed && (
                <Button
                  variant="ghost"
                  onClick={() => handleSkipStep(currentStep.id)}
                  className="text-muted-foreground"
                >
                  Skip
                </Button>
              )}
              
              {canGoNext ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinishOnboarding}
                  className="flex items-center gap-2"
                >
                  Complete Setup
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
