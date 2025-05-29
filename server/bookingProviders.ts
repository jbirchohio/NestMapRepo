import OpenAI from "openai";

// Flight booking providers configuration
export const FLIGHT_PROVIDERS = {
  AMADEUS: {
    name: 'Amadeus',
    baseUrl: 'https://api.amadeus.com',
    features: ['flights', 'hotels', 'car-rental'],
    rateLimit: '1000/hour'
  },
  SKYSCANNER: {
    name: 'Skyscanner',
    baseUrl: 'https://partners.api.skyscanner.net',
    features: ['flights'],
    rateLimit: '2000/hour'
  },
  EXPEDIA: {
    name: 'Expedia',
    baseUrl: 'https://api.ean.com',
    features: ['flights', 'hotels', 'packages'],
    rateLimit: '5000/day'
  }
};

// Hotel booking providers configuration
export const HOTEL_PROVIDERS = {
  BOOKING_COM: {
    name: 'Booking.com',
    baseUrl: 'https://distribution-xml.booking.com',
    features: ['hotels', 'apartments'],
    rateLimit: '1000/hour'
  },
  HOTELS_COM: {
    name: 'Hotels.com',
    baseUrl: 'https://api.ean.com',
    features: ['hotels'],
    rateLimit: '2000/hour'
  },
  AGODA: {
    name: 'Agoda',
    baseUrl: 'https://affiliateapi7.agoda.com',
    features: ['hotels'],
    rateLimit: '1500/hour'
  }
};

interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabin: 'economy' | 'premium' | 'business' | 'first';
  directFlights?: boolean;
}

interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  starRating?: number;
  amenities?: string[];
}

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  cabin: string;
  availability: number;
  bookingUrl: string;
}

interface HotelResult {
  id: string;
  name: string;
  address: string;
  starRating: number;
  price: {
    amount: number;
    currency: string;
    per: 'night' | 'stay';
  };
  amenities: string[];
  images: string[];
  rating: {
    score: number;
    reviews: number;
  };
  cancellation: 'free' | 'paid' | 'non-refundable';
  bookingUrl: string;
}

// Flight search implementation
export async function searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  try {
    // In a real implementation, you would integrate with actual APIs
    // For now, we'll use AI to generate realistic flight options
    
    if (!process.env.AMADEUS_API_KEY && !process.env.SKYSCANNER_API_KEY) {
      // Generate AI-powered flight suggestions when API keys are not available
      return await generateAIFlightSuggestions(params);
    }

    // Example Amadeus API integration (requires API key)
    if (process.env.AMADEUS_API_KEY) {
      return await searchAmadeusFlights(params);
    }

    // Fallback to AI suggestions
    return await generateAIFlightSuggestions(params);
    
  } catch (error) {
    console.error('Flight search error:', error);
    throw new Error('Unable to search flights. Please check your API configuration.');
  }
}

// Hotel search implementation
export async function searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
  try {
    if (!process.env.BOOKING_API_KEY && !process.env.HOTELS_API_KEY) {
      // Generate AI-powered hotel suggestions when API keys are not available
      return await generateAIHotelSuggestions(params);
    }

    // Example Booking.com API integration (requires API key)
    if (process.env.BOOKING_API_KEY) {
      return await searchBookingComHotels(params);
    }

    // Fallback to AI suggestions
    return await generateAIHotelSuggestions(params);
    
  } catch (error) {
    console.error('Hotel search error:', error);
    throw new Error('Unable to search hotels. Please check your API configuration.');
  }
}

// AI-powered flight suggestions (when API keys not available)
async function generateAIFlightSuggestions(params: FlightSearchParams): Promise<FlightResult[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = `
  Generate realistic flight options for a trip:
  - From: ${params.origin}
  - To: ${params.destination}
  - Departure: ${params.departureDate}
  - Return: ${params.returnDate || 'One way'}
  - Passengers: ${params.passengers}
  - Cabin: ${params.cabin}
  
  Provide 5-8 realistic flight options with different airlines, times, and prices.
  Consider major airlines that actually serve these routes.
  
  Respond with JSON:
  {
    "flights": [
      {
        "id": "unique_id",
        "airline": "Airline Name",
        "flightNumber": "XX123",
        "origin": "${params.origin}",
        "destination": "${params.destination}",
        "departureTime": "2025-XX-XX 14:30",
        "arrivalTime": "2025-XX-XX 18:45",
        "duration": "4h 15m",
        "stops": 0,
        "price": {"amount": 450, "currency": "USD"},
        "cabin": "${params.cabin}",
        "availability": 8,
        "bookingUrl": "https://example.com/book/flight123"
      }
    ]
  }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.flights || [];
}

// AI-powered hotel suggestions (when API keys not available)
async function generateAIHotelSuggestions(params: HotelSearchParams): Promise<HotelResult[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = `
  Generate realistic hotel options for:
  - Destination: ${params.destination}
  - Check-in: ${params.checkIn}
  - Check-out: ${params.checkOut}
  - Guests: ${params.guests}
  - Rooms: ${params.rooms}
  
  Provide 6-10 realistic hotel options with different price ranges and amenities.
  Include luxury, mid-range, and budget options.
  
  Respond with JSON:
  {
    "hotels": [
      {
        "id": "unique_id",
        "name": "Hotel Name",
        "address": "Full address in ${params.destination}",
        "starRating": 4,
        "price": {"amount": 180, "currency": "USD", "per": "night"},
        "amenities": ["WiFi", "Pool", "Gym", "Breakfast"],
        "images": ["https://example.com/image1.jpg"],
        "rating": {"score": 8.5, "reviews": 1250},
        "cancellation": "free",
        "bookingUrl": "https://example.com/book/hotel123"
      }
    ]
  }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.hotels || [];
}

// Amadeus OAuth token function for flights
async function getAmadeusToken() {
  try {
    const authUrl = 'https://api.amadeus.com/v1/security/oauth2/token';
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&client_id=${process.env.AMADEUS_API_KEY}&client_secret=${process.env.AMADEUS_API_SECRET}`
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    } else {
      console.log("Failed to get Amadeus token:", response.status);
      return null;
    }
  } catch (error) {
    console.log("Amadeus authentication error:", error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function findAirportCode(cityOrCode: string): Promise<string | null> {
  try {
    // If already a 3-letter code, return as-is
    if (/^[A-Z]{3}$/.test(cityOrCode.toUpperCase())) {
      return cityOrCode.toUpperCase();
    }

    const token = await getAmadeusToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`https://api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${encodeURIComponent(cityOrCode)}&page%5Blimit%5D=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Airport search failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Find the best match (prefer major airports)
    if (data.data && data.data.length > 0) {
      // Sort by relevance and airport size
      const sortedAirports = data.data.sort((a: any, b: any) => {
        // Prefer airports with higher relevance
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        // Prefer larger airports (those with more detailed names usually)
        return (b.name?.length || 0) - (a.name?.length || 0);
      });

      return sortedAirports[0].iataCode;
    }

    return null;
  } catch (error) {
    console.error('Airport lookup error:', error);
    return null;
  }
}

// Amadeus API integration with proper authentication
async function searchAmadeusFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  try {
    if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
      throw new Error("Amadeus credentials not configured");
    }

    // Get OAuth token
    const token = await getAmadeusToken();
    if (!token) {
      throw new Error("Failed to authenticate with Amadeus");
    }

    // Convert city names to airport codes if needed
    let origin = params.origin?.toUpperCase().trim() || '';
    let destination = params.destination?.toUpperCase().trim() || '';
    
    // If not already 3-letter IATA codes, try to find airports
    if (!/^[A-Z]{3}$/.test(origin)) {
      const originAirport = await findAirportCode(origin);
      if (!originAirport) {
        throw new Error(`Could not find airport for origin: ${params.origin}`);
      }
      origin = originAirport;
    }
    
    if (!/^[A-Z]{3}$/.test(destination)) {
      const destinationAirport = await findAirportCode(destination);
      if (!destinationAirport) {
        throw new Error(`Could not find airport for destination: ${params.destination}`);
      }
      destination = destinationAirport;
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: params.departureDate,
      adults: params.passengers.toString(),
      max: '10',
      currencyCode: 'USD'
    });

    if (params.returnDate) {
      queryParams.append('returnDate', params.returnDate);
    }

    console.log(`Searching flights: ${origin} → ${destination} on ${params.departureDate}`);
    
    const response = await fetch(`https://api.amadeus.com/v2/shopping/flight-offers?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Amadeus flight search error:", response.status, errorText);
      throw new Error('Amadeus API request failed');
    }
    
    const data = await response.json();
    console.log(`Amadeus API returned ${data.data?.length || 0} flight offers`);
    
    if (!data.data || data.data.length === 0) {
      console.log("No flights found for the given criteria");
      return [];
    }
    
    return transformAmadeusResponse(data);
  } catch (error) {
    console.log("Flight search error:", error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Booking.com API integration (example implementation)
async function searchBookingComHotels(params: HotelSearchParams): Promise<HotelResult[]> {
  // This would be a real Booking.com API call
  const response = await fetch(`${HOTEL_PROVIDERS.BOOKING_COM.baseUrl}/json/bookings.searchHotels`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${process.env.BOOKING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    // Add actual Booking.com API parameters
  });
  
  if (!response.ok) {
    throw new Error('Booking.com API request failed');
  }
  
  const data = await response.json();
  // Transform Booking.com response to our HotelResult format
  return transformBookingComResponse(data);
}

// Helper functions to transform API responses
function transformAmadeusResponse(data: any): FlightResult[] {
  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((offer: any) => {
    const itinerary = offer.itineraries?.[0];
    const segment = itinerary?.segments?.[0];
    const price = offer.price;
    
    if (!segment || !price) return null;

    return {
      id: offer.id,
      airline: segment.carrierCode || 'Unknown',
      flightNumber: `${segment.carrierCode}${segment.number}` || 'N/A',
      origin: segment.departure?.iataCode || '',
      destination: segment.arrival?.iataCode || '',
      departureTime: segment.departure?.at || '',
      arrivalTime: segment.arrival?.at || '',
      duration: itinerary.duration || '',
      stops: (itinerary.segments?.length || 1) - 1,
      price: {
        amount: parseFloat(price.total) || 0,
        currency: price.currency || 'USD'
      },
      cabin: segment.cabin || 'ECONOMY',
      availability: offer.numberOfBookableSeats || 0,
      bookingUrl: `https://amadeus.com/booking/${offer.id}`
    };
  }).filter(Boolean);
}

function transformBookingComResponse(data: any): HotelResult[] {
  // Transform Booking.com API response format to our HotelResult interface
  return [];
}

// Booking management
export async function createBooking(type: 'flight' | 'hotel', bookingData: any): Promise<{
  bookingId: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmationNumber?: string;
  totalPrice: number;
  currency: string;
}> {
  try {
    // In a real implementation, this would call the provider's booking API
    // For now, we'll simulate a booking confirmation
    
    const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
    const confirmationNumber = `CNF${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    return {
      bookingId,
      status: 'confirmed',
      confirmationNumber,
      totalPrice: bookingData.price?.amount || 0,
      currency: bookingData.price?.currency || 'USD'
    };
    
  } catch (error) {
    console.error('Booking creation error:', error);
    throw new Error('Unable to create booking. Please try again.');
  }
}

export { FlightSearchParams, HotelSearchParams, FlightResult, HotelResult };