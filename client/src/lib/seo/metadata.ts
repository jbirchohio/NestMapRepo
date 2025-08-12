/**
 * SEO Metadata Generation System
 * Programmatically generates optimized meta tags for all pages
 */

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: any;
  noindex?: boolean;
}

// Base metadata for the app
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://remvana.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

// Title templates for different page types
const TITLE_TEMPLATES = {
  home: 'Remvana - AI Travel Planning & Booking | Save 22% on Packages',
  destination: '%s Travel Guide 2024 - Best Hotels, Flights & Activities | Remvana',
  activity: '%s in %s - Book Tours & Activities | Remvana',
  hotel: 'Hotels in %s - Compare Prices & Book | Remvana',
  package: '%s Flight + Hotel Packages - Save 22% | Remvana',
  trip: 'Plan Your %s Trip - AI Itinerary Builder | Remvana',
  blog: '%s - Remvana Travel Blog',
  compare: 'Remvana vs %s - Travel Planning App Comparison',
};

// Description templates
const DESCRIPTION_TEMPLATES = {
  home: 'Plan your perfect trip with AI-powered recommendations. Book flights, hotels, and activities in one place. Save 22% with vacation packages.',
  destination: 'Complete %s travel guide with AI recommendations. Find the best hotels, flights, activities, and local tips. Plan your %s trip in minutes.',
  activity: 'Book %s in %s with instant confirmation. Compare prices, read reviews, and save on top-rated tours and activities.',
  hotel: 'Compare %d+ hotels in %s. Best price guaranteed. Read real reviews and book with confidence.',
  package: 'Book flight + hotel packages to %s and save an average of 22%. AI-powered trip planning included free.',
  trip: 'Planning a trip to %s? Use our AI travel planner to create the perfect itinerary in minutes. Book everything in one place.',
  blog: '%s - Expert travel tips and destination guides from Remvana.',
  compare: 'See how Remvana compares to %s for travel planning. Feature comparison, pricing, and user reviews.',
};

// Generate metadata for different page types
export function generateMetadata(type: keyof typeof TITLE_TEMPLATES, params?: any): SEOMetadata {
  let title = TITLE_TEMPLATES[type];
  let description = DESCRIPTION_TEMPLATES[type];

  // Replace placeholders with actual values
  if (params) {
    if (params.destination) {
      title = title.replace(/%s/g, params.destination);
      description = description.replace(/%s/g, params.destination);
    }
    if (params.activity) {
      title = title.replace(/%s/, params.activity);
      description = description.replace(/%s/, params.activity);
    }
    if (params.count) {
      description = description.replace(/%d/, params.count);
    }
    if (params.competitor) {
      title = title.replace(/%s/g, params.competitor);
      description = description.replace(/%s/g, params.competitor);
    }
  }

  // Generate keywords based on page type
  const keywords = generateKeywords(type, params);

  // Generate canonical URL
  const canonicalUrl = generateCanonicalUrl(type, params);

  // Generate structured data
  const structuredData = generateStructuredData(type, params);

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    structuredData,
    ogImage: params?.ogImage || DEFAULT_OG_IMAGE,
  };
}

// Generate relevant keywords for each page type
function generateKeywords(type: string, params?: any): string[] {
  const baseKeywords = ['travel planning', 'trip planner', 'vacation packages', 'AI travel'];

  switch (type) {
    case 'destination':
      return [
        ...baseKeywords,
        `${params?.destination} travel`,
        `${params?.destination} tourism`,
        `${params?.destination} vacation`,
        `things to do in ${params?.destination}`,
        `${params?.destination} travel guide`,
        `${params?.destination} hotels`,
        `${params?.destination} flights`,
      ];
    case 'hotel':
      return [
        `hotels in ${params?.destination}`,
        `${params?.destination} accommodation`,
        `cheap hotels ${params?.destination}`,
        `best hotels ${params?.destination}`,
        `${params?.destination} hotel deals`,
      ];
    case 'package':
      return [
        `${params?.destination} vacation packages`,
        `${params?.destination} flight hotel deals`,
        `${params?.destination} package deals`,
        `cheap flights and hotels ${params?.destination}`,
      ];
    default:
      return baseKeywords;
  }
}

// Generate canonical URLs
function generateCanonicalUrl(type: string, params?: any): string {
  switch (type) {
    case 'destination':
      return `${BASE_URL}/destinations/${params?.destination?.toLowerCase().replace(/\s+/g, '-')}`;
    case 'hotel':
      return `${BASE_URL}/hotels/${params?.destination?.toLowerCase().replace(/\s+/g, '-')}`;
    case 'package':
      return `${BASE_URL}/packages/${params?.destination?.toLowerCase().replace(/\s+/g, '-')}`;
    case 'trip':
      return `${BASE_URL}/trips/${params?.tripId}`;
    default:
      return BASE_URL;
  }
}

// Generate structured data based on page type
function generateStructuredData(type: string, params?: any): any {
  const baseOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Remvana",
    "url": BASE_URL,
    "logo": `${BASE_URL}/logo.png`,
    "sameAs": [
      "https://twitter.com/remvana",
      "https://facebook.com/remvana",
      "https://instagram.com/remvana"
    ]
  };

  switch (type) {
    case 'home':
      return {
        "@context": "https://schema.org",
        "@graph": [
          baseOrganization,
          {
            "@type": "WebSite",
            "url": BASE_URL,
            "name": "Remvana",
            "description": "AI-powered travel planning and booking platform",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${BASE_URL}/search?q={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          }
        ]
      };

    case 'destination':
      return {
        "@context": "https://schema.org",
        "@type": "TravelGuide",
        "name": `${params?.destination} Travel Guide`,
        "description": `Complete travel guide to ${params?.destination}`,
        "author": baseOrganization,
        "aggregateRating": params?.rating ? {
          "@type": "AggregateRating",
          "ratingValue": params.rating,
          "reviewCount": params.reviewCount || 100
        } : undefined
      };

    case 'package':
      return {
        "@context": "https://schema.org",
        "@type": "TravelAction",
        "name": `${params?.destination} Vacation Package`,
        "description": `Flight and hotel package to ${params?.destination}`,
        "provider": baseOrganization,
        "potentialAction": {
          "@type": "ReserveAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${BASE_URL}/packages/${params?.destination?.toLowerCase().replace(/\s+/g, '-')}/book`
          }
        }
      };

    default:
      return baseOrganization;
  }
}

// Helper to generate FAQ schema
export function generateFAQSchema(faqs: Array<{question: string, answer: string}>): any {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// Helper to generate breadcrumb schema
export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>): any {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}