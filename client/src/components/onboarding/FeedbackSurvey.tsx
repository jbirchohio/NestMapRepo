import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Star, 
  Send, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/auth/AuthContext';

interface FeedbackData {
  setupEase: number; // 1-5 rating
  missingFeatures: string;
  readyForPilot: 'yes' | 'no' | 'maybe';
  additionalComments: string;
  wouldRecommend: boolean;
  mostHelpfulFeature: string;
  improvementSuggestions: string;
}

interface FeedbackSurveyProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
}

const RATING_LABELS = {
  1: 'Very Difficult',
  2: 'Difficult', 
  3: 'Neutral',
  4: 'Easy',
  5: 'Very Easy'
};

const HELPFUL_FEATURES = [
  'Role-based setup wizard',
  'System integration guides',
  'Interactive tutorials',
  'Help chat assistant',
  'Progress checklist',
  'Quick setup templates'
];

export const FeedbackSurvey: React.FC<FeedbackSurveyProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const { flow, trackEvent } = useOnboarding();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [feedback, setFeedback] = useState<FeedbackData>({
    setupEase: 0,
    missingFeatures: '',
    readyForPilot: 'maybe',
    additionalComments: '',
    wouldRecommend: false,
    mostHelpfulFeature: '',
    improvementSuggestions: ''
  });

  const totalSteps = 3;

  const handleRatingClick = (rating: number) => {
    setFeedback(prev => ({ ...prev, setupEase: rating }));
    trackEvent('feedback_rating_selected', { rating, role: flow?.role });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      trackEvent('feedback_step_advanced', { step: currentStep + 1 });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Track feedback submission
      trackEvent('feedback_survey_submitted', {
        ...feedback,
        role: flow?.role,
        userId: user?.id,
        organizationId: user?.organizationId,
        completedSteps: flow?.completedSteps,
        totalSteps: flow?.totalSteps
      });

      // Submit to backend
      const response = await fetch('/api/onboarding-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...feedback,
          userId: user?.id,
          organizationId: user?.organizationId,
          role: flow?.role,
          onboardingFlow: {
            completedSteps: flow?.completedSteps,
            totalSteps: flow?.totalSteps,
            isComplete: flow?.isComplete
          },
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      onSubmit(feedback);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Still call onSubmit to close the modal
      onSubmit(feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return feedback.setupEase > 0;
      case 1:
        return feedback.readyForPilot !== 'maybe' || feedback.missingFeatures.trim().length > 0;
      case 2:
        return true; // Final step, always can submit
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">How was your setup experience?</h3>
              <p className="text-muted-foreground">
                Rate how easy it was to get started with NestMap
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingClick(rating)}
                  className={`p-2 transition-colors rounded-lg ${
                    feedback.setupEase >= rating
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  <Star
                    className="h-8 w-8"
                    fill={feedback.setupEase >= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>

            {feedback.setupEase > 0 && (
              <div className="text-center">
                <p className="text-sm font-medium">
                  {RATING_LABELS[feedback.setupEase as keyof typeof RATING_LABELS]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {feedback.setupEase >= 4 
                    ? "Great! We're glad the setup was smooth."
                    : "Thanks for the feedback. We'll work on making this easier."
                  }
                </p>
              </div>
            )}

            {/* Most Helpful Feature */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What was most helpful during setup? (Optional)
              </Label>
              <RadioGroup
                value={feedback.mostHelpfulFeature}
                onValueChange={(value) => 
                  setFeedback(prev => ({ ...prev, mostHelpfulFeature: value }))
                }
              >
                {HELPFUL_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <RadioGroupItem value={feature} id={feature} />
                    <Label htmlFor={feature} className="text-sm">
                      {feature}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Ready for your pilot?</h3>
              <p className="text-muted-foreground">
                Let us know if you're ready to start using NestMap
              </p>
            </div>

            {/* Ready for Pilot */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Are you ready to begin your NestMap pilot?
              </Label>
              <RadioGroup
                value={feedback.readyForPilot}
                onValueChange={(value: 'yes' | 'no' | 'maybe') =>
                  setFeedback(prev => ({ ...prev, readyForPilot: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    Yes, I'm ready to start!
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    No, I need more setup time
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maybe" id="maybe" />
                  <Label htmlFor="maybe" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Maybe, I have some concerns
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Missing Features */}
            <div className="space-y-2">
              <Label htmlFor="missing-features" className="text-sm font-medium">
                Any missing features or concerns?
              </Label>
              <Textarea
                id="missing-features"
                placeholder="Tell us what would make you more confident about starting the pilot..."
                value={feedback.missingFeatures}
                onChange={(e) =>
                  setFeedback(prev => ({ ...prev, missingFeatures: e.target.value }))
                }
                className="min-h-[100px]"
              />
            </div>

            {/* Would Recommend */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recommend"
                checked={feedback.wouldRecommend}
                onCheckedChange={(checked) =>
                  setFeedback(prev => ({ ...prev, wouldRecommend: checked as boolean }))
                }
              />
              <Label htmlFor="recommend" className="text-sm">
                I would recommend NestMap to other organizations
              </Label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Final thoughts</h3>
              <p className="text-muted-foreground">
                Help us improve the onboarding experience
              </p>
            </div>

            {/* Improvement Suggestions */}
            <div className="space-y-2">
              <Label htmlFor="improvements" className="text-sm font-medium">
                How can we improve the setup process?
              </Label>
              <Textarea
                id="improvements"
                placeholder="Share any suggestions for making onboarding even better..."
                value={feedback.improvementSuggestions}
                onChange={(e) =>
                  setFeedback(prev => ({ ...prev, improvementSuggestions: e.target.value }))
                }
                className="min-h-[80px]"
              />
            </div>

            {/* Additional Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-medium">
                Additional comments (Optional)
              </Label>
              <Textarea
                id="comments"
                placeholder="Anything else you'd like to share..."
                value={feedback.additionalComments}
                onChange={(e) =>
                  setFeedback(prev => ({ ...prev, additionalComments: e.target.value }))
                }
                className="min-h-[80px]"
              />
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Your feedback summary:</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Setup experience: {RATING_LABELS[feedback.setupEase as keyof typeof RATING_LABELS]}</p>
                  <p>• Ready for pilot: {feedback.readyForPilot === 'yes' ? 'Yes' : feedback.readyForPilot === 'no' ? 'No' : 'Maybe'}</p>
                  <p>• Would recommend: {feedback.wouldRecommend ? 'Yes' : 'No'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Setup Feedback
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {renderStep()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Skip Survey
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackSurvey;
