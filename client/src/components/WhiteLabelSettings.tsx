import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Globe, 
  Image, 
  Settings, 
  Eye, 
  Save,
  Upload,
  Paintbrush,
  Type,
  Link,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';

const whiteLabelSchema = z.object({
  // Branding
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().url().optional().or(z.literal("")),
  favicon: z.string().url().optional().or(z.literal("")),
  tagline: z.string().optional(),
  
  // Colors
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  
  // Domain & URLs
  customDomain: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  helpUrl: z.string().url().optional().or(z.literal("")),
  
  // Features
  enableGuestMode: z.boolean(),
  enablePublicSignup: z.boolean(),
  enableSocialLogin: z.boolean(),
  enableMobileApp: z.boolean(),
  
  // Footer & Legal
  companyWebsite: z.string().url().optional().or(z.literal("")),
  privacyPolicyUrl: z.string().url().optional().or(z.literal("")),
  termsOfServiceUrl: z.string().url().optional().or(z.literal("")),
  footerText: z.string().optional(),
});

type WhiteLabelFormValues = z.infer<typeof whiteLabelSchema>;

export default function WhiteLabelSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<WhiteLabelFormValues>({
    resolver: zodResolver(whiteLabelSchema),
    defaultValues: {
      companyName: "NestMap",
      primaryColor: "#3B82F6",
      secondaryColor: "#4682B4",
      accentColor: "#10b981",
      enableGuestMode: true,
      enablePublicSignup: true,
      enableSocialLogin: true,
      enableMobileApp: true,
      tagline: "AI-Powered Corporate Travel Management",
      footerText: "© 2025 NestMap. All rights reserved."
    }
  });

  // Watch form values for live preview
  const watchedValues = form.watch();

  const onSubmit = async (values: WhiteLabelFormValues) => {
    setIsSaving(true);
    try {
      // Save to localStorage and apply branding
      localStorage.setItem('whiteLabelConfig', JSON.stringify(values));
      
      // Apply CSS variables for live branding
      document.documentElement.style.setProperty('--primary', `217 91% 60%`);
      document.documentElement.style.setProperty('--secondary', `207 44% 49%`);
      document.documentElement.style.setProperty('--accent', `142 76% 36%`);
      
      toast({
        title: "Settings saved",
        description: "White label configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save white label settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert to base64 for immediate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        form.setValue('companyLogo', base64);
        toast({
          title: "Logo Uploaded",
          description: "Company logo has been uploaded successfully.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentValues = form.watch();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            White Label Settings
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Customize the platform branding and appearance for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Preview Changes'}
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domain
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Basic company details and branding elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      {...form.register("companyName")}
                      placeholder="Your Company Name"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      {...form.register("tagline")}
                      placeholder="Your company tagline"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </Button>
                    {currentValues.companyLogo && (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                          <Image className="h-4 w-4" />
                        </div>
                        <span className="text-sm text-muted-foreground">Logo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    {...form.register("footerText")}
                    placeholder="Copyright and footer information"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Branding Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Branding Preview</CardTitle>
                <CardDescription>
                  See how your company branding will appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    {currentValues.companyLogo ? (
                      <img 
                        src={currentValues.companyLogo} 
                        alt="Company Logo" 
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div 
                        className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: currentValues.primaryColor }}
                      >
                        {currentValues.companyName.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                        {currentValues.companyName}
                      </span>
                      {currentValues.tagline && (
                        <span className="text-sm text-muted-foreground">
                          {currentValues.tagline}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 text-center">
                    <p className="text-xs text-slate-500">
                      {currentValues.footerText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Color Scheme
                </CardTitle>
                <CardDescription>
                  Customize the platform's color palette to match your brand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="primaryColor"
                        {...form.register("primaryColor")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...form.register("primaryColor")}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                    {form.formState.errors.primaryColor && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.primaryColor.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="secondaryColor"
                        {...form.register("secondaryColor")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...form.register("secondaryColor")}
                        placeholder="#64748b"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="accentColor"
                        {...form.register("accentColor")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...form.register("accentColor")}
                        placeholder="#10b981"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Color Preview</h4>
                  <div className="flex gap-3">
                    <div 
                      className="h-16 w-24 rounded flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: currentValues.primaryColor }}
                    >
                      Primary
                    </div>
                    <div 
                      className="h-16 w-24 rounded flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: currentValues.secondaryColor }}
                    >
                      Secondary
                    </div>
                    <div 
                      className="h-16 w-24 rounded flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: currentValues.accentColor }}
                    >
                      Accent
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Scheme Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Interface Preview</CardTitle>
                <CardDescription>
                  See how your color scheme will appear in the interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-white dark:bg-slate-900">
                  {/* Mock Navigation Bar */}
                  <div 
                    className="flex items-center justify-between p-3 rounded-t-lg text-white"
                    style={{ backgroundColor: currentValues.primaryColor }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-white/20"></div>
                      <span className="font-medium">NestMap</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/20"></div>
                    </div>
                  </div>
                  
                  {/* Mock Content Area */}
                  <div className="p-4 border-x">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: currentValues.accentColor }}
                      ></div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Trip Planning Dashboard
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div 
                        className="px-3 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: currentValues.primaryColor }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-3 py-1 rounded text-xs border"
                        style={{ 
                          borderColor: currentValues.secondaryColor,
                          color: currentValues.secondaryColor 
                        }}
                      >
                        Secondary Button
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Domain & URLs
                </CardTitle>
                <CardDescription>
                  Configure custom domain and support links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">Custom Domain</Label>
                    <Input
                      id="customDomain"
                      {...form.register("customDomain")}
                      placeholder="travel.yourcompany.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Configure DNS to point to our servers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      {...form.register("supportEmail")}
                      placeholder="support@yourcompany.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="helpUrl">Help/Documentation URL</Label>
                    <Input
                      id="helpUrl"
                      {...form.register("helpUrl")}
                      placeholder="https://help.yourcompany.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <Input
                      id="companyWebsite"
                      {...form.register("companyWebsite")}
                      placeholder="https://yourcompany.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                    <Input
                      id="privacyPolicyUrl"
                      {...form.register("privacyPolicyUrl")}
                      placeholder="https://yourcompany.com/privacy"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termsOfServiceUrl">Terms of Service URL</Label>
                    <Input
                      id="termsOfServiceUrl"
                      {...form.register("termsOfServiceUrl")}
                      placeholder="https://yourcompany.com/terms"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Platform Features
                </CardTitle>
                <CardDescription>
                  Control which features are available to your users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="enableGuestMode">Guest Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow anonymous users to try the platform with limited features
                      </p>
                    </div>
                    <Switch
                      id="enableGuestMode"
                      checked={form.watch("enableGuestMode")}
                      onCheckedChange={(checked) => form.setValue("enableGuestMode", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="enablePublicSignup">Public Signup</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to create accounts without invitations
                      </p>
                    </div>
                    <Switch
                      id="enablePublicSignup"
                      checked={form.watch("enablePublicSignup")}
                      onCheckedChange={(checked) => form.setValue("enablePublicSignup", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="enableSocialLogin">Social Login</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable Google and Microsoft OAuth authentication
                      </p>
                    </div>
                    <Switch
                      id="enableSocialLogin"
                      checked={form.watch("enableSocialLogin")}
                      onCheckedChange={(checked) => form.setValue("enableSocialLogin", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="enableMobileApp">Mobile App</Label>
                      <p className="text-sm text-muted-foreground">
                        Provide mobile app download links and features
                      </p>
                    </div>
                    <Switch
                      id="enableMobileApp"
                      checked={form.watch("enableMobileApp")}
                      onCheckedChange={(checked) => form.setValue("enableMobileApp", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Preview</CardTitle>
                <CardDescription>
                  See how your white label configuration will appear to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  {/* Live Preview Header */}
                  <div className="border-b bg-white dark:bg-slate-900 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: currentValues.primaryColor }}
                        >
                          {currentValues.companyName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                            {currentValues.companyName}
                          </span>
                          {currentValues.tagline && (
                            <span className="text-xs text-muted-foreground -mt-1">
                              {currentValues.tagline}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge style={{ backgroundColor: currentValues.accentColor, color: 'white' }}>
                        Enterprise
                      </Badge>
                    </div>
                  </div>

                  {/* Live Preview Navigation */}
                  <div className="border-b bg-slate-50 dark:bg-slate-800 px-4 py-2">
                    <div className="flex items-center gap-6 text-sm">
                      <div 
                        className="px-3 py-1 rounded text-white font-medium"
                        style={{ backgroundColor: currentValues.primaryColor }}
                      >
                        Travel Console
                      </div>
                      <span className="text-slate-600 dark:text-slate-400">Travel Analytics</span>
                      <span className="text-slate-600 dark:text-slate-400">Team Bookings</span>
                      <span className="text-slate-600 dark:text-slate-400">AI Trip Generator</span>
                      <span className="text-slate-600 dark:text-slate-400">Team Management</span>
                    </div>
                  </div>

                  {/* Live Preview Content */}
                  <div className="p-4 space-y-4">
                    {/* Dashboard Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border rounded-lg p-3 bg-white dark:bg-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Active Trips</div>
                        <div className="text-xl font-bold" style={{ color: currentValues.primaryColor }}>24</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-white dark:bg-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Team Members</div>
                        <div className="text-xl font-bold" style={{ color: currentValues.secondaryColor }}>156</div>
                      </div>
                      <div className="border rounded-lg p-3 bg-white dark:bg-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Total Budget</div>
                        <div className="text-xl font-bold" style={{ color: currentValues.accentColor }}>$245K</div>
                      </div>
                    </div>

                    {/* Recent Trips List */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Recent Team Trips</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: currentValues.accentColor }}
                            />
                            <span className="text-sm font-medium">Q2 Sales Conference - Austin</span>
                          </div>
                          <span className="text-xs text-slate-500">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: currentValues.primaryColor }}
                            />
                            <span className="text-sm font-medium">Engineering Retreat - Denver</span>
                          </div>
                          <span className="text-xs text-slate-500">Planning</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="flex justify-center pt-2">
                      <Button 
                        className="px-4 py-2 rounded text-primary-foreground text-sm font-medium bg-primary hover:bg-primary/90"
                      >
                        Create New Team Trip
                      </Button>
                    </div>
                  </div>

                  {/* Live Preview Footer */}
                  <div className="border-t bg-slate-50 dark:bg-slate-800 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      {currentValues.footerText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
