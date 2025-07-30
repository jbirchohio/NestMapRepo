import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { db } from '../../db';
import { organizations, whiteLabelSettings, customDomains } from '../../db/schema';
import { eq } from '../../utils/drizzle-shim';
import { auditLogger } from '../../auditLogger';

// Input validation schemas
const AutoEnableInput = z.object({
  plan: z.string().min(1, 'Plan is required'),
});

const ConfigureInput = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  primaryColor: z.string().min(4, 'Primary color is required'),
  secondaryColor: z.string().min(4, 'Secondary color is required'),
  accentColor: z.string().min(4, 'Accent color is required'),
  tagline: z.string().optional(),
  companyLogo: z.string().url('Invalid logo URL').optional(),
});

export const whiteLabelRouter = router({
  // Auto-enable white label on plan upgrade
  autoEnable: protectedProcedure
    .input(AutoEnableInput)
    .mutation(async ({ input, ctx }) => {
      const { plan } = input;
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const shouldEnable = ['pro', 'business', 'enterprise'].includes(plan.toLowerCase());
      
      await db.update(organizations)
        .set({
          white_label_enabled: shouldEnable,
          white_label_plan: shouldEnable ? plan.toLowerCase() : 'none',
          plan: plan.toLowerCase(),
          updated_at: new Date()
        })
        .where(eq(organizations.id, organizationId));

      await auditLogger.log({
        action: 'white_label_auto_enabled',
        userId: ctx.user.id,
        metadata: { plan: plan.toLowerCase() },
        status: 'success',
      });

      return {
        success: true,
        white_label_enabled: shouldEnable,
        message: shouldEnable 
          ? "White label branding automatically enabled with your plan upgrade"
          : "Plan updated. Upgrade to Pro ($99/month) for white label branding."
      };
    }),

  // Check white label permissions
  getPermissions: protectedProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const [org] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          white_label_plan: organizations.white_label_plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) throw new Error('Organization not found');

      const plan = org.plan || 'basic';
      const canAccess = ['pro', 'business', 'enterprise'].includes(plan);
      
      return {
        canAccessWhiteLabel: canAccess,
        currentPlan: plan,
        white_label_enabled: org.white_label_enabled,
        upgradeRequired: !canAccess,
        limitations: !canAccess ? [
          "Custom branding requires Pro plan ($99/month)",
          "Auto-enabled with plan upgrade - no manual approval needed"
        ] : []
      };
    }),

  // Get organization plan info
  getOrganizationPlan: protectedProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          white_label_plan: organizations.white_label_plan,
          subscription_status: organizations.subscription_status
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) throw new Error('Organization not found');
      return org;
    }),

  // Configure white label branding
  configure: protectedProcedure
    .input(ConfigureInput)
    .mutation(async ({ input, ctx }) => {
      const { companyName, primaryColor, secondaryColor, accentColor, tagline, companyLogo } = input;
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      // Verify organization exists and has access
      const [org] = await db
        .select({ plan: organizations.plan })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) throw new Error('Organization not found');
      if (!['pro', 'business', 'enterprise'].includes(org.plan || '')) {
        throw new Error('White label branding requires Pro plan ($99/month) or higher');
      }

      // Update organization white label status
      await db.update(organizations)
        .set({ white_label_enabled: true, updated_at: new Date() })
        .where(eq(organizations.id, organizationId));

      // Update or create white label settings
      const settings = {
        company_name: companyName,
        tagline: tagline || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        company_logo: companyLogo || null,
        status: 'approved' as const,
        updated_at: new Date()
      };

      await db
        .insert(whiteLabelSettings)
        .values({
          organization_id: organizationId,
          ...settings,
          created_at: new Date()
        })
        .onConflictDoUpdate({
          target: whiteLabelSettings.organization_id,
          set: settings
        });

      await auditLogger.log({
        action: 'white_label_configured',
        userId: ctx.user.id,
        metadata: { companyName, hasLogo: !!companyLogo },
        status: 'success',
      });

      return {
        success: true,
        message: "Branding configuration saved successfully",
        config: { companyName, primaryColor, secondaryColor, accentColor, tagline, companyLogo }
      };
    }),

  // Get onboarding status
  getOnboardingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const [org] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          primary_color: organizations.primary_color,
          logo_url: organizations.logo_url
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) throw new Error('Organization not found');

      const plan = org.plan || 'starter';
      const hasAccess = ['professional', 'enterprise'].includes(plan);
      const hasConfigured = org.white_label_enabled && (org.primary_color || org.logo_url);

      return {
        needsOnboarding: hasAccess && !hasConfigured,
        hasAccess,
        hasConfigured,
        plan
      };
    }),

  // Get current branding configuration
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const [org] = await db
        .select({
          white_label_enabled: organizations.white_label_enabled,
          plan: organizations.plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) throw new Error('Organization not found');

      // Get white label settings if enabled
      let brandingConfig = null;
      if (org.white_label_enabled) {
        const [settings] = await db
          .select()
          .from(whiteLabelSettings)
          .where(eq(whiteLabelSettings.organization_id, organizationId))
          .limit(1);

        if (settings?.status === 'approved') {
          brandingConfig = {
            companyName: settings.company_name,
            tagline: settings.tagline,
            primaryColor: settings.primary_color,
            secondaryColor: settings.secondary_color,
            accentColor: settings.accent_color,
            logoUrl: settings.company_logo
          };
        }
      }

      return {
        isWhiteLabelActive: org.white_label_enabled && brandingConfig !== null,
        config: brandingConfig || {
          companyName: "NestMap",
          tagline: "",
          primaryColor: "#6D5DFB",
          secondaryColor: "#6D5DFB",
          accentColor: "#6D5DFB",
          logoUrl: null
        }
      };
    }),

  // Get comprehensive white label status
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const organizationId = ctx.user.organization_id || ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      // Get organization and white label settings in parallel
      const [org, [settings], domains] = await Promise.all([
        db
          .select({
            id: organizations.id,
            name: organizations.name,
            plan: organizations.plan,
            white_label_enabled: organizations.white_label_enabled,
            white_label_plan: organizations.white_label_plan
          })
          .from(organizations)
          .where(eq(organizations.id, organizationId)),
        
        db
          .select()
          .from(whiteLabelSettings)
          .where(eq(whiteLabelSettings.organization_id, organizationId))
          .limit(1),
        
        db
          .select()
          .from(customDomains)
          .where(eq(customDomains.organization_id, organizationId))
      ]);

      if (!org) throw new Error('Organization not found');

      // Determine status
      const isConfigured = !!settings;
      const hasDomain = domains.length > 0;
      const hasVerifiedDomain = domains.some(d => d.dns_verified && d.ssl_verified);
      const isActive = org.white_label_enabled && isConfigured;

      // Calculate completion
      const completionSteps = {
        subscription: ['pro', 'business', 'enterprise'].includes(org.plan || ''),
        branding: isConfigured,
        domain: hasDomain,
        domainVerification: hasVerifiedDomain,
        active: isActive
      };
      
      const totalSteps = Object.keys(completionSteps).length;
      const completedSteps = Object.values(completionSteps).filter(Boolean).length;
      const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

      // Helper function to determine next steps
      const getNextSteps = () => {
        if (!completionSteps.subscription) return ["Upgrade to Pro plan or higher"];
        if (!completionSteps.branding) return ["Configure your branding settings"];
        if (!completionSteps.domain) return ["Add a custom domain"];
        if (!completionSteps.domainVerification) return ["Complete domain verification"];
        if (!completionSteps.active) return ["Activate white label"];
        return ["White label is fully configured"];
      };

      return {
        organization: {
          id: org.id,
          name: org.name,
          plan: org.plan
        },
        whiteLabelStatus: {
          isEnabled: org.white_label_enabled,
          isConfigured,
          hasDomain,
          hasVerifiedDomain,
          isActive
        },
        completionSteps,
        completionPercentage,
        settings: settings || null,
        domains,
        nextSteps: getNextSteps()
      };
    })
});

export type WhiteLabelRouter = typeof whiteLabelRouter;
