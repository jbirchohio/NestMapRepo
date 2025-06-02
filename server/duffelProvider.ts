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
    this.apiKey = process.env.KIWI_API_KEY || ''; // Using the Duffel key from KIWI_API_KEY env var
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
          'Duffel-Version': 'v1'
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
          'Duffel-Version': 'v1'
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
    // Duffel doesn't have hotels API, so we'll return empty results
    // In a real implementation, you'd integrate with a hotel provider
    console.log('Duffel hotel search not available - Duffel focuses on flights');
    return { hotels: [] };
  }

  async searchCars(params: {
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
          'Duffel-Version': 'v1'
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
}

export const duffelProvider = new DuffelProvider();