interface BookingProvider {
  name: string;
  urlTemplate: string;
  affiliate?: string;
  enabled: boolean;
}

interface BookingProviderConfig {
  flights: BookingProvider[];
  hotels: BookingProvider[];
  activities: BookingProvider[];
  default: {
    flights: string;
    hotels: string;
    activities: string;
  };
}

interface OrganizationBookingConfig {
  [orgId: string]: BookingProviderConfig;
}

// Organization-specific booking provider configurations
const ORGANIZATION_BOOKING_CONFIGS: OrganizationBookingConfig = {
  "enterprise": {
    flights: [
      {
        name: "Corporate Travel Portal",
        urlTemplate: "https://corporate-travel.enterprise.com/flights?from={origin}&to={destination}&date={departDate}&return={returnDate}",
        affiliate: "ENT001",
        enabled: true
      },
      {
        name: "Expedia for Business",
        urlTemplate: "https://www.expediapartner.com/flights?origin={origin}&destination={destination}&depart={departDate}&return={returnDate}&ref=ENT001",
        affiliate: "ENT001",
        enabled: true
      }
    ],
    hotels: [
      {
        name: "Corporate Hotels",
        urlTemplate: "https://corporate-travel.enterprise.com/hotels?city={city}&checkin={checkinDate}&checkout={checkoutDate}",
        affiliate: "ENT001",
        enabled: true
      },
      {
        name: "Booking.com for Business",
        urlTemplate: "https://www.booking.com/searchresults.html?ss={city}&checkin={checkinDate}&checkout={checkoutDate}&aid=ENT001",
        affiliate: "ENT001",
        enabled: true
      }
    ],
    activities: [
      {
        name: "Viator Business",
        urlTemplate: "https://www.viator.com/tours/{city}?pid=ENT001",
        affiliate: "ENT001",
        enabled: true
      }
    ],
    default: {
      flights: "corporate-travel",
      hotels: "corporate-travel",
      activities: "viator"
    }
  },
  "travel_agency": {
    flights: [
      {
        name: "Amadeus GDS",
        urlTemplate: "https://agency-portal.amadeus.com/flights?from={origin}&to={destination}&date={departDate}&return={returnDate}&agent=AG001",
        affiliate: "AG001",
        enabled: true
      },
      {
        name: "Sabre Red",
        urlTemplate: "https://red.sabre.com/flights?origin={origin}&destination={destination}&depart={departDate}&return={returnDate}&pcc=AG001",
        affiliate: "AG001",
        enabled: true
      }
    ],
    hotels: [
      {
        name: "Expedia TAAP",
        urlTemplate: "https://www.expediataap.com/hotels?city={city}&checkin={checkinDate}&checkout={checkoutDate}&tpid=AG001",
        affiliate: "AG001",
        enabled: true
      },
      {
        name: "Booking.com Partner",
        urlTemplate: "https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html?city={city}&checkin={checkinDate}&checkout={checkoutDate}&aid=AG001",
        affiliate: "AG001",
        enabled: true
      }
    ],
    activities: [
      {
        name: "GetYourGuide Partner",
        urlTemplate: "https://partner.getyourguide.com/activities/{city}?partner_id=AG001",
        affiliate: "AG001",
        enabled: true
      },
      {
        name: "Viator Partner",
        urlTemplate: "https://www.viator.com/partner/tours/{city}?pid=AG001",
        affiliate: "AG001",
        enabled: true
      }
    ],
    default: {
      flights: "amadeus",
      hotels: "expedia-taap",
      activities: "getyourguide"
    }
  },
  "luxury_travel": {
    flights: [
      {
        name: "NetJets",
        urlTemplate: "https://www.netjets.com/en-us/book-flight?from={origin}&to={destination}&date={departDate}&return={returnDate}&ref=LUX001",
        affiliate: "LUX001",
        enabled: true
      },
      {
        name: "Emirates Business",
        urlTemplate: "https://www.emirates.com/us/english/booking/flight-selection/?origin={origin}&destination={destination}&departureDate={departDate}&returnDate={returnDate}&class=business&promo=LUX001",
        affiliate: "LUX001",
        enabled: true
      }
    ],
    hotels: [
      {
        name: "Preferred Hotels",
        urlTemplate: "https://www.preferredhotels.com/hotels?destination={city}&arrival={checkinDate}&departure={checkoutDate}&promo=LUX001",
        affiliate: "LUX001",
        enabled: true
      },
      {
        name: "Leading Hotels",
        urlTemplate: "https://www.lhw.com/hotels?destination={city}&checkin={checkinDate}&checkout={checkoutDate}&ref=LUX001",
        affiliate: "LUX001",
        enabled: true
      }
    ],
    activities: [
      {
        name: "Black Tomato",
        urlTemplate: "https://blacktomato.com/experiences/{city}?ref=LUX001",
        affiliate: "LUX001",
        enabled: true
      },
      {
        name: "Scott Dunn",
        urlTemplate: "https://www.scottdunn.com/luxury-holidays/{city}?ref=LUX001",
        affiliate: "LUX001",
        enabled: true
      }
    ],
    default: {
      flights: "emirates",
      hotels: "preferred",
      activities: "black-tomato"
    }
  }
};

// Default fallback booking providers
const DEFAULT_BOOKING_CONFIG: BookingProviderConfig = {
  flights: [
    {
      name: "Expedia",
      urlTemplate: "https://www.expedia.com/Flights?flight-type=on&trip=roundtrip&leg1=from:{origin},to:{destination},departure:{departDate}&leg2=from:{destination},to:{origin},departure:{returnDate}",
      enabled: true
    },
    {
      name: "Kayak",
      urlTemplate: "https://www.kayak.com/flights/{origin}-{destination}/{departDate}/{returnDate}",
      enabled: true
    }
  ],
  hotels: [
    {
      name: "Booking.com",
      urlTemplate: "https://www.booking.com/searchresults.html?ss={city}&checkin={checkinDate}&checkout={checkoutDate}",
      enabled: true
    },
    {
      name: "Hotels.com",
      urlTemplate: "https://www.hotels.com/search.do?destination={city}&startDate={checkinDate}&endDate={checkoutDate}",
      enabled: true
    }
  ],
  activities: [
    {
      name: "Viator",
      urlTemplate: "https://www.viator.com/tours/{city}",
      enabled: true
    },
    {
      name: "GetYourGuide",
      urlTemplate: "https://www.getyourguide.com/s/?q={city}",
      enabled: true
    }
  ],
  default: {
    flights: "expedia",
    hotels: "booking",
    activities: "viator"
  }
};

/**
 * Get booking provider configuration for an organization
 * @param orgId Organization ID or identifier
 * @returns BookingProviderConfig
 */
export function getBookingProviderConfig(orgId?: number | string | null): BookingProviderConfig {
  if (orgId) {
    const orgKey = orgId.toString();
    
    // Direct match
    if (ORGANIZATION_BOOKING_CONFIGS[orgKey]) {
      return ORGANIZATION_BOOKING_CONFIGS[orgKey];
    }
    
    // Partial match
    for (const [key, config] of Object.entries(ORGANIZATION_BOOKING_CONFIGS)) {
      if (key.includes(orgKey) || orgKey.includes(key)) {
        return config;
      }
    }
  }
  
  return DEFAULT_BOOKING_CONFIG;
}

/**
 * Generate booking URL with dynamic parameters
 * @param orgId Organization ID
 * @param type Booking type (flights, hotels, activities)
 * @param provider Provider name (optional, uses default if not specified)
 * @param params Booking parameters
 * @returns Generated booking URL
 */
export function generateBookingUrl(
  orgId: number | string | null,
  type: 'flights' | 'hotels' | 'activities',
  params: Record<string, string>,
  provider?: string
): string {
  const config = getBookingProviderConfig(orgId);
  const providers = config[type];
  
  // Find the specified provider or use the first enabled one
  let selectedProvider = providers.find(p => p.enabled);
  
  if (provider) {
    const namedProvider = providers.find(p => 
      p.name.toLowerCase().includes(provider.toLowerCase()) && p.enabled
    );
    if (namedProvider) {
      selectedProvider = namedProvider;
    }
  }
  
  if (!selectedProvider) {
    // Fallback to default providers
    const defaultConfig = DEFAULT_BOOKING_CONFIG[type];
    selectedProvider = defaultConfig.find(p => p.enabled) || defaultConfig[0];
  }
  
  // Replace template variables with actual values
  let url = selectedProvider.urlTemplate;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(value));
  }
  
  return url;
}

/**
 * Set custom booking provider configuration for an organization
 * @param orgId Organization identifier
 * @param config Booking provider configuration
 */
export function setBookingProviderConfig(orgId: string, config: BookingProviderConfig): void {
  ORGANIZATION_BOOKING_CONFIGS[orgId] = config;
}

/**
 * Get available booking providers for display in UI
 * @param orgId Organization ID
 * @param type Booking type
 * @returns Array of enabled booking providers
 */
export function getAvailableProviders(
  orgId: number | string | null,
  type: 'flights' | 'hotels' | 'activities'
): BookingProvider[] {
  const config = getBookingProviderConfig(orgId);
  return config[type].filter(provider => provider.enabled);
}