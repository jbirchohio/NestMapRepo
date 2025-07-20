import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { 
  Building2, 
  Users, 
  DollarSign, 
  CheckCircle2,
  Mail,
  Upload,
  TestTube,
  AlertCircle,
  Zap,
  Shield,
  FileText,
  Workflow
} from 'lucide-react';
import { OnboardingStep } from '@/contexts/OnboardingContext';
import { TourOverlay } from '../TourOverlay';

interface AdminStepsProps {
  step: OnboardingStep;
  onComplete: (stepId: string) => void;
  onSkip: (stepId: string) => void;
}

export const AdminSteps: React.FC<AdminStepsProps> = ({ step, onComplete, onSkip }) => {
  const [tourActive, setTourActive] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      // Simulate API call
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
      case 'connect_systems':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Connect Your Systems</h2>
              <p className="text-muted-foreground">
                Integrate with your existing HR and Finance platforms for seamless data sync
              </p>
            </div>

            {/* HR Integration */}
            <Card data-tour="hr-integration">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  HR System Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hr-platform">HR Platform</Label>
                    <Select
                      value={formData.hrPlatform}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, hrPlatform: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your HR platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workday">Workday</SelectItem>
                        <SelectItem value="bamboohr">BambooHR</SelectItem>
                        <SelectItem value="adp">ADP</SelectItem>
                        <SelectItem value="sap">SAP SuccessFactors</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hr-url">API Endpoint URL</Label>
                    <Input
                      id="hr-url"
                      placeholder="https://your-company.workday.com/api"
                      value={formData.hrUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, hrUrl: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hr-username">Username/Client ID</Label>
                    <Input
                      id="hr-username"
                      placeholder="API username or client ID"
                      value={formData.hrUsername || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, hrUsername: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hr-password">Password/Secret</Label>
                    <Input
                      id="hr-password"
                      type="password"
                      placeholder="API password or secret"
                      value={formData.hrPassword || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, hrPassword: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    All credentials are encrypted and stored securely
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Finance Integration */}
            <Card data-tour="finance-integration">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Finance System Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="finance-platform">Finance Platform</Label>
                    <Select
                      value={formData.financePlatform}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, financePlatform: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your finance platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sap">SAP</SelectItem>
                        <SelectItem value="oracle">Oracle Financials</SelectItem>
                        <SelectItem value="netsuite">NetSuite</SelectItem>
                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="finance-url">API Endpoint URL</Label>
                    <Input
                      id="finance-url"
                      placeholder="https://your-company.sap.com/api"
                      value={formData.financeUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, financeUrl: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="finance-username">Username/Client ID</Label>
                    <Input
                      id="finance-username"
                      placeholder="API username or client ID"
                      value={formData.financeUsername || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, financeUsername: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="finance-password">Password/Secret</Label>
                    <Input
                      id="finance-password"
                      type="password"
                      placeholder="API password or secret"
                      value={formData.financePassword || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, financePassword: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Connection */}
            <Card data-tour="test-connection">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TestTube className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Test Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Verify your connections are working properly
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={startTour}>
                <Zap className="h-4 w-4 mr-2" />
                Take Tour
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Integration
                  </>
                )}
              </Button>
            </div>

            <TourOverlay
              tourKey="admin_connect_systems"
              isActive={tourActive}
              onComplete={() => setTourActive(false)}
              onSkip={() => setTourActive(false)}
            />
          </div>
        );

      case 'invite_team':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Invite Your Team</h2>
              <p className="text-muted-foreground">
                Add travel managers and employees to start using NestMap
              </p>
            </div>

            {/* Individual Invites */}
            <Card data-tour="invite-button">
              <CardHeader>
                <CardTitle>Individual Invitations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={formData.inviteEmail || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, inviteEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-name">Full Name</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Doe"
                      value={formData.inviteName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, inviteName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={formData.inviteRole}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, inviteRole: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="travel_manager">Travel Manager</SelectItem>
                        <SelectItem value="traveler">Employee/Traveler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Import */}
            <Card data-tour="bulk-invite">
              <CardHeader>
                <CardTitle>Bulk Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Upload CSV File</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a CSV with columns: email, name, role, department
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                    <Button variant="ghost" size="sm">
                      Download Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invited Users Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Invited Users (3)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Travel Manager', status: 'Accepted' },
                    { name: 'Mike Chen', email: 'mike@company.com', role: 'Traveler', status: 'Pending' },
                    { name: 'Lisa Rodriguez', email: 'lisa@company.com', role: 'Traveler', status: 'Pending' }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge variant={user.status === 'Accepted' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={startTour}>
                <Zap className="h-4 w-4 mr-2" />
                Take Tour
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Team Setup
                  </>
                )}
              </Button>
            </div>

            <TourOverlay
              tourKey="admin_invite_team"
              isActive={tourActive}
              onComplete={() => setTourActive(false)}
              onSkip={() => setTourActive(false)}
            />
          </div>
        );

      case 'define_policy':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Define Travel Policy</h2>
              <p className="text-muted-foreground">
                Set up travel policies and spending limits for your organization
              </p>
            </div>

            {/* Flight Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Flight Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Domestic Flight Class</Label>
                    <Select defaultValue="economy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="premium">Premium Economy</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>International Flight Class</Label>
                    <Select defaultValue="premium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="premium">Premium Economy</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Domestic Flight Cost</Label>
                    <Input placeholder="$500" />
                  </div>
                  <div>
                    <Label>Max International Flight Cost</Label>
                    <Input placeholder="$1,500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hotel Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Hotel Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Nightly Rate (Domestic)</Label>
                    <Input placeholder="$200" />
                  </div>
                  <div>
                    <Label>Max Nightly Rate (International)</Label>
                    <Input placeholder="$300" />
                  </div>
                </div>
                <div>
                  <Label>Preferred Hotel Chains</Label>
                  <Textarea placeholder="Marriott, Hilton, Hyatt..." />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => onSkip(step.id)}>
                Use Default Policy
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Saving Policy...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Travel Policy
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'configure_approval':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Workflow className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Configure Approval Workflow</h2>
              <p className="text-muted-foreground">
                Set up approval processes for travel requests
              </p>
            </div>

            {/* Approval Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Trips under $500</h4>
                      <p className="text-sm text-muted-foreground">Auto-approve within policy</p>
                    </div>
                    <Badge variant="default">Auto-Approve</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Trips $500 - $2,000</h4>
                      <p className="text-sm text-muted-foreground">Require manager approval</p>
                    </div>
                    <Badge variant="secondary">Manager</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Trips over $2,000</h4>
                      <p className="text-sm text-muted-foreground">Require finance approval</p>
                    </div>
                    <Badge variant="outline">Finance</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => onSkip(step.id)}>
                Use Default Rules
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Approval Rules
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'complete_setup':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Setup Complete!</h2>
              <p className="text-muted-foreground">
                Your NestMap organization is ready for travel management
              </p>
            </div>

            {/* Setup Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Setup Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>HR and Finance systems connected</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>3 team members invited</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>Travel policy configured</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>Approval workflow set up</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button onClick={handleComplete} size="lg" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Launch NestMap
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
