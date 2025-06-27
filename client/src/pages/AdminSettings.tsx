import SharedValueType from '@/types/SharedValueType';
import SharedErrorType from '@/types/SharedErrorType';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { Settings, Shield, Mail, Globe, Server, RefreshCw } from 'lucide-react';
interface SystemSettings {
    general: {
        platformName: string;
        maintenanceMode: boolean;
        registrationEnabled: boolean;
        emailVerificationRequired: boolean;
        maxUsersPerOrganization: number;
        sessionTimeoutMinutes: number;
    };
    security: {
        enforcePasswordComplexity: boolean;
        requireTwoFactor: boolean;
        passwordExpiryDays: number;
        maxLoginAttempts: number;
        lockoutDurationMinutes: number;
    };
    email: {
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
        fromEmail: string;
        fromName: string;
    };
    features: {
        enableAIFeatures: boolean;
        enableFlightBooking: boolean;
        enableCorporateCards: boolean;
        enableAnalytics: boolean;
        enableWhiteLabel: boolean;
    };
}
export default function AdminSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    const { data: settings, isLoading } = useQuery<SystemSettings>({
        queryKey: ['/api/admin/settings'],
        queryFn: async () => (await apiRequest('GET', '/api/admin/settings')) as SystemSettings,
    });
    const updateSettingsMutation = useMutation({
        mutationFn: async (updatedSettings: Partial<SystemSettings>) => (await apiRequest('PUT', '/api/admin/settings', updatedSettings)) as SystemSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
            toast({
                title: "Settings Updated",
                description: "System settings have been saved successfully.",
            });
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Update Failed",
                description: error.message || "Failed to update settings.",
                variant: "destructive",
            });
        },
    });
    const testEmailMutation = useMutation({
        mutationFn: async () => (await apiRequest('POST', '/api/admin/settings/test-email')) as unknown,
        onSuccess: () => {
            toast({
                title: "Email Test Successful",
                description: "Test email sent successfully.",
            });
        },
        onError: () => {
            toast({
                title: "Email Test Failed",
                description: "Failed to send test email. Check your SMTP configuration.",
                variant: "destructive",
            });
        },
    });
    const handleSettingUpdate = (section: keyof SystemSettings, key: string, value: SharedValueType) => {
        if (!settings)
            return;
        const updatedSettings = {
            ...settings,
            [section]: {
                ...settings[section],
                [key]: value,
            },
        };
        updateSettingsMutation.mutate(updatedSettings);
    };
    if (isLoading) {
        return (<div className="min-h-screen bg-soft-100 dark:bg-navy-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-electric-600"/>
          </div>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-electric-600 via-electric-700 to-electric-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-600/20 to-transparent"/>
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <Settings className="w-8 h-8 text-white"/>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">System Settings</h1>
              <p className="text-electric-100 text-lg">Configure platform-wide settings and preferences</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Globe className="w-4 h-4"/>
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4"/>
              Security
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4"/>
              Email
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Server className="w-4 h-4"/>
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure basic platform settings and user registration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input id="platformName" value={settings?.general.platformName || ''} onChange={(e) => handleSettingUpdate('general', 'platformName', e.target.value)}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxUsers">Max Users per Organization</Label>
                    <Input id="maxUsers" type="number" value={settings?.general.maxUsersPerOrganization || 0} onChange={(e) => handleSettingUpdate('general', 'maxUsersPerOrganization', parseInt(e.target.value))}/>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable access for maintenance
                      </p>
                    </div>
                    <Switch checked={settings?.general.maintenanceMode || false} onCheckedChange={(checked) => handleSettingUpdate('general', 'maintenanceMode', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register
                      </p>
                    </div>
                    <Switch checked={settings?.general.registrationEnabled || false} onCheckedChange={(checked) => handleSettingUpdate('general', 'registrationEnabled', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Verification Required</Label>
                      <p className="text-sm text-muted-foreground">
                        Require email verification for new accounts
                      </p>
                    </div>
                    <Switch checked={settings?.general.emailVerificationRequired || false} onCheckedChange={(checked) => handleSettingUpdate('general', 'emailVerificationRequired', checked)}/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure authentication and security policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                    <Input id="passwordExpiry" type="number" value={settings?.security.passwordExpiryDays || 0} onChange={(e) => handleSettingUpdate('security', 'passwordExpiryDays', parseInt(e.target.value))}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAttempts">Max Login Attempts</Label>
                    <Input id="maxAttempts" type="number" value={settings?.security.maxLoginAttempts || 0} onChange={(e) => handleSettingUpdate('security', 'maxLoginAttempts', parseInt(e.target.value))}/>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enforce Password Complexity</Label>
                      <p className="text-sm text-muted-foreground">
                        Require strong passwords with special characters
                      </p>
                    </div>
                    <Switch checked={settings?.security.enforcePasswordComplexity || false} onCheckedChange={(checked) => handleSettingUpdate('security', 'enforcePasswordComplexity', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Mandate 2FA for all user accounts
                      </p>
                    </div>
                    <Switch checked={settings?.security.requireTwoFactor || false} onCheckedChange={(checked) => handleSettingUpdate('security', 'requireTwoFactor', checked)}/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure SMTP settings for system emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" value={settings?.email.smtpHost || ''} onChange={(e) => handleSettingUpdate('email', 'smtpHost', e.target.value)}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input id="smtpPort" type="number" value={settings?.email.smtpPort || 0} onChange={(e) => handleSettingUpdate('email', 'smtpPort', parseInt(e.target.value))}/>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button onClick={() => testEmailMutation.mutate()} disabled={testEmailMutation.isPending} variant="outline">
                    {testEmailMutation.isPending ? (<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>) : (<Mail className="w-4 h-4 mr-2"/>)}
                    Test Email Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>
                  Enable or disable platform features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AI Features</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered trip planning and recommendations
                      </p>
                    </div>
                    <Switch checked={settings?.features.enableAIFeatures || false} onCheckedChange={(checked) => handleSettingUpdate('features', 'enableAIFeatures', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Flight Booking</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable flight search and booking capabilities
                      </p>
                    </div>
                    <Switch checked={settings?.features.enableFlightBooking || false} onCheckedChange={(checked) => handleSettingUpdate('features', 'enableFlightBooking', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Corporate Cards</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable corporate card management features
                      </p>
                    </div>
                    <Switch checked={settings?.features.enableCorporateCards || false} onCheckedChange={(checked) => handleSettingUpdate('features', 'enableCorporateCards', checked)}/>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>White Label</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable white label branding capabilities
                      </p>
                    </div>
                    <Switch checked={settings?.features.enableWhiteLabel || false} onCheckedChange={(checked) => handleSettingUpdate('features', 'enableWhiteLabel', checked)}/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>);
}
