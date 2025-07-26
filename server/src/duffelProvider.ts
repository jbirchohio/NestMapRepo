interface DuffelFlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class?: string;
}

interface DuffelHotelSearchParams {
  location: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  rooms: number;
}

export class DuffelProvider {
  private baseUrl = 'https://api.duffel.com';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DUFFEL_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Duffel API key not configured - travel search will not work');
    }
  }

  async searchFlights(params: {
    departure: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
  }) {
    if (!this.apiKey) {
      throw new Error('Duffel API key not configured. Please provide API key.');
    }

    const searchParams = {
      data: {
        slices: [
          {
            origin: params.departure,
            destination: params.destination,
            departure_date: params.departureDate
          }
        ],
        passengers: Array(params.passengers).fill(0).map((_, i) => ({
          type: 'adult',
          id: `passenger_${i}`
        })),
        cabin_class: 'economy'
      }
    };

    if (params.returnDate) {
      searchParams.data.slices.push({
        origin: params.destination,
        destination: params.departure,
        departure_date: params.returnDate
      });
    }

    console.log('Duffel flight search for:', params.departure, '→', params.destination);

    try {
      const response = await fetch(`${this.baseUrl}/air/offer_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2'
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Duffel API error:', response.status, errorText);
        throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Duffel flight search response:', {
        requestId: data.data?.id,
        status: response.status
      });

      // Get the offers from the offer request
      if (data.data?.id) {
        return await this.getFlightOffers(data.data.id);
      }

      return this.transformFlightResults({ data: [] });
    } catch (error) {
      console.error('Error fetching flights from Duffel:', error);
      throw error;
    }
  }

  private async getFlightOffers(offerRequestId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/air/offers?offer_request_id=${offerRequestId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Duffel-Version': 'v2'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get offers: ${response.status}`);
      }

      const data = await response.json();
      return this.transformFlightResults(data);
    } catch (error) {
      console.error('Error getting flight offers:', error);
      return { flights: [] };
    }
  }

  async searchHotels(params: {
    destination: string;
    checkin: string;
    checkout: string;
    rooms: number;
    guests: number;
  }) {
    if (!this.apiKey) {
      throw new Error('Duffel API key not configured. Please provide API key.');
    }

    // First, we need to geocode the destination to get coordinates
    // For now, using approximate coordinates for major cities
    const cityCoordinates = this.getCityCoordinates(params.destination);
    
    const searchParams = {
      data: {
        check_in_date: params.checkin,
        check_out_date: params.checkout,
        location: {
          radius: 10,
          geographic_coordinates: cityCoordinates
        },
        rooms: params.rooms,
        guests: Array(params.guests).fill(0).map(() => ({ type: 'adult' }))
      }
    };

    console.log('Duffel hotel search for:', params.destination, 'from', params.checkin, 'to', params.checkout);

    try {
      const response = await fetch(`${this.baseUrl}/stays/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2'
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Duffel Stays API error:', response.status, errorText);
        throw new Error(`Duffel Stays API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Duffel hotel search response:', {
        searchId: data.data?.id,
        resultsCount: data.data?.search_results?.length || 0,
        status: response.status
      });

      return this.transformHotelResults(data);
    } catch (error) {
      console.error('Error fetching hotels from Duffel:', error);
      throw error;
    }
  }

  private getCityCoordinates(destination: string): { latitude: number; longitude: number } {
    // Basic city coordinate mapping - in production you'd use a geocoding service
    const cityMap: Record<string, { latitude: number; longitude: number }> = {
      'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
      'New York': { latitude: 40.7128, longitude: -74.0060 },
      'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
      'Chicago': { latitude: 41.8781, longitude: -87.6298 },
      'London': { latitude: 51.5074, longitude: -0.1278 },
      'Paris': { latitude: 48.8566, longitude: 2.3522 },
      'Tokyo': { latitude: 35.6762, longitude: 139.6503 },
      'Berlin': { latitude: 52.5200, longitude: 13.4050 },
      'Madrid': { latitude: 40.4168, longitude: -3.7038 },
      'Rome': { latitude: 41.9028, longitude: 12.4964 }
    };

    // Extract city name from destination string
    const cityKey = Object.keys(cityMap).find(city => 
      destination.toLowerCase().includes(city.toLowerCase())
    );

    return cityKey ? cityMap[cityKey] : { latitude: 37.7749, longitude: -122.4194 }; // Default to SF
  }

  private transformHotelResults(data: any) {
    if (!data.data?.search_results || !Array.isArray(data.data.search_results)) {
      return { hotels: [] };
    }

    const hotels = data.data.search_results.map((result: any, index: number) => {
      const accommodation = result.accommodation;
      const location = accommodation?.location;
      
      return {
        id: `duffel-hotel-${result.id || index}`,
        name: accommodation?.name || 'Hotel',
        starRating: accommodation?.star_rating || 0,
        rating: {
          score: accommodation?.guest_rating || 0,
          reviews: accommodation?.review_count || 0
        },
        price: {
          amount: Math.round(parseFloat(result.cheapest_rate_total_amount) || 0),
          currency: result.cheapest_rate_total_currency || 'USD',
          per: 'stay'
        },
        address: location?.address || '',
        location: {
          latitude: location?.geographic_coordinates?.latitude || 0,
          longitude: location?.geographic_coordinates?.longitude || 0
        },
        amenities: accommodation?.amenities?.map((a: any) => a.name) || [],
        images: accommodation?.photos?.map((photo: any) => photo.url) || [],
        description: accommodation?.description || '',
        checkIn: data.data.check_in_date,
        checkOut: data.data.check_out_date,
        cancellation: 'Varies by rate',
        searchResultId: result.id,
        ratesAvailable: result.rates?.length || 0
      };
    });

    return { hotels };
  }

  async searchCars(_params: {
    pickUpLocation: string;
    dropOffLocation: string;
    pickUpDate: string;
    dropOffDate: string;
  }) {
    // Duffel doesn't have car rentals API
    console.log('Duffel car search not available - Duffel focuses on flights');
    return { cars: [] };
  }

  private transformFlightResults(data: any) {
    if (!data.data || !Array.isArray(data.data)) {
      return { flights: [] };
    }

    const flights = data.data.map((offer: any, index: number) => {
      const slice = offer.slices?.[0];
      const segment = slice?.segments?.[0];

      return {
        id: `duffel-${offer.id || index}`,
        price: {
          amount: Math.round(parseFloat(offer.total_amount) || 0),
          currency: offer.total_currency || 'USD'
        },
        departure: {
          airport: {
            code: segment?.origin?.iata_code || '',
            name: segment?.origin?.name || '',
            city: segment?.origin?.city_name || '',
            country: segment?.origin?.country_name || ''
          },
          time: segment?.departing_at || new Date().toISOString()
        },
        arrival: {
          airport: {
            code: segment?.destination?.iata_code || '',
            name: segment?.destination?.name || '',
            city: segment?.destination?.city_name || '',
            country: segment?.destination?.country_name || ''
          },
          time: segment?.arriving_at || new Date().toISOString()
        },
        duration: segment?.duration || '0h 0m',
        stops: (slice?.segments?.length || 1) - 1,
        airline: {
          code: segment?.marketing_carrier?.iata_code || '',
          name: segment?.marketing_carrier?.name || 'Unknown Airline'
        },
        segments: slice?.segments?.map((seg: any) => ({
          departure: {
            airport: {
              code: seg.origin?.iata_code,
              name: seg.origin?.name,
              city: seg.origin?.city_name,
              country: seg.origin?.country_name
            },
            time: seg.departing_at
          },
          arrival: {
            airport: {
              code: seg.destination?.iata_code,
              name: seg.destination?.name,
              city: seg.destination?.city_name,
              country: seg.destination?.country_name
            },
            time: seg.arriving_at
          },
          airline: {
            code: seg.marketing_carrier?.iata_code,
            name: seg.marketing_carrier?.name
          },
          flight_number: seg.marketing_carrier_flight_number,
          duration: seg.duration
        })) || [],
        bookingToken: offer.id,
        validUntil: offer.expires_at
      };
    });

    return { flights };
  }

  async bookFlight(params: {
    bookingToken: string;
    passengers: any[];
    contactInfo: any;
  }) {
    if (!this.apiKey) {
      throw new Error('Duffel API key not configured');
    }

    // Duffel booking requires creating an order
    try {
      const bookingData = {
        data: {
          selected_offers: [params.bookingToken],
          passengers: params.passengers,
          type: 'instant'
        }
      };

      const response = await fetch(`${this.baseUrl}/air/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2'
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        throw new Error(`Booking failed: ${response.status} ${response.statusText}`);
      }

      const booking = await response.json();
      
      return {
        success: true,
        bookingReference: booking.data?.booking_reference || booking.data?.id,
        confirmationNumber: booking.data?.booking_reference || booking.data?.id,
        status: 'confirmed',
        bookingDetails: booking.data
      };
    } catch (error) {
      console.error('Duffel flight booking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Booking failed'
      };
    }
  }

  async bookHotel(params: {
    searchResultId: string;
    rateId: string;
    guests: Array<{
      given_name: string;
      family_name: string;
      born_on: string;
    }>;
    email: string;
    phone_number: string;
    special_requests?: string;
  }) {
    if (!this.apiKey) {
      throw new Error('Duffel API key not configured. Please provide API key.');
    }

    try {
      // First, create a quote for the selected rate
      const quoteResponse = await fetch(`${this.baseUrl}/stays/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2'
        },
        body: JSON.stringify({
          data: {
            rate_id: params.rateId
          }
        })
      });

      if (!quoteResponse.ok) {
        throw new Error(`Quote creation failed: ${quoteResponse.status} ${quoteResponse.statusText}`);
      }

      const quoteData = await quoteResponse.json();
      const quoteId = quoteData.data.id;

      // Then create the booking using the quote
      const bookingData = {
        data: {
          quote_id: quoteId,
          guests: params.guests,
          email: params.email,
          phone_number: params.phone_number,
          ...(params.special_requests && { stay_special_requests: params.special_requests })
        }
      };

      const bookingResponse = await fetch(`${this.baseUrl}/stays/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2'
        },
        body: JSON.stringify(bookingData)
      });

      if (!bookingResponse.ok) {
        throw new Error(`Hotel booking failed: ${bookingResponse.status} ${bookingResponse.statusText}`);
      }

      const booking = await bookingResponse.json();
      
      return {
        success: true,
        bookingReference: booking.data.reference,
        confirmationNumber: booking.data.reference,
        status: 'confirmed',
        bookingDetails: {
          id: booking.data.id,
          reference: booking.data.reference,
          status: booking.data.status,
          total_amount: booking.data.total_amount,
          total_currency: booking.data.total_currency,
          check_in_date: booking.data.check_in_date,
          check_out_date: booking.data.check_out_date
        }
      };
    } catch (error) {
      console.error('Error booking hotel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hotel booking failed'
      };
    }
  }
}

export const duffelProvider = new DuffelProvider();

