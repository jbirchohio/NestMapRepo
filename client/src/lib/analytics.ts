// Google Analytics helper functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize gtag function if it doesn't exist (for development)
if (typeof window !== 'undefined' && !window.gtag) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
}

export const analytics = {
  // Track page views
  trackPageView: (path: string, title?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
      });
    }
  },

  // Track custom events
  trackEvent: (eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters);
    }
  },

  // Track trip creation
  trackTripCreated: (tripId: number, destination?: string) => {
    analytics.trackEvent('trip_created', {
      event_category: 'engagement',
      event_label: destination,
      value: tripId,
    });
  },

  // Track template purchase
  trackTemplatePurchase: (templateId: number, price: number, templateName?: string) => {
    analytics.trackEvent('purchase', {
      event_category: 'ecommerce',
      currency: 'USD',
      value: price,
      items: [{
        item_id: templateId,
        item_name: templateName,
        price: price,
        quantity: 1,
      }],
    });
  },

  // Track template view
  trackTemplateView: (templateId: number, templateName?: string) => {
    analytics.trackEvent('view_item', {
      event_category: 'engagement',
      currency: 'USD',
      items: [{
        item_id: templateId,
        item_name: templateName,
      }],
    });
  },

  // Track user signup
  trackSignup: (method: string = 'email') => {
    analytics.trackEvent('sign_up', {
      event_category: 'engagement',
      method: method,
    });
  },

  // Track user login
  trackLogin: (method: string = 'email') => {
    analytics.trackEvent('login', {
      event_category: 'engagement',
      method: method,
    });
  },

  // Track search
  trackSearch: (searchTerm: string, searchType: 'destination' | 'template' | 'activity') => {
    analytics.trackEvent('search', {
      event_category: 'engagement',
      search_term: searchTerm,
      search_type: searchType,
    });
  },

  // Track share action
  trackShare: (contentType: 'trip' | 'template', method: string = 'link') => {
    analytics.trackEvent('share', {
      event_category: 'engagement',
      content_type: contentType,
      method: method,
    });
  },

  // Track activity booking click
  trackActivityBooking: (activityName: string, provider: string = 'viator') => {
    analytics.trackEvent('activity_booking_click', {
      event_category: 'engagement',
      event_label: activityName,
      provider: provider,
    });
  },

  // Track AI feature usage
  trackAIUsage: (feature: string) => {
    analytics.trackEvent('ai_feature_used', {
      event_category: 'engagement',
      event_label: feature,
    });
  },
};