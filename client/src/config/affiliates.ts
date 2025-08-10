/**
 * Affiliate Configuration
 * 
 * Add your affiliate IDs and tracking codes here
 * These will be used throughout the app for monetization
 */

export const affiliateConfig = {
  expedia: {
    // Simple affiliate link
    baseUrl: 'https://expedia.com/affiliates/remvana/book',
    
    // Tracking settings
    enableTracking: true,
    trackingPrefix: 'remvana',
    enabled: true,
  },
  
  // Add other affiliate programs here
  booking: {
    affiliateId: 'YOUR_BOOKING_AFFILIATE_ID',
    enabled: false,
  },
  
  viator: {
    affiliateId: process.env.VITE_VIATOR_PARTNER_ID || '',
    enabled: !!process.env.VITE_VIATOR_PARTNER_ID,
  },
  
  // Amazon (for travel gear, books, etc.)
  amazon: {
    affiliateId: 'YOUR_AMAZON_ASSOCIATE_ID',
    enabled: false,
  }
};


// Helper to check if monetization is enabled
export function isMonetizationEnabled(): boolean {
  return affiliateConfig.expedia.enabled;
}