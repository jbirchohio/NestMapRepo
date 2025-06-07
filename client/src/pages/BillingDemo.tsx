import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, TrendingUp, Users, Building, RefreshCw, Ban, CheckCircle, ArrowUpCircle, ArrowDownCircle, XCircle, AlertTriangle } from 'lucide-react';

function SystemHealthStatus() {
  const { data: healthData } = useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  const { data: stripeStatus } = useQuery({
    queryKey: ['/api/stripe/status'],
    refetchInterval: 60000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'connected': return CheckCircle;
      case 'degraded':
      case 'warning': return AlertTriangle;
      case 'unhealthy':
      case 'error': return XCircle;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'connected': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'degraded':
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'unhealthy':
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'connected': return 'bg-green-600';
      case 'degraded':
      case 'warning': return 'bg-yellow-600';
      case 'unhealthy':
      case 'error': return 'bg-red-600';
      default: return 'bg-green-600';
    }
  };

  const apiStatus = healthData?.status || 'unknown';
  const stripeIntegrationStatus = stripeStatus?.connected ? 'connected' : 'disconnected';
  const databaseStatus = healthData?.endpoints?.total > 0 ? 'connected' : 'disconnected';
  const auditStatus = healthData?.status === 'healthy' ? 'active' : 'inactive';

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>
          Real-time system health and integration status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor(stripeIntegrationStatus)}`}>
            <div className="flex items-center gap-3">
              {React.createElement(getStatusIcon(stripeIntegrationStatus), { className: "w-5 h-5" })}
              <span className="font-medium">Stripe Integration</span>
            </div>
            <Badge variant="default" className={getBadgeColor(stripeIntegrationStatus)}>
              {stripeIntegrationStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor(auditStatus)}`}>
            <div className="flex items-center gap-3">
              {React.createElement(getStatusIcon(auditStatus), { className: "w-5 h-5" })}
              <span className="font-medium">Audit Logging</span>
            </div>
            <Badge variant="default" className={getBadgeColor(auditStatus)}>
              Active
            </Badge>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor('test')}`}>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Payment Processing</span>
            </div>
            <Badge variant="secondary">
              {process.env.NODE_ENV === 'production' ? 'Live' : 'Test Mode'}
            </Badge>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor(databaseStatus)}`}>
            <div className="flex items-center gap-3">
              {React.createElement(getStatusIcon(databaseStatus), { className: "w-5 h-5" })}
              <span className="font-medium">Database Connection</span>
            </div>
            <Badge variant="default" className={getBadgeColor(databaseStatus)}>
              {databaseStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor(apiStatus)}`}>
            <div className="flex items-center gap-3">
              {React.createElement(getStatusIcon(apiStatus), { className: "w-5 h-5" })}
              <span className="font-medium">API Health</span>
            </div>
            <Badge variant="default" className={getBadgeColor(apiStatus)}>
              {apiStatus === 'healthy' ? 'Healthy' : 
               apiStatus === 'degraded' ? 'Degraded' : 
               apiStatus === 'unhealthy' ? 'Unhealthy' : 'Unknown'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Response Time</span>
            </div>
            <Badge variant="outline">
              {healthData?.performance?.avgResponseTime ? 
                `${Math.round(healthData.performance.avgResponseTime)}ms` : 
                'Unknown'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingDemo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isDowngradeDialogOpen, setIsDowngradeDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Sample organization data for demo
  const organization = {
    id: 4,
    name: "Global Solutions Corp",
    plan: "team",
    subscription_status: "active",
    current_period_end: "2025-07-04T00:00:00.000Z",
    employee_count: 150,
    monthly_revenue: 199.00,
    total_revenue: 2388.00
  };

  // Billing plans configuration
  const plans = {
    free: { name: 'Free', price: 0, features: ['Basic trip planning', '5 users max', 'Email support'] },
    team: { name: 'Team', price: 199, features: ['Advanced planning', '50 users', 'Priority support', 'Analytics'] },
    enterprise: { name: 'Enterprise', price: 499, features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'Advanced analytics', 'White-label options'] }
  };

  // Plan upgrade mutation
  const upgradePlan = useMutation({
    mutationFn: async (planData: any) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${organization.id}/upgrade`, planData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Upgraded Successfully",
        description: `Organization upgraded to ${selectedPlan} plan`,
      });
      setIsUpgradeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error) => {
      toast({
        title: "Upgrade Failed",
        description: "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Plan downgrade mutation
  const downgradePlan = useMutation({
    mutationFn: async (planData: any) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${organization.id}/downgrade`, planData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan Downgraded Successfully",
        description: `Organization downgraded to ${selectedPlan} plan`,
      });
      setIsDowngradeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: () => {
      toast({
        title: "Downgrade Failed",
        description: "Failed to downgrade plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Refund processing mutation
  const processRefund = useMutation({
    mutationFn: async (refundData: any) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${organization.id}/refund`, refundData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Refund Processed Successfully",
        description: `Refund of $${refundAmount} has been processed`,
      });
      setIsRefundDialogOpen(false);
      setRefundAmount('');
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: () => {
      toast({
        title: "Refund Failed",
        description: "Failed to process refund. Please try again.",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Billing Management Demo
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Complete Stripe billing system with subscription management
            </p>
          </div>
        </div>

        {/* Organization Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {organization.name}
            </CardTitle>
            <CardDescription>
              Organization billing and subscription management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {plans[organization.plan as keyof typeof plans]?.name}
                </div>
                <div className="text-sm text-blue-600/70 dark:text-blue-400/70">Current Plan</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  <Badge variant={organization.subscription_status === 'active' ? 'default' : 'destructive'}>
                    {organization.subscription_status}
                  </Badge>
                </div>
                <div className="text-sm text-green-600/70 dark:text-green-400/70">Status</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${organization.monthly_revenue}
                </div>
                <div className="text-sm text-purple-600/70 dark:text-purple-400/70">Monthly Revenue</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {organization.employee_count}
                </div>
                <div className="text-sm text-orange-600/70 dark:text-orange-400/70">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Upgrade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
                Upgrade Plan
              </CardTitle>
              <CardDescription>
                Upgrade to a higher tier with more features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upgrade Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Select a new plan for {organization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    upgradePlan.mutate({ plan: selectedPlan });
                  }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="upgrade-plan">New Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enterprise">Enterprise ($499/month)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!selectedPlan || upgradePlan.isPending}>
                        {upgradePlan.isPending ? 'Processing...' : 'Upgrade Plan'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Plan Downgrade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                Downgrade Plan
              </CardTitle>
              <CardDescription>
                Downgrade to a lower tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isDowngradeDialogOpen} onOpenChange={setIsDowngradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    Downgrade Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Downgrade Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Select a new plan for {organization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    downgradePlan.mutate({ plan: selectedPlan });
                  }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="downgrade-plan">New Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free ($0/month)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsDowngradeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!selectedPlan || downgradePlan.isPending}>
                        {downgradePlan.isPending ? 'Processing...' : 'Downgrade Plan'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Process Refund */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                Process Refund
              </CardTitle>
              <CardDescription>
                Issue a refund for billing disputes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="destructive">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Refund
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Process Refund</DialogTitle>
                    <DialogDescription>
                      Issue a refund for {organization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    processRefund.mutate({ 
                      amount: parseFloat(refundAmount), 
                      reason: refundReason,
                      refund_type: 'full'
                    });
                  }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="refund-amount">Refund Amount ($)</Label>
                        <Input
                          id="refund-amount"
                          type="number"
                          step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="199.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="refund-reason">Reason for Refund</Label>
                        <Textarea
                          id="refund-reason"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="Reason for issuing refund..."
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="destructive"
                        disabled={!refundAmount || !refundReason || processRefund.isPending}
                      >
                        {processRefund.isPending ? 'Processing...' : 'Process Refund'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Plan Features Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Compare features across all subscription tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(plans).map(([key, plan]) => (
                <div 
                  key={key} 
                  className={`p-6 rounded-lg border-2 ${
                    organization.plan === key 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      ${plan.price}<span className="text-sm text-gray-500">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {organization.plan === key && (
                    <div className="mt-4 text-center">
                      <Badge variant="default">Current Plan</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Billing Activity</CardTitle>
            <CardDescription>
              Transaction history and billing events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Jan 4, 2025</TableCell>
                  <TableCell>Team Plan Subscription</TableCell>
                  <TableCell>$199.00</TableCell>
                  <TableCell>
                    <Badge variant="default">Paid</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Dec 4, 2024</TableCell>
                  <TableCell>Team Plan Subscription</TableCell>
                  <TableCell>$199.00</TableCell>
                  <TableCell>
                    <Badge variant="default">Paid</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Nov 4, 2024</TableCell>
                  <TableCell>Team Plan Subscription</TableCell>
                  <TableCell>$199.00</TableCell>
                  <TableCell>
                    <Badge variant="default">Paid</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Status */}
        <SystemHealthStatus />
      </div>
    </div>
  );
}