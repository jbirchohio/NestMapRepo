import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plane, 
  CheckCircle2,
  Calendar,
  Mic,
  MessageSquare,

  AlertCircle,
  Zap,
  Star,
  Shield,

  Building
} from 'lucide-react';
import { OnboardingStep } from '@/contexts/OnboardingContext';
import { TourOverlay } from '../TourOverlay';

interface TravelerStepsProps {
  step: OnboardingStep;
  onComplete: (stepId: string) => void;
  onSkip: (stepId: string) => void;
}

export const TravelerSteps: React.FC<TravelerStepsProps> = ({ 
  step, 
  onComplete, 
  onSkip 
}) => {
  const [tourActive, setTourActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [voiceActive, setVoiceActive] = useState(false);

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onComplete(step.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const startTour = () => {
    setTourActive(true);
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'sync_calendar':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Sync Your Calendar</h2>
              <p className="text-muted-foreground">
                Connect your calendar to avoid scheduling conflicts and sync travel dates
              </p>
            </div>

            {/* Calendar Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setFormData(prev => ({ ...prev, calendarType: 'google' }))}
                data-tour="calendar-sync"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-red-600 font-bold text-lg">G</span>
                  </div>
                  <h3 className="font-semibold mb-2">Google Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync with your Google Calendar account
                  </p>
                  {formData.calendarType === 'google' && (
                    <Badge variant="default" className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setFormData(prev => ({ ...prev, calendarType: 'outlook' }))}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">O</span>
                  </div>
                  <h3 className="font-semibold mb-2">Outlook Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync with Microsoft Outlook
                  </p>
                  {formData.calendarType === 'outlook' && (
                    <Badge variant="default" className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setFormData(prev => ({ ...prev, calendarType: 'other' }))}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-gray-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Other Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Apple iCloud, CalDAV, or other
                  </p>
                  {formData.calendarType === 'other' && (
                    <Badge variant="default" className="mt-2">Selected</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Privacy Settings */}
            <Card data-tour="calendar-permissions" className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Shield className="h-5 w-5" />
                  Privacy & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>We only read event dates and times to check for conflicts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Event titles, descriptions, and attendees are never accessed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>You can revoke access at any time in your settings</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={startTour}>
                <Zap className="h-4 w-4 mr-2" />
                Take Tour
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onSkip(step.id)}>
                  Skip for Now
                </Button>
                <Button 
                  onClick={handleComplete} 
                  disabled={isProcessing || !formData.calendarType}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Connect Calendar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <TourOverlay
              tourKey="traveler_calendar"
              isActive={tourActive}
              onComplete={() => setTourActive(false)}
              onSkip={() => setTourActive(false)}
            />
          </div>
        );

      case 'book_demo_trip':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Plane className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Book Your First Trip</h2>
              <p className="text-muted-foreground">
                Try booking a demo trip to see how easy travel planning can be
              </p>
            </div>

            {/* Trip Search Form */}
            <Card data-tour="search-flights">
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from">From</Label>
                    <Select defaultValue="lax">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lax">Los Angeles (LAX)</SelectItem>
                        <SelectItem value="jfk">New York (JFK)</SelectItem>
                        <SelectItem value="sfo">San Francisco (SFO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="to">To</Label>
                    <Select defaultValue="jfk">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jfk">New York (JFK)</SelectItem>
                        <SelectItem value="lax">Los Angeles (LAX)</SelectItem>
                        <SelectItem value="ord">Chicago (ORD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="departure">Departure Date</Label>
                    <Input type="date" defaultValue="2024-03-15" />
                  </div>
                  <div>
                    <Label htmlFor="return">Return Date</Label>
                    <Input type="date" defaultValue="2024-03-18" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="purpose">Trip Purpose</Label>
                  <Select defaultValue="business">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business Meeting</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Flight Options */}
            <Card>
              <CardHeader>
                <CardTitle>Available Flights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">American Airlines 1234</h4>
                          <p className="text-sm text-muted-foreground">LAX 8:00 AM → JFK 4:30 PM</p>
                        </div>
                        <Badge variant="default" className="bg-green-500" data-tour="policy-indicator">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Policy Compliant
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">$450</div>
                      <div className="text-sm text-muted-foreground">Economy</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">Delta 5678</h4>
                          <p className="text-sm text-muted-foreground">LAX 10:15 AM → JFK 6:45 PM</p>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Policy Compliant
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">$485</div>
                      <div className="text-sm text-muted-foreground">Economy</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                    <div>
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">United 9012</h4>
                          <p className="text-sm text-muted-foreground">LAX 2:30 PM → JFK 10:55 PM</p>
                        </div>
                        <Badge variant="outline">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Exceeds Policy
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">$750</div>
                      <div className="text-sm text-muted-foreground">Premium Economy</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hotel Options */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Hotels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Building className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">Marriott Manhattan</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1,2,3,4].map(i => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">4.2 rating</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">$180/night</div>
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Policy Compliant
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Building className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">Hilton Midtown</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1,2,3,4].map(i => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">4.0 rating</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">$165/night</div>
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Policy Compliant
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={startTour}>
                <Zap className="h-4 w-4 mr-2" />
                Take Booking Tour
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Demo Booking
                  </>
                )}
              </Button>
            </div>

            <TourOverlay
              tourKey="traveler_booking"
              isActive={tourActive}
              onComplete={() => setTourActive(false)}
              onSkip={() => setTourActive(false)}
            />
          </div>
        );

      case 'voice_assistant':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Mic className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Try Voice Assistant</h2>
              <p className="text-muted-foreground">
                Use voice commands to check your itinerary and get travel information
              </p>
            </div>

            {/* Voice Interface */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle>Voice Assistant Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-8">
                  <Button
                    size="lg"
                    variant={voiceActive ? "destructive" : "default"}
                    className={`w-24 h-24 rounded-full ${voiceActive ? 'animate-pulse' : ''}`}
                    onClick={() => {
                      setVoiceActive(!voiceActive);
                      if (!voiceActive) {
                        setTimeout(() => {
                          setVoiceActive(false);
                          handleComplete();
                        }, 3000);
                      }
                    }}
                  >
                    <Mic className="h-8 w-8" />
                  </Button>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {voiceActive ? 'Listening... Try saying "Check my itinerary"' : 'Click to start voice command'}
                  </p>
                </div>

                {/* Sample Commands */}
                <div className="space-y-2">
                  <h4 className="font-medium">Try these voice commands:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      "Check my itinerary",
                      "What's my next flight?",
                      "Show me hotel details",
                      "Any travel alerts?",
                      "Book a taxi to airport",
                      "What's the weather in New York?"
                    ].map((command, index) => (
                      <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                        "{command}"
                      </div>
                    ))}
                  </div>
                </div>

                {voiceActive && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-900">Processing voice command...</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      "Your trip to New York is confirmed for March 15-18. Flight AA1234 departs LAX at 8:00 AM. 
                      You're staying at Marriott Manhattan for 3 nights. Would you like me to set reminders?"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => onSkip(step.id)}>
                Skip Voice Demo
              </Button>
              <div className="text-sm text-muted-foreground">
                {voiceActive ? 'Voice assistant is listening...' : 'Click the microphone to try voice commands'}
              </div>
            </div>
          </div>
        );

      case 'feedback_survey':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Share Your Feedback</h2>
              <p className="text-muted-foreground">
                Help us improve your travel experience with quick feedback
              </p>
            </div>

            {/* Quick Feedback Form */}
            <Card>
              <CardHeader>
                <CardTitle>How was your setup experience?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating */}
                <div className="space-y-2">
                  <Label>Rate your onboarding experience</Label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((rating) => (
                      <Button
                        key={rating}
                        variant="outline"
                        size="sm"
                        className={`w-12 h-12 ${formData.rating === rating ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, rating }))}
                      >
                        <Star 
                          className="h-4 w-4" 
                          fill={formData.rating >= rating ? 'currentColor' : 'none'}
                        />
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Most Helpful */}
                <div className="space-y-2">
                  <Label>What was most helpful?</Label>
                  <Select 
                    value={formData.helpful}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, helpful: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select what helped most" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wizard">Step-by-step wizard</SelectItem>
                      <SelectItem value="tour">Interactive tours</SelectItem>
                      <SelectItem value="demo">Demo booking</SelectItem>
                      <SelectItem value="voice">Voice assistant</SelectItem>
                      <SelectItem value="help">Help chat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments">Additional comments (optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Any suggestions or feedback..."
                    value={formData.comments || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  />
                </div>

                {/* Ready to Travel */}
                <div className="space-y-2">
                  <Label>Are you ready to start using NestMap for travel?</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={formData.ready === 'yes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, ready: 'yes' }))}
                    >
                      Yes, I'm ready!
                    </Button>
                    <Button
                      variant={formData.ready === 'maybe' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, ready: 'maybe' }))}
                    >
                      Maybe, need more time
                    </Button>
                    <Button
                      variant={formData.ready === 'no' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, ready: 'no' }))}
                    >
                      No, need help
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => onSkip(step.id)}>
                Skip Feedback
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={isProcessing || !formData.rating}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Step Not Found</h3>
            <p className="text-muted-foreground">
              This onboarding step is not implemented yet.
            </p>
          </div>
        );
    }
  };

  return <div className="max-w-4xl mx-auto">{renderStepContent()}</div>;
};
