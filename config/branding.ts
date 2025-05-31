/**
 * Consolidated Branding Configuration
 * Enterprise-ready white-label system with dynamic fallbacks
 */

interface BrandingConfig {
  appName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail: string;
  helpUrl: string;
  privacyUrl: string;
  termsUrl: string;
  domain?: string;
}

interface OrganizationBranding {
  [orgId: string]: BrandingConfig;
}

/**
 * Default branding configuration
 * Uses environment variables for easy deployment customization
 */
const DEFAULT_BRANDING: BrandingConfig = {
  appName: process.env.DEFAULT_BRAND_NAME || "NestMap",
  tagline: process.env.DEFAULT_TAGLINE || "AI-Powered Travel Planning",
  logo: process.env.DEFAULT_LOGO_URL || "/logo.svg",
  favicon: process.env.DEFAULT_FAVICON_URL || "/favicon.ico",
  primaryColor: process.env.DEFAULT_PRIMARY_COLOR || "#3B82F6",
  secondaryColor: process.env.DEFAULT_SECONDARY_COLOR || "#64748B", 
  accentColor: process.env.DEFAULT_ACCENT_COLOR || "#10B981",
  supportEmail: process.env.DEFAULT_SUPPORT_EMAIL || "support@nestmap.com",
  helpUrl: process.env.DEFAULT_HELP_URL || "/help",
  privacyUrl: process.env.DEFAULT_PRIVACY_URL || "/privacy",
  termsUrl: process.env.DEFAULT_TERMS_URL || "/terms"
};

/**
 * Organization-specific branding overrides
 * This would typically be loaded from database in production
 */
const ORGANIZATION_BRANDING: OrganizationBranding = {
  // Example white-label configurations
  "travel-agency-1": {
    appName: "TravelPro Plus",
    tagline: "Professional Travel Management",
    logo: "/brands/travelpro/logo.svg",
    favicon: "/brands/travelpro/favicon.ico",
    primaryColor: "#E11D48",
    secondaryColor: "#7C2D12",
    accentColor: "#DC2626",
    supportEmail: "support@travelpro.com",
    helpUrl: "https://help.travelpro.com",
    privacyUrl: "https://travelpro.com/privacy",
    termsUrl: "https://travelpro.com/terms"
  },
  "corporate-client-1": {
    appName: "Enterprise Travel Hub",
    tagline: "Streamlined Business Travel",
    logo: "/brands/enterprise/logo.svg", 
    favicon: "/brands/enterprise/favicon.ico",
    primaryColor: "#1E40AF",
    secondaryColor: "#374151",
    accentColor: "#059669",
    supportEmail: "travel-support@enterprise.com",
    helpUrl: "https://intranet.enterprise.com/travel",
    privacyUrl: "https://enterprise.com/privacy",
    termsUrl: "https://enterprise.com/terms"
  }
};

/**
 * Get branding configuration for organization or domain
 */
export function getBrandingConfig(
  orgId?: number | string | null, 
  domain?: string
): BrandingConfig {
  // Try organization-specific branding first
  if (orgId && ORGANIZATION_BRANDING[orgId.toString()]) {
    return ORGANIZATION_BRANDING[orgId.toString()];
  }
  
  // Try domain-based lookup
  if (domain) {
    const domainBranding = Object.values(ORGANIZATION_BRANDING)
      .find(config => config.domain === domain);
    if (domainBranding) {
      return domainBranding;
    }
  }
  
  // Fallback to default branding
  return DEFAULT_BRANDING;
}

/**
 * Set custom branding for organization
 */
export function setBrandingConfig(orgId: string, branding: Partial<BrandingConfig>): void {
  ORGANIZATION_BRANDING[orgId] = {
    ...DEFAULT_BRANDING,
    ...branding
  };
}

/**
 * Generate CSS variables for dynamic theming
 */
export function getBrandingCSSVariables(branding: BrandingConfig): Record<string, string> {
  return {
    '--color-primary': branding.primaryColor,
    '--color-secondary': branding.secondaryColor,
    '--color-accent': branding.accentColor,
    '--brand-name': `"${branding.appName}"`,
    '--brand-tagline': `"${branding.tagline}"`
  };
}

/**
 * Generate meta tags for SEO and social sharing
 */
export function generateMetaTags(branding: BrandingConfig, currentPath: string = '/'): {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
} {
  const pageTitle = getPageTitle(currentPath, branding.appName);
  
  return {
    title: pageTitle,
    description: `${branding.tagline} - Plan your perfect trip with ${branding.appName}`,
    ogTitle: pageTitle,
    ogDescription: `Experience seamless travel planning with ${branding.appName}. ${branding.tagline}`,
    ogImage: branding.logo
  };
}

/**
 * Get dynamic page title based on current route
 */
function getPageTitle(path: string, appName: string): string {
  const pathToTitle: Record<string, string> = {
    '/': `${appName} - AI-Powered Travel Planning`,
    '/dashboard': `Dashboard - ${appName}`,
    '/trips': `My Trips - ${appName}`,
    '/analytics': `Analytics - ${appName}`,
    '/settings': `Settings - ${appName}`,
    '/billing': `Billing - ${appName}`,
    '/team': `Team Management - ${appName}`
  };
  
  return pathToTitle[path] || `${appName}`;
}

/**
 * Replace hardcoded brand references in content
 */
export function replaceBrandReferences(content: string, branding: BrandingConfig): string {
  return content
    .replace(/\bNestMap\b/g, branding.appName)
    .replace(/\bsupport@nestmap\.com\b/g, branding.supportEmail)
    .replace(/\bnestmap\.com\b/g, branding.domain || 'your-domain.com');
}

/**
 * Get brand-aware email templates
 */
export function getBrandedEmailTemplate(
  templateType: 'welcome' | 'invitation' | 'reset',
  branding: BrandingConfig
): { subject: string; template: string } {
  const templates = {
    welcome: {
      subject: `Welcome to ${branding.appName}!`,
      template: `
        <h1>Welcome to ${branding.appName}</h1>
        <p>${branding.tagline}</p>
        <p>Start planning your perfect trip today.</p>
        <p>Need help? Contact us at ${branding.supportEmail}</p>
      `
    },
    invitation: {
      subject: `You're invited to join ${branding.appName}`,
      template: `
        <h1>Join ${branding.appName}</h1>
        <p>You've been invited to collaborate on travel planning.</p>
        <p>Visit ${branding.helpUrl} for more information.</p>
      `
    },
    reset: {
      subject: `Reset your ${branding.appName} password`,
      template: `
        <h1>Password Reset - ${branding.appName}</h1>
        <p>Click the link below to reset your password.</p>
        <p>Contact ${branding.supportEmail} if you need assistance.</p>
      `
    }
  };
  
  return templates[templateType];
}

export { DEFAULT_BRANDING, ORGANIZATION_BRANDING };
export type { BrandingConfig, OrganizationBranding };