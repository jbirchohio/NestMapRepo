import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SecureJWTAuthContext";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Users, 
  ArrowUpRight, 
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { format } from "date-fns";

interface BillingInfo {
  customerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  currentPeriodEnd?: string;
  plan: 'free' | 'team' | 'enterprise';
}

export default function BillingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Check user permissions for billing access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  const hasBillingAccess = userPermissions && (
    userPermissions.canAccessBilling || 
    userPermissions.canManageOrganization ||
    userPermissions.canAccessAdmin ||
    user?.role === 'admin'
  );

  // Get billing information
  const { data: billingInfo, isLoading: billingLoading } = useQuery<BillingInfo>({
    queryKey: ['/api/billing', user?.user_metadata?.customerId],
    enabled: !!user?.user_metadata?.customerId && hasBillingAccess,
  });

  // Create billing portal session
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal", {
        customerId: user?.user_metadata?.customerId,
        returnUrl: window.location.origin + "/team"
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    }
  });

  // Upgrade subscription
  const upgradeMutation = useMutation({
    mutationFn: async (plan: 'team' | 'enterprise') => {
      const response = await apiRequest("POST", "/api/billing/subscription", {
        organizationId: user?.user_metadata?.organization_id,
        plan,
        customerEmail: user?.email,
        customerName: user?.user_metadata?.display_name || user?.email
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.clientSecret) {
        toast({
          title: "Redirecting to payment...",
          description: "Complete your subscription setup",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create subscription",
        variant: "destructive",
      });
    }
  });

  if (!user || !hasBillingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access billing information. Contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'past_due': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'canceled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'team': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              Billing & Subscription
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your organization's subscription and billing
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Current Plan */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={getPlanColor(billingInfo?.plan || 'free')}>
                  {(billingInfo?.plan || 'free').toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(billingInfo?.status || 'inactive')}>
                {(billingInfo?.status || 'inactive').toUpperCase()}
              </Badge>
            </CardContent>
          </Card>

          {/* Next Billing Date */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {billingInfo?.currentPeriodEnd ? 
                  format(new Date(billingInfo.currentPeriodEnd), 'MMM dd, yyyy') :
                  'N/A'
                }
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.user_metadata?.organization_id ? '5' : '1'}
              </div>
              <p className="text-xs text-muted-foreground">
                Active members
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Plan Features & Upgrade Options */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Free Plan */}
          <Card className={billingInfo?.plan === 'free' ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Free
                {billingInfo?.plan === 'free' && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </CardTitle>
              <div className="text-3xl font-bold">$0</div>
              <p className="text-sm text-muted-foreground">Per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Up to 5 trips
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Basic collaboration
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Mobile access
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Plan */}
          <Card className={billingInfo?.plan === 'team' ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Team
                {billingInfo?.plan === 'team' && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </CardTitle>
              <div className="text-3xl font-bold">$29</div>
              <p className="text-sm text-muted-foreground">Per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Unlimited trips
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Advanced collaboration
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Analytics dashboard
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Priority support
                </div>
              </div>
              {billingInfo?.plan !== 'team' && (
                <Button 
                  className="w-full" 
                  onClick={() => upgradeMutation.mutate('team')}
                  disabled={upgradeMutation.isPending}
                >
                  Upgrade to Team
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className={billingInfo?.plan === 'enterprise' ? 'ring-2 ring-purple-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Enterprise
                {billingInfo?.plan === 'enterprise' && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </CardTitle>
              <div className="text-3xl font-bold">$99</div>
              <p className="text-sm text-muted-foreground">Per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Everything in Team
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Advanced security
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Custom integrations
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Dedicated support
                </div>
              </div>
              {billingInfo?.plan !== 'enterprise' && (
                <Button 
                  className="w-full" 
                  onClick={() => upgradeMutation.mutate('enterprise')}
                  disabled={upgradeMutation.isPending}
                >
                  Upgrade to Enterprise
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Billing Management */}
        {billingInfo?.customerId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Billing Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Manage Payment Methods</h3>
                  <p className="text-sm text-muted-foreground">
                    Update payment methods, view invoices, and manage your subscription
                  </p>
                </div>
                <Button 
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  Open Billing Portal
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
