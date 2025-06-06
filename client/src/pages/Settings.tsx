import React, { useState } from 'react';
import { useAuth } from "@/contexts/JWTAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Settings2, 
  Palette, 
  Crown, 
  CheckCircle,
  Building2,
  Globe,
  Image,
  Eye,
  Save,
  Upload,
  Paintbrush,
  Type
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import BrandingOnboarding from '@/components/BrandingOnboarding';

const whiteLabelSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().url().optional().or(z.literal("")),
  tagline: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  customDomain: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
});

interface OrganizationPlan {
  id: number;
  name: string;
  plan: string;
  white_label_enabled: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check user permissions for settings access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  // Get organization plan
  const { data: orgPlan } = useQuery<OrganizationPlan>({
    queryKey: ['/api/organization/plan'],
    enabled: !!user,
  });

  // Get white label config
  const { data: whiteLabelConfig } = useQuery({
    queryKey: ['/api/white-label/config'],
    enabled: !!user,
  });

  const form = useForm({
    resolver: zodResolver(whiteLabelSchema),
    defaultValues: {
      companyName: "",
      companyLogo: "",
      tagline: "",
      primaryColor: "#6D5DFB",
      secondaryColor: "#6D5DFB",
      accentColor: "#6D5DFB",
      customDomain: "",
      supportEmail: "",
    },
  });

  // Update form when white label config loads
  useEffect(() => {
    if (whiteLabelConfig?.config) {
      const config = whiteLabelConfig.config;
      form.reset({
        companyName: config.companyName || "",
        companyLogo: config.logoUrl || "",
        tagline: config.tagline || "",
        primaryColor: config.primaryColor || "#6D5DFB",
        secondaryColor: config.secondaryColor || "#6D5DFB",
        accentColor: config.accentColor || "#6D5DFB",
        customDomain: config.customDomain || "",
        supportEmail: config.supportEmail || "",
      });
    }
  }, [whiteLabelConfig, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/white-label/configure', {
        companyName: data.companyName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        tagline: data.tagline,
        companyLogo: data.companyLogo || null,
        customDomain: data.customDomain,
        supportEmail: data.supportEmail
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your white label settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/white-label/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const hasSettingsAccess = userPermissions && (
    (userPermissions as any).canManageOrganization || 
    (userPermissions as any).canAccessAdmin ||
    user?.role === 'admin'
  );

  const canUseBranding = orgPlan?.plan === 'pro' || orgPlan?.plan === 'business' || orgPlan?.plan === 'enterprise';

  const onSubmit = (data: any) => {
    if (!canUseBranding) {
      toast({
        title: "Upgrade Required",
        description: "White label branding requires Pro plan or higher.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access organization settings. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (showOnboarding && orgPlan) {
    return (
      <BrandingOnboarding
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
        organizationPlan={orgPlan.plan}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto mb-4 p-3 rounded-full bg-electric-100 dark:bg-electric-900/20 w-fit">
              <Settings2 className="h-8 w-8 text-electric-600 dark:text-electric-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
              Organization Settings
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your organization's settings, branding, and configuration
            </p>
          </motion.div>

          {/* Plan Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`border-electric-200 ${canUseBranding ? 'bg-gradient-to-r from-electric-50 to-electric-100 dark:from-electric-900/20 dark:to-electric-800/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-electric-600" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {orgPlan?.name} Organization
                        {canUseBranding && <CheckCircle className="h-4 w-4 text-electric-600" />}
                      </CardTitle>
                      <CardDescription>
                        {canUseBranding 
                          ? "White label branding enabled" 
                          : "Upgrade to Pro plan for white label branding"
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={canUseBranding ? "default" : "secondary"} className="gap-1 capitalize">
                    {canUseBranding ? <CheckCircle className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                    {orgPlan?.plan} Plan
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Settings Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="branding" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="branding" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="domain" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Domain
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="branding" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Paintbrush className="h-5 w-5" />
                        Brand Identity
                      </CardTitle>
                      <CardDescription>
                        Customize your company's visual identity and branding
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input
                            id="companyName"
                            {...form.register('companyName')}
                            disabled={!canUseBranding}
                            placeholder="Your Company Name"
                          />
                          {form.formState.errors.companyName && (
                            <p className="text-sm text-red-500">{form.formState.errors.companyName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="tagline">Tagline</Label>
                          <Input
                            id="tagline"
                            {...form.register('tagline')}
                            disabled={!canUseBranding}
                            placeholder="Your company tagline"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Company Logo</Label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                          <div className="text-center">
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4">
                              <Label htmlFor="logo-upload" className="cursor-pointer">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  <Button type="button" variant="outline" disabled={!canUseBranding}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Logo
                                  </Button>
                                </div>
                              </Label>
                              <Input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={!canUseBranding}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              PNG, JPG, SVG up to 2MB. Recommended: 200x60px
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Brand Colors</Label>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="primaryColor">Primary Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="primaryColor"
                                type="color"
                                {...form.register('primaryColor')}
                                disabled={!canUseBranding}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                {...form.register('primaryColor')}
                                disabled={!canUseBranding}
                                placeholder="#6D5DFB"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="secondaryColor"
                                type="color"
                                {...form.register('secondaryColor')}
                                disabled={!canUseBranding}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                {...form.register('secondaryColor')}
                                disabled={!canUseBranding}
                                placeholder="#6D5DFB"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="accentColor">Accent Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="accentColor"
                                type="color"
                                {...form.register('accentColor')}
                                disabled={!canUseBranding}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                {...form.register('accentColor')}
                                disabled={!canUseBranding}
                                placeholder="#6D5DFB"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {!canUseBranding && (
                        <Alert>
                          <Crown className="h-4 w-4" />
                          <AlertDescription>
                            White label branding requires Pro plan ($99/month) or higher. 
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-semibold text-electric-600"
                              onClick={() => setShowOnboarding(true)}
                            >
                              Upgrade now
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="domain" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Domain & Contact
                      </CardTitle>
                      <CardDescription>
                        Configure your custom domain and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="customDomain">Custom Domain</Label>
                          <Input
                            id="customDomain"
                            {...form.register('customDomain')}
                            disabled={!canUseBranding || orgPlan?.plan === 'pro'}
                            placeholder="your-company.com"
                          />
                          {orgPlan?.plan === 'pro' && (
                            <p className="text-sm text-amber-600">Custom domain available in Business plan</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="supportEmail">Support Email</Label>
                          <Input
                            id="supportEmail"
                            type="email"
                            {...form.register('supportEmail')}
                            disabled={!canUseBranding}
                            placeholder="support@yourcompany.com"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Advanced Settings
                      </CardTitle>
                      <CardDescription>
                        Advanced configuration options for your organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Alert>
                          <Settings2 className="h-4 w-4" />
                          <AlertDescription>
                            Advanced settings like SSO integration and API access are available in Enterprise plan.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {canUseBranding && (
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending}
                      className="gap-2"
                    >
                      {saveMutation.isPending ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                )}
              </form>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}