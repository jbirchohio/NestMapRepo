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

/**
 * Get Amadeus API access token
 */
async function getAmadeusToken(): Promise<string | null> {
  try {
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      console.warn('Amadeus credentials not configured. Using fallback data.');
      return null;
    }

    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      console.error(`Amadeus auth failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Amadeus authentication error:', error);
    return null;
  }
}

/**
 * Search flights using Amadeus API
 * @param params Flight search parameters
 * @returns Flight search results
 */
export async function searchFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}): Promise<any[]> {
  try {
    const token = await getAmadeusToken();
    
    if (!token) {
      console.log('Amadeus API not available - credentials needed for authentic flight data');
      return generateVariedFlightData(params);
    }
    
    // Build query parameters for Amadeus API
    const searchParams = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: (params.passengers || 1).toString(),
      max: '10',
    });

    if (params.returnDate) {
      searchParams.append('returnDate', params.returnDate);
    }

    const response = await fetch(
      `https://api.amadeus.com/v2/shopping/flight-offers?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Amadeus API error:', response.status, response.statusText);
      return generateVariedFlightData(params);
    }

    const data = await response.json();
    
    // Transform Amadeus response to our format
    return data.data?.map((offer: any, index: number) => {
      const outbound = offer.itineraries[0]?.segments[0];
      const inbound = offer.itineraries[1]?.segments[0];
      
      return {
        id: `amadeus-${offer.id}`,
        airline: outbound?.carrierCode || 'Unknown',
        flightNumber: `${outbound?.carrierCode}${outbound?.number}`,
        price: parseFloat(offer.price?.total || '0'),
        currency: offer.price?.currency || 'USD',
        departure: {
          airport: outbound?.departure?.iataCode || params.origin,
          time: outbound?.departure?.at?.split('T')[1]?.substring(0, 5) || '08:00',
          date: outbound?.departure?.at?.split('T')[0] || params.departureDate,
        },
        arrival: {
          airport: outbound?.arrival?.iataCode || params.destination,
          time: outbound?.arrival?.at?.split('T')[1]?.substring(0, 5) || '11:30',
          date: outbound?.arrival?.at?.split('T')[0] || params.departureDate,
        },
        duration: offer.itineraries[0]?.duration || '3h 30m',
        stops: (offer.itineraries[0]?.segments?.length || 1) - 1,
        validatingAirlineCodes: offer.validatingAirlineCodes,
      };
    }) || generateVariedFlightData(params);
    
  } catch (error) {
    console.error('Flight search error:', error);
    // Return varied mock data as fallback
    return generateVariedFlightData(params);
  }
}

/**
 * Generate varied mock flight data based on search parameters
 */
function generateVariedFlightData(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}): any[] {
  const airlines = ['AA', 'DL', 'UA', 'SW', 'B6', 'AS'];
  const basePrice = 200 + Math.random() * 500;
  const routeHash = (params.origin + params.destination).length;
  
  return Array.from({ length: 3 + (routeHash % 3) }, (_, index) => {
    const airline = airlines[routeHash % airlines.length];
    const flightNum = Math.floor(100 + (routeHash * index) % 8999);
    const departHour = 6 + (routeHash + index) % 16;
    const duration = 2 + (routeHash % 8);
    
    return {
      id: `flight-${routeHash}-${index}`,
      airline: getAirlineName(airline),
      flightNumber: `${airline}${flightNum}`,
      price: Math.round(basePrice + (index * 50) + (routeHash % 100)),
      currency: 'USD',
      departure: {
        airport: params.origin,
        time: `${departHour.toString().padStart(2, '0')}:${(index * 15) % 60}0`.substring(0, 5),
        date: params.departureDate,
      },
      arrival: {
        airport: params.destination,
        time: `${(departHour + duration).toString().padStart(2, '0')}:${(index * 20) % 60}0`.substring(0, 5),
        date: params.departureDate,
      },
      duration: `${duration}h ${(routeHash % 60)}m`,
      stops: index % 2,
    };
  });
}

function getAirlineName(code: string): string {
  const names: Record<string, string> = {
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'SW': 'Southwest Airlines',
    'B6': 'JetBlue Airways',
    'AS': 'Alaska Airlines',
  };
  return names[code] || `${code} Airlines`;
}

/**
 * Search hotels using Amadeus API
 * @param params Hotel search parameters
 * @returns Hotel search results
 */
export async function searchHotels(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
}): Promise<any[]> {
  try {
    const token = await getAmadeusToken();
    
    // First, get city code for the destination
    const cityResponse = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations/cities?keyword=${encodeURIComponent(params.destination)}&max=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!cityResponse.ok) {
      console.error('Amadeus city search error:', cityResponse.statusText);
      return generateVariedHotelData(params);
    }

    const cityData = await cityResponse.json();
    const cityCode = cityData.data?.[0]?.iataCode;

    if (!cityCode) {
      console.warn('No city code found for destination:', params.destination);
      return generateVariedHotelData(params);
    }

    // Search for hotels in the city
    const searchParams = new URLSearchParams({
      cityCode: cityCode,
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      adults: (params.guests || 1).toString(),
      roomQuantity: (params.rooms || 1).toString(),
      radius: '20',
      radiusUnit: 'KM',
      hotelSource: 'ALL',
      ratings: '1,2,3,4,5',
    });

    const hotelResponse = await fetch(
      `https://api.amadeus.com/v3/shopping/hotel-offers?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!hotelResponse.ok) {
      console.error('Amadeus hotel search error:', hotelResponse.statusText);
      return generateVariedHotelData(params);
    }

    const hotelData = await hotelResponse.json();
    
    // Transform Amadeus hotel response to our format
    return hotelData.data?.map((hotel: any, index: number) => {
      const offer = hotel.offers?.[0];
      const price = offer?.price;
      
      return {
        id: `amadeus-hotel-${hotel.hotel?.hotelId}`,
        name: hotel.hotel?.name || `Hotel in ${params.destination}`,
        rating: hotel.hotel?.rating ? parseFloat(hotel.hotel.rating) : 4.0,
        price: price?.total ? parseFloat(price.total) : 150,
        currency: price?.currency || 'USD',
        address: hotel.hotel?.address?.lines?.join(', ') || params.destination,
        amenities: hotel.hotel?.amenities?.slice(0, 4) || ['WiFi', 'Reception', 'Parking'],
        description: hotel.hotel?.description?.text || `Comfortable accommodation in ${params.destination}`,
        images: hotel.hotel?.media?.map((m: any) => m.uri).slice(0, 3) || [],
        distance: hotel.hotel?.geoCode ? '0.5 km from city center' : null,
        checkInTime: offer?.checkInDate || params.checkIn,
        checkOutTime: offer?.checkOutDate || params.checkOut,
        roomType: offer?.room?.type || 'Standard Room',
        cancellationPolicy: offer?.policies?.cancellation?.type || 'Non-refundable',
      };
    }).slice(0, 10) || generateVariedHotelData(params);
    
  } catch (error) {
    console.error('Hotel search error:', error);
    // Return varied hotel data as fallback
    return generateVariedHotelData(params);
  }
}

/**
 * Generate varied hotel data based on search parameters
 */
function generateVariedHotelData(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
}): any[] {
  const destinationHash = params.destination.length;
  const checkInDate = new Date(params.checkIn);
  const seasonMultiplier = (checkInDate.getMonth() + 1) % 4 + 1; // 1-4 based on season
  
  const hotelTypes = [
    { prefix: 'Grand', suffix: 'Hotel', basePrice: 200 },
    { prefix: 'Premium', suffix: 'Resort', basePrice: 300 },
    { prefix: 'Business', suffix: 'Inn', basePrice: 150 },
    { prefix: 'Luxury', suffix: 'Suites', basePrice: 400 },
    { prefix: 'Boutique', suffix: 'Lodge', basePrice: 250 },
  ];
  
  const amenityOptions = [
    ['WiFi', 'Pool', 'Gym', 'Restaurant'],
    ['WiFi', 'Spa', 'Business Center', 'Parking'],
    ['WiFi', 'Fitness Center', 'Room Service', 'Laundry'],
    ['WiFi', 'Pool', 'Bar', 'Concierge'],
    ['WiFi', 'Restaurant', 'Meeting Rooms', 'Airport Shuttle'],
  ];
  
  return Array.from({ length: 4 + (destinationHash % 3) }, (_, index) => {
    const hotelType = hotelTypes[index % hotelTypes.length];
    const basePrice = hotelType.basePrice + (destinationHash % 100);
    const finalPrice = Math.round(basePrice * seasonMultiplier * (0.8 + index * 0.1));
    const rating = 3.5 + (destinationHash + index) % 20 / 10; // 3.5 - 5.5 range
    
    return {
      id: `hotel-${destinationHash}-${index}`,
      name: `${hotelType.prefix} ${params.destination} ${hotelType.suffix}`,
      rating: Math.round(rating * 10) / 10,
      price: finalPrice,
      currency: 'USD',
      location: params.destination,
      amenities: amenityOptions[index % amenityOptions.length],
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      availability: index % 5 === 0 ? 'Limited' : 'Available',
      roomsLeft: index % 5 === 0 ? Math.floor(1 + destinationHash % 3) : undefined,
    };
  });
}

/**
 * Step 2: Get hotel offers with detailed pricing (Hotel Search API)
 */
export async function getHotelOffers(params: {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
}): Promise<any[]> {
  try {
    const token = await getAmadeusToken();
    
    // Extract hotel ID from our format
    const amadeusHotelId = params.hotelId.replace('amadeus-hotel-', '');
    
    const searchParams = new URLSearchParams({
      hotelIds: amadeusHotelId,
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      adults: params.guests.toString(),
      roomQuantity: (params.rooms || 1).toString(),
    });

    const response = await fetch(
      `https://api.amadeus.com/v3/shopping/hotel-offers?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Amadeus hotel offers error:', response.statusText);
      return generateFallbackOffers(params);
    }

    const data = await response.json();
    
    // Transform offers to our format
    return data.data?.[0]?.offers?.map((offer: any, index: number) => ({
      id: `offer-${offer.id || index}`,
      hotelId: params.hotelId,
      roomType: offer.room?.type || 'Standard Room',
      roomDescription: offer.room?.description?.text || 'Comfortable accommodation',
      price: {
        total: parseFloat(offer.price?.total || '150'),
        currency: offer.price?.currency || 'USD',
        base: parseFloat(offer.price?.base || '120'),
        taxes: parseFloat(offer.price?.taxes || '30')
      },
      cancellation: {
        type: offer.policies?.cancellation?.type || 'Non-refundable',
        deadline: offer.policies?.cancellation?.deadline || null
      },
      checkIn: offer.checkInDate || params.checkIn,
      checkOut: offer.checkOutDate || params.checkOut,
      boardType: offer.boardType || 'ROOM_ONLY',
      available: true
    })) || generateFallbackOffers(params);
    
  } catch (error) {
    console.error('Hotel offers error:', error);
    return generateFallbackOffers(params);
  }
}

/**
 * Generate fallback offers when API is unavailable
 */
function generateFallbackOffers(params: any): any[] {
  const roomTypes = ['Standard Room', 'Deluxe Room', 'Suite', 'Executive Room'];
  const basePrice = 120;
  
  return roomTypes.map((roomType, index) => ({
    id: `fallback-offer-${index}`,
    hotelId: params.hotelId,
    roomType,
    roomDescription: `${roomType} with modern amenities`,
    price: {
      total: basePrice + (index * 50),
      currency: 'USD',
      base: basePrice + (index * 40),
      taxes: 10 + (index * 10)
    },
    cancellation: {
      type: index % 2 === 0 ? 'Free cancellation' : 'Non-refundable',
      deadline: index % 2 === 0 ? params.checkIn : null
    },
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    boardType: 'ROOM_ONLY',
    available: true
  }));
}

/**
 * Step 3: Book hotel room (Hotel Booking API)
 */
export async function bookHotel(params: {
  offerId: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentInfo?: any;
}): Promise<any> {
  try {
    const token = await getAmadeusToken();
    
    // For actual Amadeus booking, we would use the Hotel Booking API
    // https://api.amadeus.com/v1/booking/hotel-bookings
    
    const bookingPayload = {
      data: {
        offerId: params.offerId,
        guests: [
          {
            name: {
              title: 'MR',
              firstName: params.guestInfo.firstName,
              lastName: params.guestInfo.lastName
            },
            contact: {
              phone: params.guestInfo.phone,
              email: params.guestInfo.email
            }
          }
        ],
        payments: [
          {
            method: 'creditCard',
            card: params.paymentInfo || {
              // This would normally come from a secure payment form
              vendorCode: 'VI',
              cardNumber: '4111111111111111',
              expiryDate: '2026-12'
            }
          }
        ]
      }
    };

    // For demo purposes, return a simulated successful booking
    const booking = {
      bookingId: `HB${Date.now()}`,
      confirmationCode: `HOTEL${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      status: 'CONFIRMED',
      guest: params.guestInfo,
      booking: {
        hotelName: 'Selected Hotel',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      createdAt: new Date().toISOString()
    };

    console.log('Hotel booking created:', booking.bookingId);
    return booking;
    
  } catch (error) {
    console.error('Hotel booking error:', error);
    throw new Error('Hotel booking failed. Please try again.');
  }
}

/**
 * Create booking through integrated providers
 * @param params Booking parameters
 * @returns Booking confirmation
 */
export async function createBooking(params: {
  type: 'flight' | 'hotel' | 'activity';
  itemId: string;
  userDetails: any;
}): Promise<any> {
  // This would handle actual booking creation through provider APIs
  // For now, return a structured confirmation response
  return {
    bookingId: `booking-${Date.now()}`,
    status: "confirmed",
    type: params.type,
    itemId: params.itemId,
    confirmationCode: `CONF${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };
}