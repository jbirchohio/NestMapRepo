import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CreditCard, Building2, AlertCircle, CheckCircle, ExternalLink, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface FundingStatus {
  hasStripeAccount: boolean;
  stripeConnectOnboarded: boolean;
  issuingEnabled: boolean;
  paymentsEnabled: boolean;
  transfersEnabled: boolean;
  fundingSourceType: string | null;
  fundingSourceStatus: string;
  ready: boolean;
  // Enhanced verification tracking
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  requirementsPastDue: string[];
  requirementsDisabledReason: string | null;
  requirementsCurrentDeadline: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  errors: VerificationError[];
}

interface VerificationError {
  requirement: string;
  code: string;
  reason: string;
}

interface AccountStatus {
  ready: boolean;
  status?: string;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    disabled_reason: string | null;
    current_deadline: number | null;
    errors: VerificationError[];
  };
  account?: any;
  reason?: string;
}

export default function OrganizationFunding() {
  const [activeTab, setActiveTab] = useState('status');
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    businessType: 'company',
    email: '',
    country: 'US',
    currency: 'usd'
  });
  const [fundingSource, setFundingSource] = useState({
    type: 'bank_account' as 'bank_account' | 'credit_line' | 'stripe_balance',
    bankAccount: {
      accountNumber: '',
      routingNumber: '',
      accountHolderName: '',
      accountType: 'checking' as 'checking' | 'savings'
    },
    creditLine: {
      requestedAmount: 0,
      currency: 'usd'
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch funding status
  const { data: fundingStatus, isLoading: statusLoading } = useQuery<FundingStatus>({
    queryKey: ['/api/organization-funding/status'],
    refetchInterval: 5000 // Check status every 5 seconds
  });

  // Fetch account status
  const { data: accountStatus, isLoading: accountLoading } = useQuery<AccountStatus>({
    queryKey: ['/api/organization-funding/account-status'],
    enabled: fundingStatus?.hasStripeAccount,
    refetchInterval: 10000
  });

  // Create Stripe Connect account
  const createAccountMutation = useMutation({
    mutationFn: (data: typeof businessInfo) => 
      apiRequest('POST', '/api/organization-funding/create-account', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stripe Connect account created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organization-funding/status'] });
      setActiveTab('onboarding');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    }
  });

  // Generate onboarding link
  const onboardingMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', '/api/organization-funding/onboarding-link', {
        returnUrl: `${window.location.origin}/organization-funding?tab=status`,
        refreshUrl: `${window.location.origin}/organization-funding?tab=onboarding`
      }),
    onSuccess: (data: any) => {
      window.open(data.onboardingUrl, '_blank');
      toast({
        title: "Onboarding Started",
        description: "Complete Stripe onboarding in the new window"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate onboarding link",
        variant: "destructive"
      });
    }
  });

  // Setup funding source
  const setupFundingMutation = useMutation({
    mutationFn: (data: typeof fundingSource) => 
      apiRequest('POST', '/api/organization-funding/setup-funding', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funding source configured successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organization-funding/status'] });
      setActiveTab('status');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to setup funding source",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
          <span className="text-slate-600 dark:text-slate-300">Loading funding status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Organization Funding
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Configure your organization's funding sources for corporate card issuing
            </p>
          </div>

          {/* Status Overview */}
          <Card className="border-violet-200 dark:border-violet-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-600" />
                Funding Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium">Stripe Account</span>
                  {fundingStatus?.hasStripeAccount ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
                  ) : (
                    <Badge variant="outline">Not Connected</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium">Card Issuing</span>
                  {getStatusBadge(fundingStatus?.issuingEnabled ? 'active' : 'inactive')}
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium">Funding Source</span>
                  {getStatusBadge(fundingStatus?.fundingSourceStatus)}
                </div>
              </div>

              {fundingStatus?.ready ? (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Your organization is ready to issue corporate cards!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    Complete the setup steps below to enable corporate card issuing.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Setup Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="account">Account Setup</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="funding">Funding Source</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                  <CardDescription>
                    Review your organization's funding configuration status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accountLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking account status...</span>
                    </div>
                  ) : accountStatus ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Account Ready</span>
                        {accountStatus.ready ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Ready</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                      {accountStatus.status && (
                        <div className="flex items-center justify-between">
                          <span>Issuing Capability</span>
                          {getStatusBadge(accountStatus.status)}
                        </div>
                      )}
                      {/* Enhanced verification requirements display */}
                      {fundingStatus && (
                        <div className="space-y-3">
                          {/* Currently due requirements */}
                          {fundingStatus.requirementsCurrentlyDue?.length > 0 && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800 dark:text-red-200">
                                <div className="font-semibold mb-2">Action Required:</div>
                                <ul className="list-disc pl-4 space-y-1">
                                  {fundingStatus.requirementsCurrentlyDue.map((req, index) => (
                                    <li key={index} className="text-sm">{req}</li>
                                  ))}
                                </ul>
                                {fundingStatus.requirementsCurrentDeadline && (
                                  <div className="mt-2 text-sm">
                                    Deadline: {new Date(fundingStatus.requirementsCurrentDeadline).toLocaleDateString()}
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Past due requirements */}
                          {fundingStatus.requirementsPastDue?.length > 0 && (
                            <Alert className="border-red-600 bg-red-100 dark:bg-red-900/30">
                              <AlertCircle className="h-4 w-4 text-red-700" />
                              <AlertDescription className="text-red-900 dark:text-red-100">
                                <div className="font-semibold mb-2">Past Due - Immediate Action Required:</div>
                                <ul className="list-disc pl-4 space-y-1">
                                  {fundingStatus.requirementsPastDue.map((req, index) => (
                                    <li key={index} className="text-sm">{req}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Eventually due requirements */}
                          {fundingStatus.requirementsEventuallyDue?.length > 0 && (
                            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                                <div className="font-semibold mb-2">Eventually Required:</div>
                                <ul className="list-disc pl-4 space-y-1">
                                  {fundingStatus.requirementsEventuallyDue.map((req, index) => (
                                    <li key={index} className="text-sm">{req}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Verification errors */}
                          {fundingStatus.errors?.length > 0 && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800 dark:text-red-200">
                                <div className="font-semibold mb-2">Verification Errors:</div>
                                <div className="space-y-2">
                                  {fundingStatus.errors.map((error, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border">
                                      <div className="font-medium text-sm">{error.requirement}</div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {error.code}: {error.reason}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Capability status */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <span className="text-sm font-medium">Payments</span>
                              {fundingStatus.paymentsEnabled ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Enabled</Badge>
                              ) : (
                                <Badge variant="outline">Disabled</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <span className="text-sm font-medium">Payouts</span>
                              {fundingStatus.chargesEnabled ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Enabled</Badge>
                              ) : (
                                <Badge variant="outline">Disabled</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <span className="text-sm font-medium">Transfers</span>
                              {fundingStatus.transfersEnabled ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Enabled</Badge>
                              ) : (
                                <Badge variant="outline">Disabled</Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Account disabled reason */}
                          {fundingStatus.requirementsDisabledReason && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800 dark:text-red-200">
                                <div className="font-semibold mb-1">Account Disabled:</div>
                                <div className="text-sm">{fundingStatus.requirementsDisabledReason}</div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  ) : fundingStatus?.hasStripeAccount ? (
                    <p className="text-slate-600">Unable to fetch account status</p>
                  ) : (
                    <p className="text-slate-600">No Stripe account connected</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Stripe Connect Account</CardTitle>
                  <CardDescription>
                    Set up a Stripe Connect account for your organization to enable corporate card issuing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fundingStatus?.hasStripeAccount ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Stripe Connect account already created for your organization.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            value={businessInfo.businessName}
                            onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="Your Organization Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Business Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={businessInfo.email}
                            onChange={(e) => setBusinessInfo(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="admin@yourcompany.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Select 
                            value={businessInfo.country} 
                            onValueChange={(value) => setBusinessInfo(prev => ({ ...prev, country: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select 
                            value={businessInfo.currency} 
                            onValueChange={(value) => setBusinessInfo(prev => ({ ...prev, currency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="usd">USD</SelectItem>
                              <SelectItem value="cad">CAD</SelectItem>
                              <SelectItem value="gbp">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button 
                        onClick={() => createAccountMutation.mutate(businessInfo)}
                        disabled={createAccountMutation.isPending || !businessInfo.businessName || !businessInfo.email}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        {createAccountMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Stripe Connect Account
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Stripe Onboarding</CardTitle>
                  <CardDescription>
                    Complete the Stripe onboarding process to enable card issuing capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!fundingStatus?.hasStripeAccount ? (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription>
                        You must create a Stripe Connect account first.
                      </AlertDescription>
                    </Alert>
                  ) : accountStatus?.ready ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Stripe onboarding completed successfully!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600">
                        Complete the Stripe onboarding process to verify your business information and enable card issuing.
                      </p>
                      <Button 
                        onClick={() => onboardingMutation.mutate()}
                        disabled={onboardingMutation.isPending}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        {onboardingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Link...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Start Stripe Onboarding
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="funding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configure Funding Source</CardTitle>
                  <CardDescription>
                    Set up how your organization will fund corporate card spending
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!fundingStatus?.issuingEnabled ? (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription>
                        Complete Stripe onboarding before configuring funding sources.
                      </AlertDescription>
                    </Alert>
                  ) : fundingStatus?.fundingSourceStatus === 'active' ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Funding source ({fundingStatus.fundingSourceType}) is active and ready.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Funding Source Type</Label>
                        <Select 
                          value={fundingSource.type} 
                          onValueChange={(value: any) => setFundingSource(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_account">Bank Account</SelectItem>
                            <SelectItem value="credit_line">Credit Line</SelectItem>
                            <SelectItem value="stripe_balance">Stripe Balance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {fundingSource.type === 'bank_account' && (
                        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <h4 className="font-medium">Bank Account Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="accountHolderName">Account Holder Name</Label>
                              <Input
                                id="accountHolderName"
                                value={fundingSource.bankAccount.accountHolderName}
                                onChange={(e) => setFundingSource(prev => ({
                                  ...prev,
                                  bankAccount: { ...prev.bankAccount, accountHolderName: e.target.value }
                                }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountType">Account Type</Label>
                              <Select 
                                value={fundingSource.bankAccount.accountType}
                                onValueChange={(value: any) => setFundingSource(prev => ({
                                  ...prev,
                                  bankAccount: { ...prev.bankAccount, accountType: value }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checking">Checking</SelectItem>
                                  <SelectItem value="savings">Savings</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="routingNumber">Routing Number</Label>
                              <Input
                                id="routingNumber"
                                value={fundingSource.bankAccount.routingNumber}
                                onChange={(e) => setFundingSource(prev => ({
                                  ...prev,
                                  bankAccount: { ...prev.bankAccount, routingNumber: e.target.value }
                                }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="accountNumber">Account Number</Label>
                              <Input
                                id="accountNumber"
                                value={fundingSource.bankAccount.accountNumber}
                                onChange={(e) => setFundingSource(prev => ({
                                  ...prev,
                                  bankAccount: { ...prev.bankAccount, accountNumber: e.target.value }
                                }))}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {fundingSource.type === 'credit_line' && (
                        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <h4 className="font-medium">Credit Line Request</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="requestedAmount">Requested Amount</Label>
                              <Input
                                id="requestedAmount"
                                type="number"
                                value={fundingSource.creditLine.requestedAmount}
                                onChange={(e) => setFundingSource(prev => ({
                                  ...prev,
                                  creditLine: { ...prev.creditLine, requestedAmount: Number(e.target.value) }
                                }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="currency">Currency</Label>
                              <Select 
                                value={fundingSource.creditLine.currency}
                                onValueChange={(value) => setFundingSource(prev => ({
                                  ...prev,
                                  creditLine: { ...prev.creditLine, currency: value }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="usd">USD</SelectItem>
                                  <SelectItem value="cad">CAD</SelectItem>
                                  <SelectItem value="gbp">GBP</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={() => setupFundingMutation.mutate(fundingSource)}
                        disabled={setupFundingMutation.isPending}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        {setupFundingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Configure Funding Source
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}