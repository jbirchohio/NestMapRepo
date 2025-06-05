import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  ArrowLeft, 
  CheckCircle, 
  Sparkles,
  Building2,
  Palette,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import BrandingOnboarding from '@/components/BrandingOnboarding';

interface OnboardingStatus {
  needsOnboarding: boolean;
  hasAccess: boolean;
  hasConfigured: boolean;
  plan: string;
}

interface OrganizationPlan {
  id: number;
  name: string;
  plan: string;
  white_label_enabled: boolean;
  white_label_plan: string;
  subscription_status: string;
}

export default function BrandingSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding
  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery<OnboardingStatus>({
    queryKey: ['/api/white-label/onboarding-status'],
  });

  // Get organization plan
  const { data: orgPlan } = useQuery<OrganizationPlan>({
    queryKey: ['/api/organization/plan'],
  });

  // Auto-enable white label mutation
  const autoEnableMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest('POST', '/api/white-label/auto-enable', { plan });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/white-label/onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/plan'] });
      queryClient.invalidateQueries({ queryKey: ['/api/white-label/permissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update plan settings",
        variant: "destructive",
      });
    },
  });

  // Simulate plan upgrade for demo
  const handleUpgradeToProfessional = () => {
    autoEnableMutation.mutate('professional');
  };

  const handleStartBranding = () => {
    setShowOnboarding(true);
  };

  const handleBrandingComplete = () => {
    setShowOnboarding(false);
    toast({
      title: "Branding Applied",
      description: "Your custom branding is now active across the platform.",
    });
    setLocation('/');
  };

  const handleSkipBranding = () => {
    setShowOnboarding(false);
    setLocation('/');
  };

  useEffect(() => {
    if (onboardingStatus?.needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [onboardingStatus]);

  if (onboardingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-electric-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showOnboarding && orgPlan) {
    return (
      <BrandingOnboarding
        onComplete={handleBrandingComplete}
        onSkip={handleSkipBranding}
        organizationPlan={orgPlan.plan}
      />
    );
  }

  const canUseBranding = orgPlan?.plan === 'professional' || orgPlan?.plan === 'enterprise';

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto mb-4 p-3 rounded-full bg-electric-100 dark:bg-electric-900/20 w-fit">
              <Sparkles className="h-8 w-8 text-electric-600 dark:text-electric-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
              White Label Branding
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform the platform with your company's branding and make it truly yours
            </p>
          </motion.div>

          {/* Current Plan Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-electric-200/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-electric-600" />
                    <div>
                      <CardTitle>Current Plan</CardTitle>
                      <CardDescription>Organization: {orgPlan?.name}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={canUseBranding ? "default" : "secondary"} 
                    className="gap-1 capitalize"
                  >
                    {canUseBranding ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        {orgPlan?.plan} Plan
                      </>
                    ) : (
                      <>
                        <Crown className="h-3 w-3" />
                        {orgPlan?.plan || 'starter'} Plan
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              {!canUseBranding && (
                <CardContent>
                  <Alert>
                    <Crown className="h-4 w-4" />
                    <AlertDescription>
                      White label branding requires Pro plan ($99/month) or higher. 
                      <strong> Upgrade to unlock instant branding capabilities.</strong>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>
          </motion.div>

          {/* Feature Comparison */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Basic Plan */}
            <Card className={`border-gray-200 dark:border-gray-700 ${orgPlan?.plan === 'basic' ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  Basic ($29/month)
                  {orgPlan?.plan === 'basic' && (
                    <Badge variant="secondary" className="ml-auto">
                      Current
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  Trip planning & management
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  Team dashboard
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  1 admin user
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  Standard branding
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`border-electric-200 ${orgPlan?.plan === 'pro' ? 'bg-gradient-to-br from-electric-50 to-electric-100 dark:from-electric-900/20 dark:to-electric-800/20' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-electric-500" />
                  Pro ($99/month)
                  {orgPlan?.plan === 'pro' && (
                    <Badge variant="default" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Current
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-electric-600">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Everything in Basic +
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  <strong>White label branding</strong>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Client proposals
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Up to 5 users
                </div>
              </CardContent>
            </Card>

            {/* Business Plan */}
            <Card className={`border-emerald-200 ${orgPlan?.plan === 'business' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  Business ($199/month)
                  {orgPlan?.plan === 'business' && (
                    <Badge variant="default" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Current
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Everything in Pro +
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Custom domain
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Advanced analytics
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Up to 10+ users
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className={`border-orange-200 ${orgPlan?.plan === 'enterprise' ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  Enterprise ($499+/month)
                  {orgPlan?.plan === 'enterprise' && (
                    <Badge variant="default" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Current
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Everything in Business +
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  SSO integration
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Full API access
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Concierge onboarding & SLA
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-6"
          >
            {canUseBranding ? (
              <div className="space-y-4">
                <div className="p-6 bg-electric-50 dark:bg-electric-900/20 rounded-lg border border-electric-200 dark:border-electric-800">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-electric-600" />
                    <span className="font-medium text-electric-900 dark:text-electric-100">
                      White Label Branding Enabled
                    </span>
                  </div>
                  <p className="text-sm text-electric-800 dark:text-electric-200 mb-4">
                    You can now customize the platform with your company's branding
                  </p>
                  <Button 
                    onClick={handleStartBranding}
                    className="bg-electric-600 hover:bg-electric-700 gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Customize Branding
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Crown className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-orange-900 dark:text-orange-100">
                      Unlock White Label Branding
                    </span>
                  </div>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                    Upgrade to Professional to automatically enable custom branding, 
                    remove "Powered by NestMap", and present a fully branded experience to your clients.
                  </p>
                  <Button 
                    onClick={handleUpgradeToProfessional}
                    disabled={autoEnableMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    {autoEnableMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    Upgrade to Professional
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Features Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-electric-600" />
                  What You Get
                </CardTitle>
                <CardDescription>
                  Professional white label branding capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-electric-100 dark:bg-electric-900/20 rounded-lg flex items-center justify-center">
                      <Palette className="h-6 w-6 text-electric-600" />
                    </div>
                    <h3 className="font-medium">Custom Branding</h3>
                    <p className="text-sm text-muted-foreground">
                      Your logo, colors, and company name throughout the platform
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-electric-100 dark:bg-electric-900/20 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-electric-600" />
                    </div>
                    <h3 className="font-medium">Professional Identity</h3>
                    <p className="text-sm text-muted-foreground">
                      Remove all references to NestMap for a seamless client experience
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-electric-100 dark:bg-electric-900/20 rounded-lg flex items-center justify-center">
                      <Crown className="h-6 w-6 text-electric-600" />
                    </div>
                    <h3 className="font-medium">Instant Enablement</h3>
                    <p className="text-sm text-muted-foreground">
                      Auto-enabled with Professional plan - no manual approval needed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}