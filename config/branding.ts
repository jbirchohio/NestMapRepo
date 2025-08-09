// Branding configuration for consumer trip planning app
export const BRAND_CONFIG = {
  default: {
    name: "Remvana",
    logo: "/logo.svg",
    favicon: "/favicon.ico",
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    tagline: "Plan Your Perfect Trip",
    description: "Create beautiful itineraries and discover amazing travel templates",
    supportEmail: "support@remvana.com",
    helpUrl: "https://help.remvana.com",
    privacyUrl: "https://remvana.com/privacy",
    termsUrl: "https://remvana.com/terms"
  }
};

export function getBrandConfig() {
  return BRAND_CONFIG.default;
}