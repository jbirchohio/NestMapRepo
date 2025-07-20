import React, { useState, useEffect } from 'react';
import Joyride, { 
  Step, 
  CallBackProps, 
  STATUS, 
  EVENTS,
} from 'react-joyride';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Target,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { useOnboarding, UserRole } from '@/contexts/OnboardingContext';

interface TourStep extends Omit<Step, 'content'> {
  title: string;
  content: string;
  stepId: string;
  role?: UserRole[];
  optional?: boolean;
  target: string | HTMLElement | Element | null;
}

// Define tour steps for different roles
const TOUR_STEPS: Record<string, TourStep[]> = {
  // Admin tour steps
  admin_connect_systems: [
    {
      target: '[data-tour="hr-integration"]',
      title: 'HR System Integration',
      content: 'Connect your HR platform to sync employee data and organizational structure automatically.',
      stepId: 'connect_systems',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="finance-integration"]',
      title: 'Finance System Integration',
      content: 'Link your finance system to manage budgets, track expenses, and generate cost reports.',
      stepId: 'connect_systems',
      placement: 'bottom',
    },
    {
      target: '[data-tour="test-connection"]',
      title: 'Test Your Connection',
      content: 'Click here to test the integration and ensure data flows correctly between systems.',
      stepId: 'connect_systems',
      placement: 'top',
    }
  ],
  
  admin_invite_team: [
    {
      target: '[data-tour="invite-button"]',
      title: 'Invite Team Members',
      content: 'Add travel managers and employees to your organization. They\'ll receive email invitations.',
      stepId: 'invite_team',
      placement: 'bottom',
    },
    {
      target: '[data-tour="bulk-invite"]',
      title: 'Bulk Import',
      content: 'Upload a CSV file to invite multiple team members at once.',
      stepId: 'invite_team',
      placement: 'left',
      optional: true,
    }
  ],

  // Travel Manager tour steps
  travel_manager_dashboard: [
    {
      target: '[data-tour="dashboard-overview"]',
      title: 'Your Dashboard',
      content: 'This is your travel management command center. Monitor requests, track spending, and view analytics.',
      stepId: 'view_dashboard',
      placement: 'bottom',
    },
    {
      target: '[data-tour="pending-requests"]',
      title: 'Pending Requests',
      content: 'Review and approve travel requests from your team members.',
      stepId: 'view_dashboard',
      placement: 'right',
    },
    {
      target: '[data-tour="analytics-widget"]',
      title: 'Quick Analytics',
      content: 'Get instant insights into travel spending and patterns.',
      stepId: 'view_dashboard',
      placement: 'left',
    }
  ],

  // Traveler tour steps
  traveler_calendar: [
    {
      target: '[data-tour="calendar-sync"]',
      title: 'Calendar Integration',
      content: 'Connect your calendar to automatically sync travel dates and avoid scheduling conflicts.',
      stepId: 'sync_calendar',
      placement: 'bottom',
    },
    {
      target: '[data-tour="calendar-permissions"]',
      title: 'Permission Settings',
      content: 'Choose what calendar information to share and sync with your travel bookings.',
      stepId: 'sync_calendar',
      placement: 'top',
      optional: true,
    }
  ],

  traveler_booking: [
    {
      target: '[data-tour="search-flights"]',
      title: 'Search Flights',
      content: 'Enter your travel details to find the best flights within your company policy.',
      stepId: 'book_demo_trip',
      placement: 'bottom',
    },
    {
      target: '[data-tour="policy-indicator"]',
      title: 'Policy Compliance',
      content: 'Green indicators show options that comply with your company travel policy.',
      stepId: 'book_demo_trip',
      placement: 'right',
    }
  ]
};

interface TourOverlayProps {
  tourKey: string;
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Custom Tooltip Component
const CustomTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  size,
  tooltipProps,
}) => {
  const tourStep = step as TourStep;
  
  return (
    <Card {...tooltipProps} className="max-w-sm shadow-lg border-2 border-primary/20">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{tourStep.title}</h3>
            {tourStep.optional && (
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
          <Button
            {...closeProps}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 -mt-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tourStep.content}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              Step {index + 1} of {size}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === index ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                {...backProps}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tourStep.optional && (
              <Button
                {...skipProps}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Skip
              </Button>
            )}
            
            <Button
              {...primaryProps}
              size="sm"
              className="flex items-center gap-1"
            >
              {index === size - 1 ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TourOverlay: React.FC<TourOverlayProps> = ({
  tourKey,
  isActive,
  onComplete,
  onSkip
}) => {
  const { trackEvent } = useOnboarding();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = TOUR_STEPS[tourKey] || [];

  useEffect(() => {
    if (isActive && steps.length > 0) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        setRun(true);
        trackEvent('tour_started', { tourKey, totalSteps: steps.length });
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setRun(false);
    }
  }, [isActive, tourKey, steps.length, trackEvent]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (type === EVENTS.STEP_AFTER) {
      trackEvent('tour_step_completed', { 
        tourKey, 
        stepIndex: index,
        stepId: steps[index]?.stepId,
        action 
      });
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tour target not found for step ${index}:`, steps[index]?.target);
      // Skip to next step if target not found
      setStepIndex(index + 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      
      if (status === STATUS.FINISHED) {
        trackEvent('tour_completed', { tourKey, totalSteps: steps.length });
        onComplete();
      } else {
        trackEvent('tour_skipped', { tourKey, stepIndex: index });
        onSkip();
      }
    }

    if (type === EVENTS.STEP_BEFORE) {
      setStepIndex(index);
    }
  };

  if (!steps.length) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous={true}
      showProgress={false}
      showSkipButton={true}
      disableOverlayClose={false}
      disableScrolling={false}
      hideCloseButton={false}
      spotlightClicks={true}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--background))',
          textColor: 'hsl(var(--foreground))',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: '8px',
        },
        overlay: {
          mixBlendMode: 'normal',
        }
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
};

export default TourOverlay;
