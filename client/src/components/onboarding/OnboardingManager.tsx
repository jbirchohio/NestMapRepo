import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding, UserRole } from '@/contexts/OnboardingContext';
import { RoleSelectionModal } from './RoleSelectionModal';
import { OnboardingWizard } from './OnboardingWizard';
import { HelpChat } from './HelpChat';
import { FeedbackSurvey } from './FeedbackSurvey';
import { ChecklistBar } from './ChecklistBar';

interface OnboardingManagerProps {
  showChecklist?: boolean;
  compactChecklist?: boolean;
}

export const OnboardingManager: React.FC<OnboardingManagerProps> = ({
  showChecklist = true,
  compactChecklist = false
}) => {
  const { user } = useAuth();
  const { flow, initializeOnboarding, trackEvent } = useOnboarding();
  
  // Modal states
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Check if user needs onboarding
  useEffect(() => {
    if (user && !flow) {
      // Skip onboarding for super_admin users
      if (user.role === 'super_admin') {
        return;
      }
      
      // Check if user has completed onboarding before
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
      
      if (!hasCompletedOnboarding) {
        // Show role selection modal for new users
        setShowRoleSelection(true);
        trackEvent('onboarding_triggered', { userId: user.id });
      }
    }
  }, [user, flow, trackEvent]);

  // Handle role selection
  const handleRoleSelected = (role: UserRole) => {
    initializeOnboarding(role);
    setShowRoleSelection(false);
    setShowWizard(true);
    trackEvent('onboarding_started', { role, userId: user?.id });
  };

  // Handle wizard completion
  const handleWizardComplete = () => {
    setShowWizard(false);
    setShowFeedback(true);
    trackEvent('onboarding_wizard_finished', { 
      role: flow?.role, 
      completedSteps: flow?.completedSteps,
      totalSteps: flow?.totalSteps 
    });
  };

  // Handle feedback submission
  const handleFeedbackSubmit = (feedbackData: any) => {
    setShowFeedback(false);
    
    // Mark onboarding as completed
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    
    trackEvent('onboarding_fully_completed', { 
      role: flow?.role,
      feedback: feedbackData,
      userId: user?.id 
    });

    // Show success message or redirect
    console.log('Onboarding completed successfully!', feedbackData);
  };

  // Handle help chat toggle
  const toggleHelpChat = () => {
    setShowHelpChat(!showHelpChat);
    if (!showHelpChat) {
      trackEvent('help_chat_opened_from_floating_button');
    }
  };

  // Handle wizard restart
  const restartOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_completed_${user.id}`);
    }
    setShowRoleSelection(true);
    trackEvent('onboarding_restarted', { userId: user?.id });
  };

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't render onboarding for super_admin users
  if (user.role === 'super_admin') {
    return null;
  }

  return (
    <>
      {/* Checklist Bar - shown when user has an active onboarding flow */}
      {showChecklist && flow && !flow.isComplete && (
        <div className="mb-6">
          <ChecklistBar 
            compact={compactChecklist}
            onStepClick={() => {
              // Allow users to jump to specific steps in the wizard
              setShowWizard(true);
            }}
          />
        </div>
      )}

      {/* Floating Help Button - shown during onboarding */}
      {(flow && !flow.isComplete) && (
        <Button
          onClick={toggleHelpChat}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-105 transition-transform"
          size="lg"
        >
          {showHelpChat ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      )}

      {/* Debug/Admin Controls - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-6 space-y-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={restartOnboarding}
            className="bg-background/80 backdrop-blur-sm"
          >
            Restart Onboarding
          </Button>
          {flow && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWizard(true)}
              className="bg-background/80 backdrop-blur-sm"
            >
              Open Wizard
            </Button>
          )}
        </div>
      )}

      {/* Role Selection Modal */}
      <RoleSelectionModal
        open={showRoleSelection}
        onClose={() => setShowRoleSelection(false)}
        onRoleSelected={handleRoleSelected}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />

      {/* Help Chat */}
      <HelpChat
        open={showHelpChat}
        onClose={() => setShowHelpChat(false)}
      />

      {/* Feedback Survey */}
      <FeedbackSurvey
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
};

export default OnboardingManager;
