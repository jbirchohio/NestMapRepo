import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'admin' | 'travel_manager' | 'traveler';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingFlow {
  role: UserRole;
  steps: OnboardingStep[];
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
}

interface OnboardingContextType {
  flow: OnboardingFlow | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  initializeOnboarding: (role: UserRole) => void;
  completeStep: (stepId: string) => void;
  goToStep: (stepIndex: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: (stepId: string) => void;
  resetOnboarding: () => void;
  finishOnboarding: () => void;
  
  // Analytics
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Define onboarding flows for each role
const ONBOARDING_FLOWS: Record<UserRole, Omit<OnboardingFlow, 'currentStepIndex' | 'completedSteps' | 'isComplete'>> = {
  admin: {
    role: 'admin',
    totalSteps: 5,
    steps: [
      {
        id: 'connect_systems',
        title: 'Connect HR/Finance Systems',
        description: 'Integrate with your existing HR and finance platforms',
        completed: false,
        required: true,
      },
      {
        id: 'invite_team',
        title: 'Invite Team Members',
        description: 'Add travel managers and employees to your organization',
        completed: false,
        required: true,
      },
      {
        id: 'define_policy',
        title: 'Define Travel Policy',
        description: 'Set up travel policies and spending limits',
        completed: false,
        required: true,
      },
      {
        id: 'configure_approval',
        title: 'Configure Approval Workflow',
        description: 'Set up approval processes for travel requests',
        completed: false,
        required: true,
      },
      {
        id: 'complete_setup',
        title: 'Complete Setup',
        description: 'Review settings and launch your travel program',
        completed: false,
        required: true,
      },
    ],
  },
  travel_manager: {
    role: 'travel_manager',
    totalSteps: 4,
    steps: [
      {
        id: 'view_dashboard',
        title: 'Explore Dashboard',
        description: 'Get familiar with your travel management dashboard',
        completed: false,
        required: true,
      },
      {
        id: 'approve_trip',
        title: 'Approve a Trip',
        description: 'Learn how to review and approve travel requests',
        completed: false,
        required: true,
      },
      {
        id: 'launch_report',
        title: 'Generate Reports',
        description: 'Create your first travel analytics report',
        completed: false,
        required: true,
      },
      {
        id: 'view_analytics',
        title: 'View Analytics',
        description: 'Explore travel insights and cost optimization',
        completed: false,
        required: true,
      },
    ],
  },
  traveler: {
    role: 'traveler',
    totalSteps: 4,
    steps: [
      {
        id: 'sync_calendar',
        title: 'Sync Calendar',
        description: 'Connect your calendar for seamless trip planning',
        completed: false,
        required: false,
      },
      {
        id: 'book_demo_trip',
        title: 'Book Demo Trip',
        description: 'Try booking your first trip with our platform',
        completed: false,
        required: true,
      },
      {
        id: 'voice_assistant',
        title: 'Try Voice Assistant',
        description: 'Use voice commands to check your itinerary',
        completed: false,
        required: false,
      },
      {
        id: 'feedback_survey',
        title: 'Provide Feedback',
        description: 'Help us improve your travel experience',
        completed: false,
        required: true,
      },
    ],
  },
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [loading, setLoading] = useState(isLoading);
  const [error] = useState<string | null>(null);

  // Update loading state when auth loading changes
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Load onboarding state from localStorage
  useEffect(() => {
    if (user) {
      const savedState = localStorage.getItem(`onboarding_${user.id}`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setFlow(parsedState);
        } catch (err) {
          console.error('Failed to parse saved onboarding state:', err);
        }
      }
    }
  }, [user]);

  // Save onboarding state to localStorage
  const saveState = (newFlow: OnboardingFlow) => {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(newFlow));
    }
  };

  const initializeOnboarding = (role: UserRole) => {
    const baseFlow = ONBOARDING_FLOWS[role];
    const newFlow: OnboardingFlow = {
      ...baseFlow,
      currentStepIndex: 0,
      completedSteps: 0,
      isComplete: false,
    };
    
    setFlow(newFlow);
    saveState(newFlow);
    trackEvent('onboarding_initialized', { role });
  };

  const completeStep = (stepId: string) => {
    if (!flow) return;

    const updatedSteps = flow.steps.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    );

    const completedSteps = updatedSteps.filter(step => step.completed).length;
    const isComplete = completedSteps === flow.totalSteps;

    const updatedFlow: OnboardingFlow = {
      ...flow,
      steps: updatedSteps,
      completedSteps,
      isComplete,
    };

    setFlow(updatedFlow);
    saveState(updatedFlow);
    trackEvent('onboarding_step_completed', { 
      step: stepId, 
      role: flow.role,
      completedSteps,
      totalSteps: flow.totalSteps 
    });

    if (isComplete) {
      trackEvent('onboarding_completed', { role: flow.role });
    }
  };

  const goToStep = (stepIndex: number) => {
    if (!flow || stepIndex < 0 || stepIndex >= flow.totalSteps) return;

    const updatedFlow: OnboardingFlow = {
      ...flow,
      currentStepIndex: stepIndex,
    };

    setFlow(updatedFlow);
    saveState(updatedFlow);
    trackEvent('onboarding_step_navigated', { 
      step: flow.steps[stepIndex].id, 
      role: flow.role,
      stepIndex 
    });
  };

  const nextStep = () => {
    if (!flow) return;
    goToStep(flow.currentStepIndex + 1);
  };

  const previousStep = () => {
    if (!flow) return;
    goToStep(flow.currentStepIndex - 1);
  };

  const skipStep = (stepId: string) => {
    if (!flow) return;

    const stepIndex = flow.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1 && !flow.steps[stepIndex].required) {
      completeStep(stepId);
      trackEvent('onboarding_step_skipped', { step: stepId, role: flow.role });
    }
  };

  const resetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_${user.id}`);
    }
    setFlow(null);
    trackEvent('onboarding_reset');
  };

  const finishOnboarding = () => {
    if (!flow) return;

    // Mark all required steps as completed
    const updatedSteps = flow.steps.map(step => ({
      ...step,
      completed: step.required ? true : step.completed,
    }));

    const updatedFlow: OnboardingFlow = {
      ...flow,
      steps: updatedSteps,
      completedSteps: flow.totalSteps,
      isComplete: true,
    };

    setFlow(updatedFlow);
    saveState(updatedFlow);
    trackEvent('onboarding_force_completed', { role: flow.role });
  };

  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
    // Integration with analytics service
    const eventData = {
      event: eventName,
      userId: user?.id,
      organizationId: user?.organizationId,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    // Send to analytics service (mock implementation)
    console.log('Analytics Event:', eventData);
    
    // In production, integrate with your analytics provider:
    // analytics.track(eventName, eventData);
    // or send to your backend analytics endpoint
    
    // Example backend call:
    // fetch('/api/analytics/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventData),
    // }).catch(console.error);
  };

  const value: OnboardingContextType = {
    flow,
    loading,
    error,
    initializeOnboarding,
    completeStep,
    goToStep,
    nextStep,
    previousStep,
    skipStep,
    resetOnboarding,
    finishOnboarding,
    trackEvent,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
