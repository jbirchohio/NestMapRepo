import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  CheckCircle2,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Zap,
  Eye,
  Download
} from 'lucide-react';
import { OnboardingStep } from '@/contexts/OnboardingContext';
import { TourOverlay } from '../TourOverlay';

interface TravelManagerStepsProps {
  step: OnboardingStep;
  onComplete: (stepId: string) => void;
  onSkip: (stepId: string) => void;
}

export const TravelManagerSteps: React.FC<TravelManagerStepsProps> = ({ 
  step, 
  onComplete, 
  onSkip 
}) => {
  const [tourActive, setTourActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

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

  const mockRequests = [
    {
      id: '1',
      traveler: 'John Smith',
      destination: 'New York, NY',
      dates: 'Mar 15-18, 2024',
      cost: '$1,250',
      status: 'pending',
      policy: 'compliant'
    },
    {
      id: '2',
      traveler: 'Sarah Johnson',
      destination: 'London, UK',
      dates: 'Mar 22-26, 2024',
      cost: '$2,800',
      status: 'pending',
      policy: 'review'
    }
  ];

  const renderStepContent = () => {
    switch (step.id) {
      case 'view_dashboard':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Explore Your Dashboard</h2>
              <p className="text-muted-foreground">
                Get familiar with your travel management command center
              </p>
            </div>

            <Card data-tour="dashboard-overview">
              <CardHeader>
                <CardTitle>Dashboard Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">$45,230</div>
                    <div className="text-sm text-muted-foreground">Monthly Spend</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">68%</div>
                    <div className="text-sm text-muted-foreground">Budget Used</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">Pending Requests</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">94%</div>
                    <div className="text-sm text-muted-foreground">Policy Compliance</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-tour="pending-requests">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending Requests
                  <Badge variant="secondary">2</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">{request.traveler}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {request.destination}
                            <Calendar className="h-3 w-3 ml-2" />
                            {request.dates}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">{request.cost}</div>
                          <Badge 
                            variant={request.policy === 'compliant' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {request.policy === 'compliant' ? 'Policy Compliant' : 'Needs Review'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm">Approve</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={startTour}>
                <Zap className="h-4 w-4 mr-2" />
                Take Dashboard Tour
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Exploring...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Dashboard Explored
                  </>
                )}
              </Button>
            </div>

            <TourOverlay
              tourKey="travel_manager_dashboard"
              isActive={tourActive}
              onComplete={() => setTourActive(false)}
              onSkip={() => setTourActive(false)}
            />
          </div>
        );

      case 'approve_trip':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Approve a Trip Request</h2>
              <p className="text-muted-foreground">
                Learn how to review and approve travel requests
              </p>
            </div>

            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sample Trip Request</CardTitle>
                  <Badge variant="secondary">Demo Request</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Traveler</Label>
                      <p className="font-medium">John Smith</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Destination</Label>
                      <p className="font-medium">New York, NY</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Travel Dates</Label>
                      <p className="font-medium">March 15-18, 2024</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Cost</Label>
                      <p className="font-medium text-lg">$1,250</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Policy Compliance</Label>
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Compliant
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Urgency</Label>
                      <Badge variant="destructive">High Priority</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Submitted 2 hours ago
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Request Changes
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedRequest('demo');
                        setTimeout(() => handleComplete(), 1000);
                      }}
                      disabled={selectedRequest === 'demo'}
                    >
                      {selectedRequest === 'demo' ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => onSkip(step.id)}>
                Skip Demo
              </Button>
              <div className="text-sm text-muted-foreground">
                Click "Approve Request" above to complete this step
              </div>
            </div>
          </div>
        );

      case 'launch_report':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Generate Your First Report</h2>
              <p className="text-muted-foreground">
                Create travel analytics reports to track spending
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Report Builder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Report Type</Label>
                    <Select defaultValue="spending">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spending">Monthly Spending Report</SelectItem>
                        <SelectItem value="compliance">Policy Compliance Report</SelectItem>
                        <SelectItem value="trends">Travel Trends Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time Period</Label>
                    <Select defaultValue="current-month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-month">Current Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleComplete}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'view_analytics':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Explore Analytics</h2>
              <p className="text-muted-foreground">
                Discover insights to optimize travel spending
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Spending Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium">$45,230</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                    <div className="text-sm text-muted-foreground">68% of monthly budget used</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Policy Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">94%</div>
                    <div className="text-sm text-muted-foreground">Trips are policy compliant</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-center pt-4">
              <Button onClick={handleComplete} size="lg" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Analytics Explored
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
