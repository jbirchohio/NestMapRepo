import { duffelProvider } from './duffelProvider';

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
        name: "Kiwi Flights",
        urlTemplate: "https://www.kiwi.com/search?from={origin}&to={destination}&depart={departDate}&return={returnDate}",
        affiliate: "KW001",
        enabled: true
      }
    ],
    hotels: [
      {
        name: "Kiwi Hotels", 
        urlTemplate: "https://www.kiwi.com/hotels?city={city}&checkin={checkinDate}&checkout={checkoutDate}",
        affiliate: "KW001",
        enabled: true
      }
    ],
    activities: [
      {
        name: "GetYourGuide",
        urlTemplate: "https://www.getyourguide.com/s/?q={destination}&partner_id=GYENT001",
        affiliate: "GYENT001",
        enabled: true
      }
    ],
    default: {
      flights: "Kiwi Flights",
      hotels: "Kiwi Hotels", 
      activities: "GetYourGuide"
    }
  }
};

// Default configuration
const DEFAULT_BOOKING_CONFIG: BookingProviderConfig = {
  flights: [
    {
      name: "Kiwi Flights",
      urlTemplate: "https://www.kiwi.com/search?from={origin}&to={destination}&depart={departDate}&return={returnDate}",
      enabled: true
    }
  ],
  hotels: [
    {
      name: "Kiwi Hotels",
      urlTemplate: "https://www.kiwi.com/hotels?city={city}&checkin={checkinDate}&checkout={checkoutDate}",
      enabled: true
    }
  ],
  activities: [
    {
      name: "GetYourGuide",
      urlTemplate: "https://www.getyourguide.com/s/?q={destination}",
      enabled: true
    }
  ],
  default: {
    flights: "Kiwi Flights",
    hotels: "Kiwi Hotels",
    activities: "GetYourGuide"
  }
};

export function getBookingProviders(organizationId?: string): BookingProviderConfig {
  if (organizationId && ORGANIZATION_BOOKING_CONFIGS[organizationId]) {
    return ORGANIZATION_BOOKING_CONFIGS[organizationId];
  }
  return DEFAULT_BOOKING_CONFIG;
}

export function generateBookingUrl(
  type: 'flights' | 'hotels' | 'activities',
  provider: string,
  params: Record<string, string>,
  organizationId?: string
): string {
  const config = getBookingProviders(organizationId);
  const providerConfig = config[type].find(p => p.name === provider);
  
  if (!providerConfig) {
    throw new Error(`Provider ${provider} not found for ${type}`);
  }

  let url = providerConfig.urlTemplate;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  });

  return url;
}

/**
 * Search flights using Kiwi API
 */
export async function searchFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}): Promise<any[]> {
  try {
    const result = await duffelProvider.searchFlights({
      departure: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      passengers: params.passengers || 1
    });
    
    console.log('Duffel flight search completed for:', params.origin, '→', params.destination);
    return result.flights || [];
  } catch (error) {
    console.error('Duffel flight search error:', error);
    throw error;
  }
}

/**
 * Search hotels using Kiwi API
 */
export async function searchHotels(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
}): Promise<any[]> {
  try {
    const result = await duffelProvider.searchHotels({
      destination: params.destination,
      checkin: params.checkIn,
      checkout: params.checkOut,
      rooms: params.rooms || 1,
      guests: params.guests || 1
    });
    
    console.log('Duffel hotel search completed for:', params.destination);
    return result.hotels || [];
  } catch (error) {
    console.error('Duffel hotel search error:', error);
    throw error;
  }
}

/**
 * Search cars using Kiwi API
 */
export async function searchCars(params: {
  pickUpLocation: string;
  dropOffLocation: string;
  pickUpDate: string;
  dropOffDate: string;
}): Promise<any[]> {
  try {
    const result = await duffelProvider.searchCars(params);
    console.log('Duffel car search completed for:', params.pickUpLocation);
    return result.cars || [];
  } catch (error) {
    console.error('Duffel car search error:', error);
    throw error;
  }
}

export async function createBooking(params: {
  providerId: string;
  type: 'flight' | 'hotel' | 'activity';
  itemId: string;
  userDetails: any;
}): Promise<any> {
  return {
    bookingId: `booking-${Date.now()}`,
    status: "confirmed",
    type: params.type,
    itemId: params.itemId,
    confirmationCode: `CONF${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };
}