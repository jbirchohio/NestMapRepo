import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Eye, 
  Sparkles,
  Building2,
  CheckCircle,
  ArrowRight,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { apiRequest } from '@/lib/queryClient';

const quickBrandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  tagline: z.string().optional(),
  enableBranding: z.boolean(),
});

type QuickBrandingData = z.infer<typeof quickBrandingSchema>;

interface BrandingOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
  organizationPlan: string;
}

export default function BrandingOnboarding({ onComplete, onSkip, organizationPlan }: BrandingOnboardingProps) {
  const { toast } = useToast();
  const { updateConfig, enableWhiteLabel } = useWhiteLabel();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuickBrandingData>({
    resolver: zodResolver(quickBrandingSchema),
    defaultValues: {
      companyName: "",
      primaryColor: "#6D5DFB",
      tagline: "",
      enableBranding: true,
    },
  });

  const watchedValues = form.watch();
  const canUseBranding = organizationPlan === 'pro' || organizationPlan === 'business' || organizationPlan === 'enterprise';

  const onSubmit = async (data: QuickBrandingData) => {
    if (!canUseBranding && data.enableBranding) {
      toast({
        title: "Upgrade Required",
        description: "White label branding requires Professional plan or higher.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (data.enableBranding) {
        // Save branding configuration to backend
        await apiRequest('POST', '/api/white-label/configure', {
          companyName: data.companyName,
          primaryColor: data.primaryColor,
          secondaryColor: data.primaryColor,
          accentColor: data.primaryColor,
          tagline: data.tagline,
          logoUrl: null
        });

        // Update local context
        updateConfig({
          companyName: data.companyName,
          primaryColor: data.primaryColor,
          tagline: data.tagline,
          footerText: `© 2025 ${data.companyName}. All rights reserved.`,
        });

        // Enable white label mode
        enableWhiteLabel();

        toast({
          title: "Branding Applied",
          description: `Your ${data.companyName} branding is now active across the platform.`,
        });
      }

      onComplete();
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "There was an issue applying your branding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-electric-200/30 bg-white/90 dark:bg-navy-800/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-3 rounded-full bg-electric-100 dark:bg-electric-900/20 w-fit">
              <Sparkles className="h-8 w-8 text-electric-600 dark:text-electric-400" />
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
              Brand This for Your Business?
            </CardTitle>
            <CardDescription className="text-base">
              Customize the platform with your company's branding and make it yours
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Plan Status */}
            <div className="flex items-center justify-between p-4 bg-electric-50 dark:bg-electric-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-electric-600" />
                <div>
                  <div className="font-medium">Current Plan</div>
                  <div className="text-sm text-muted-foreground capitalize">{organizationPlan}</div>
                </div>
              </div>
              <Badge variant={canUseBranding ? "default" : "secondary"} className="gap-1">
                {canUseBranding ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    White Label Enabled
                  </>
                ) : (
                  <>
                    <Crown className="h-3 w-3" />
                    Upgrade Required
                  </>
                )}
              </Badge>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Enable Branding Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable Custom Branding</Label>
                  <p className="text-sm text-muted-foreground">
                    Apply your company's branding across the platform
                  </p>
                </div>
                <Switch
                  checked={form.watch('enableBranding')}
                  onCheckedChange={(checked) => form.setValue('enableBranding', checked)}
                  disabled={!canUseBranding}
                />
              </div>

              {/* Branding Configuration */}
              {form.watch('enableBranding') && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...form.register('companyName')}
                        placeholder="Your Company Inc."
                        className="bg-white dark:bg-navy-700"
                      />
                      {form.formState.errors.companyName && (
                        <p className="text-sm text-red-500">{form.formState.errors.companyName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          {...form.register('primaryColor')}
                          className="w-16 h-10 p-1 bg-white dark:bg-navy-700"
                        />
                        <Input
                          value={form.watch('primaryColor')}
                          onChange={(e) => form.setValue('primaryColor', e.target.value)}
                          placeholder="#6D5DFB"
                          className="flex-1 bg-white dark:bg-navy-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline (optional)</Label>
                    <Input
                      id="tagline"
                      {...form.register('tagline')}
                      placeholder="Streamlined Business Travel"
                      className="bg-white dark:bg-navy-700"
                    />
                  </div>

                  {/* Preview */}
                  {watchedValues.companyName && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50 dark:from-navy-800 dark:to-navy-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-electric-600" />
                        <span className="text-sm font-medium">Preview</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-6 w-6 rounded flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: watchedValues.primaryColor }}
                          >
                            {watchedValues.companyName.charAt(0)}
                          </div>
                          <span 
                            className="font-semibold"
                            style={{ color: watchedValues.primaryColor }}
                          >
                            {watchedValues.companyName}
                          </span>
                        </div>
                        {watchedValues.tagline && (
                          <p className="text-sm text-muted-foreground">{watchedValues.tagline}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onSkip}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || (!canUseBranding && form.watch('enableBranding'))}
                  className="flex-1 bg-electric-600 hover:bg-electric-700"
                >
                  {isSubmitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      {form.watch('enableBranding') ? 'Apply Branding' : 'Continue'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Upgrade Prompt */}
            {!canUseBranding && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-900 dark:text-orange-100">Upgrade to Professional</span>
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  Unlock white label branding, custom domains, and professional proposals for $99/month.
                </p>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                  Upgrade Now
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
