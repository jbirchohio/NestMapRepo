interface BrandingConfig {
  appName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  favicon: string;
  description: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  helpUrl: string;
  domain?: string;
}

interface OrganizationBranding {
  [orgId: string]: BrandingConfig;
}

// Organization-specific branding configurations
const ORGANIZATION_BRANDING: OrganizationBranding = {
  "enterprise": {
    appName: "TravelPro Enterprise",
    logo: "/api/branding/enterprise/logo.svg",
    primaryColor: "#1e40af",
    secondaryColor: "#3b82f6",
    accentColor: "#f59e0b",
    favicon: "/api/branding/enterprise/favicon.ico",
    description: "Enterprise travel management platform for seamless business trip planning and optimization",
    supportEmail: "support@travelpro-enterprise.com",
    privacyUrl: "https://travelpro-enterprise.com/privacy",
    termsUrl: "https://travelpro-enterprise.com/terms",
    helpUrl: "https://help.travelpro-enterprise.com"
  },
  "travel_agency": {
    appName: "AgencyPro",
    logo: "/api/branding/agency/logo.svg",
    primaryColor: "#059669",
    secondaryColor: "#10b981",
    accentColor: "#f97316",
    favicon: "/api/branding/agency/favicon.ico",
    description: "Professional travel agency platform for creating exceptional client experiences",
    supportEmail: "support@agencypro.com",
    privacyUrl: "https://agencypro.com/privacy",
    termsUrl: "https://agencypro.com/terms",
    helpUrl: "https://help.agencypro.com"
  },
  "luxury_travel": {
    appName: "LuxeTrips",
    logo: "/api/branding/luxury/logo.svg",
    primaryColor: "#7c2d12",
    secondaryColor: "#dc2626",
    accentColor: "#fbbf24",
    favicon: "/api/branding/luxury/favicon.ico",
    description: "Exclusive luxury travel experiences curated for discerning travelers",
    supportEmail: "concierge@luxetrips.com",
    privacyUrl: "https://luxetrips.com/privacy",
    termsUrl: "https://luxetrips.com/terms",
    helpUrl: "https://concierge.luxetrips.com"
  }
};

// Default branding fallback
const DEFAULT_BRANDING: BrandingConfig = {
  appName: "Remvana",
  logo: "/logo.svg",
  primaryColor: "#2563eb",
  secondaryColor: "#3b82f6",
  accentColor: "#f59e0b",
  favicon: "/favicon.ico",
  description: "AI-powered travel planning platform for seamless trip management",
  supportEmail: "support@remvana.com",
  privacyUrl: "https://remvana.com/privacy",
  termsUrl: "https://remvana.com/terms",
  helpUrl: "https://help.remvana.com"
};

/**
 * Get branding configuration for an organization or domain
 * @param orgId Organization ID or identifier
 * @param domain Optional domain for domain-based branding lookup
 * @returns BrandingConfig
 */
export function getBrandingConfig(orgId?: number | string | null, domain?: string): BrandingConfig {
  // Try domain-based lookup first if domain is provided
  if (domain) {
    for (const [key, config] of Object.entries(ORGANIZATION_BRANDING)) {
      if (config.domain === domain) {
        return config;
      }
    }
  }
  
  // Try organization ID lookup
  if (orgId) {
    const orgKey = orgId.toString();
    if (ORGANIZATION_BRANDING[orgKey]) {
      return ORGANIZATION_BRANDING[orgKey];
    }
    
    // Check for partial matches
    for (const [key, config] of Object.entries(ORGANIZATION_BRANDING)) {
      if (key.includes(orgKey) || orgKey.includes(key)) {
        return config;
      }
    }
  }
  
  return DEFAULT_BRANDING;
}

/**
 * Set custom branding for an organization
 * @param orgId Organization identifier
 * @param branding Branding configuration
 */
export function setBrandingConfig(orgId: string, branding: BrandingConfig): void {
  ORGANIZATION_BRANDING[orgId] = branding;
}

/**
 * Get CSS variables for dynamic theming
 * @param branding Branding configuration
 * @returns CSS variables object
 */
export function getBrandingCSSVariables(branding: BrandingConfig): Record<string, string> {
  return {
    '--primary-color': branding.primaryColor,
    '--secondary-color': branding.secondaryColor,
    '--accent-color': branding.accentColor,
    '--app-name': `"${branding.appName}"`,
  };
}

/**
 * Generate meta tags for the application
 * @param branding Branding configuration
 * @param currentPath Current page path for dynamic titles
 * @returns Meta tags object
 */
export function generateMetaTags(branding: BrandingConfig, currentPath: string = '/'): {
  title: string;
  description: string;
  favicon: string;
  ogTitle: string;
  ogDescription: string;
} {
  const pageTitle = getPageTitle(currentPath, branding.appName);
  
  return {
    title: pageTitle,
    description: branding.description,
    favicon: branding.favicon,
    ogTitle: pageTitle,
    ogDescription: branding.description
  };
}

/**
 * Get dynamic page title based on path
 * @param path Current page path
 * @param appName Application name
 * @returns Formatted page title
 */
function getPageTitle(path: string, appName: string): string {
  const pathTitles: Record<string, string> = {
    '/': `${appName} - AI-Powered Travel Planning`,
    '/trips': `My Trips - ${appName}`,
    '/templates': `Trip Templates - ${appName}`,
    '/analytics': `Analytics Dashboard - ${appName}`,
    '/admin': `Admin Dashboard - ${appName}`,
    '/settings': `Settings - ${appName}`,
    '/enterprise': `Enterprise Dashboard - ${appName}`
  };
  
  return pathTitles[path] || `${appName}`;
}