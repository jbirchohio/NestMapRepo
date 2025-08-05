import { logger } from '../utils/logger';

if (!process.env.DUFFEL_API_KEY) {
  throw new Error('DUFFEL_API_KEY environment variable is required');
}

const DUFFEL_API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.duffel.com' 
  : 'https://api.duffel.com'; // Duffel uses same endpoint for both

// HTTP client for Duffel API
class DuffelHTTPClient {
  private baseURL = DUFFEL_API_BASE;
  private apiKey = process.env.DUFFEL_API_KEY!;

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Duffel-Version': 'v1',
      ...options.headers
    };

    logger.debug(`Duffel API Request: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Duffel API Error: ${response.status} ${errorText}`);
      throw new Error(`Duffel API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.debug(`Duffel API Response: ${response.status} - Data length: ${JSON.stringify(data).length}`);
    return data;
  }
}

const duffelClient = new DuffelHTTPClient();

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface FlightOffer {
  id: string;
  price: {
    amount: string;
    currency: string;
  };
  slices: Array<{
    origin: {
      iata_code: string;
      name: string;
      city_name: string;
    };
    destination: {
      iata_code: string;
      name: string;
      city_name: string;
    };
    departure_datetime: string;
    arrival_datetime: string;
    duration: string;
    segments: Array<{
      airline: {
        name: string;
        iata_code: string;
        logo_url?: string;
      };
      flight_number: string;
      aircraft: {
        name: string;
      };
      origin: {
        iata_code: string;
        name: string;
      };
      destination: {
        iata_code: string;
        name: string;
      };
      departure_datetime: string;
      arrival_datetime: string;
      duration: string;
    }>;
  }>;
  passengers: Array<{
    type: string;
    fare_basis_code?: string;
    cabin_class: string;
    baggage: Array<{
      type: string;
      quantity: number;
    }>;
  }>;
  conditions: {
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
    cancel_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
    refund_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
  };
}

export interface BookingRequest {
  offer_id: string;
  passengers: Array<{
    title: string;
    given_name: string;
    family_name: string;
    born_on: string;
    email: string;
    phone_number: string;
    gender: 'M' | 'F';
  }>;
  payment: {
    type: 'balance';
  };
}

export interface BookingResponse {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  booking_reference: string;
  documents: Array<{
    type: string;
    url: string;
  }>;
  passengers: Array<{
    id: string;
    given_name: string;
    family_name: string;
    title: string;
  }>;
  slices: Array<{
    id: string;
    segments: Array<{
      id: string;
      passengers: Array<{
        passenger_id: string;
        seat?: {
          designator: string;
          name: string;
        };
      }>;
    }>;
  }>;
}

export class DuffelFlightService {
  /**
   * Search for flights based on search criteria
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    try {
      logger.info('Searching flights with Duffel API:', params);
      
      // Create offer request
      const offerRequestData = {
        slices: [
          {
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departure_date,
          }
        ],
        passengers: [
          ...Array(params.passengers.adults).fill({ type: 'adult' }),
          ...Array(params.passengers.children || 0).fill({ type: 'child' }),
          ...Array(params.passengers.infants || 0).fill({ type: 'infant_without_seat' })
        ],
        cabin_class: params.cabin_class || 'economy'
      };

      // Add return slice for round-trip
      if (params.return_date) {
        offerRequestData.slices.push({
          origin: params.destination,
          destination: params.origin,
          departure_date: params.return_date,
        });
      }

      // Create offer request via HTTP
      const offerRequest = await duffelClient.request('/air/offer_requests', {
        method: 'POST',
        body: JSON.stringify({ data: offerRequestData })
      });
      
      logger.info('Duffel offer request created:', offerRequest.data.id);

      // Get offers from the request
      const offersResponse = await duffelClient.request(`/air/offers?offer_request_id=${offerRequest.data.id}&limit=50`);

      logger.info(`Found ${offersResponse.data.length} flight offers`);

      // Transform Duffel response to our format
      return offersResponse.data.map((offer: any) => ({
        id: offer.id,
        price: {
          amount: offer.total_amount,
          currency: offer.total_currency
        },
        slices: offer.slices.map((slice: any) => ({
          origin: {
            iata_code: slice.origin.iata_code,
            name: slice.origin.name,
            city_name: slice.origin.city_name || slice.origin.name
          },
          destination: {
            iata_code: slice.destination.iata_code,
            name: slice.destination.name,
            city_name: slice.destination.city_name || slice.destination.name
          },
          departure_datetime: slice.segments[0].departing_at,
          arrival_datetime: slice.segments[slice.segments.length - 1].arriving_at,
          duration: slice.duration,
          segments: slice.segments.map((segment: any) => ({
            airline: {
              name: segment.operating_carrier.name,
              iata_code: segment.operating_carrier.iata_code,
              logo_url: segment.operating_carrier.logo_symbol_url
            },
            flight_number: segment.operating_carrier_flight_number,
            aircraft: {
              name: segment.aircraft.name
            },
            origin: {
              iata_code: segment.origin.iata_code,
              name: segment.origin.name
            },
            destination: {
              iata_code: segment.destination.iata_code,
              name: segment.destination.name
            },
            departure_datetime: segment.departing_at,
            arrival_datetime: segment.arriving_at,
            duration: segment.duration
          }))
        })),
        passengers: offer.passengers.map((passenger: any) => ({
          type: passenger.type,
          fare_basis_code: passenger.fare_basis_code,
          cabin_class: passenger.cabin_class,
          baggage: passenger.baggages?.map((baggage: any) => ({
            type: baggage.type,
            quantity: baggage.quantity
          })) || []
        })),
        conditions: {
          change_before_departure: offer.conditions?.change_before_departure ? {
            allowed: offer.conditions.change_before_departure.allowed,
            penalty_amount: offer.conditions.change_before_departure.penalty_amount,
            penalty_currency: offer.conditions.change_before_departure.penalty_currency
          } : undefined,
          cancel_before_departure: offer.conditions?.cancel_before_departure ? {
            allowed: offer.conditions.cancel_before_departure.allowed,
            penalty_amount: offer.conditions.cancel_before_departure.penalty_amount,
            penalty_currency: offer.conditions.cancel_before_departure.penalty_currency
          } : undefined,
          refund_before_departure: offer.conditions?.refund_before_departure ? {
            allowed: offer.conditions.refund_before_departure.allowed,
            penalty_amount: offer.conditions.refund_before_departure.penalty_amount,
            penalty_currency: offer.conditions.refund_before_departure.penalty_currency
          } : undefined
        }
      }));

    } catch (error: any) {
      logger.error('Duffel flight search error:', error);
      
      if (error.response?.data) {
        logger.error('Duffel API error details:', error.response.data);
      }
      
      throw new Error(`Flight search failed: ${error.message}`);
    }
  }

  /**
   * Get detailed offer information
   */
  async getOffer(offerId: string): Promise<FlightOffer> {
    try {
      const offerResponse = await duffelClient.request(`/air/offers/${offerId}`);
      const offer = offerResponse.data;
      
      // Transform to our format (same as in searchFlights)
      return {
        id: offer.id,
        price: {
          amount: offer.total_amount,
          currency: offer.total_currency
        },
        slices: offer.slices.map((slice: any) => ({
          origin: {
            iata_code: slice.origin.iata_code,
            name: slice.origin.name,
            city_name: slice.origin.city_name || slice.origin.name
          },
          destination: {
            iata_code: slice.destination.iata_code,
            name: slice.destination.name,
            city_name: slice.destination.city_name || slice.destination.name
          },
          departure_datetime: slice.segments[0].departing_at,
          arrival_datetime: slice.segments[slice.segments.length - 1].arriving_at,
          duration: slice.duration,
          segments: slice.segments.map((segment: any) => ({
            airline: {
              name: segment.operating_carrier.name,
              iata_code: segment.operating_carrier.iata_code,
              logo_url: segment.operating_carrier.logo_symbol_url
            },
            flight_number: segment.operating_carrier_flight_number,
            aircraft: {
              name: segment.aircraft.name
            },
            origin: {
              iata_code: segment.origin.iata_code,
              name: segment.origin.name
            },
            destination: {
              iata_code: segment.destination.iata_code,
              name: segment.destination.name
            },
            departure_datetime: segment.departing_at,
            arrival_datetime: segment.arriving_at,
            duration: segment.duration
          }))
        })),
        passengers: offer.passengers.map((passenger: any) => ({
          type: passenger.type,
          fare_basis_code: passenger.fare_basis_code,
          cabin_class: passenger.cabin_class,
          baggage: passenger.baggages?.map((baggage: any) => ({
            type: baggage.type,
            quantity: baggage.quantity
          })) || []
        })),
        conditions: {
          change_before_departure: offer.conditions?.change_before_departure ? {
            allowed: offer.conditions.change_before_departure.allowed,
            penalty_amount: offer.conditions.change_before_departure.penalty_amount,
            penalty_currency: offer.conditions.change_before_departure.penalty_currency
          } : undefined,
          cancel_before_departure: offer.conditions?.cancel_before_departure ? {
            allowed: offer.conditions.cancel_before_departure.allowed,
            penalty_amount: offer.conditions.cancel_before_departure.penalty_amount,
            penalty_currency: offer.conditions.cancel_before_departure.penalty_currency
          } : undefined,
          refund_before_departure: offer.conditions?.refund_before_departure ? {
            allowed: offer.conditions.refund_before_departure.allowed,
            penalty_amount: offer.conditions.refund_before_departure.penalty_amount,
            penalty_currency: offer.conditions.refund_before_departure.penalty_currency
          } : undefined
        }
      };

    } catch (error: any) {
      logger.error('Duffel get offer error:', error);
      throw new Error(`Failed to get offer: ${error.message}`);
    }
  }

  /**
   * Create a flight booking
   */
  async createBooking(bookingData: BookingRequest): Promise<BookingResponse> {
    try {
      logger.info('Creating booking with Duffel API:', bookingData.offer_id);

      const booking = await duffelClient.request('/air/orders', {
        method: 'POST',
        body: JSON.stringify({
          selected_offers: [bookingData.offer_id],
          passengers: bookingData.passengers.map((passenger: any) => ({
            title: passenger.title,
            given_name: passenger.given_name,
            family_name: passenger.family_name,
            born_on: passenger.born_on,
            email: passenger.email,
            phone_number: passenger.phone_number,
            gender: passenger.gender
          })),
          payments: [bookingData.payment]
        })
      });

      logger.info('Duffel booking created:', booking.id);

      return {
        id: booking.id,
        reference: booking.booking_reference,
        status: booking.status,
        created_at: booking.created_at,
        booking_reference: booking.booking_reference,
        documents: booking.documents?.map((doc: any) => ({
          type: doc.type,
          url: doc.url
        })) || [],
        passengers: booking.passengers.map((passenger: any) => ({
          id: passenger.id,
          given_name: passenger.given_name,
          family_name: passenger.family_name,
          title: passenger.title
        })),
        slices: booking.slices.map((slice: any) => ({
          id: slice.id,
          segments: slice.segments.map((segment: any) => ({
            id: segment.id,
            passengers: segment.passengers.map((passenger: any) => ({
              passenger_id: passenger.passenger_id,
              seat: passenger.seat ? {
                designator: passenger.seat.designator,
                name: passenger.seat.name
              } : undefined
            }))
          }))
        }))
      };

    } catch (error: any) {
      logger.error('Duffel booking error:', error);
      
      if (error.response?.data) {
        logger.error('Duffel API booking error details:', error.response.data);
      }
      
      throw new Error(`Booking failed: ${error.message}`);
    }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const booking = await duffelClient.request(`/air/orders/${bookingId}`);

      return {
        id: booking.id,
        reference: booking.booking_reference,
        status: booking.status,
        created_at: booking.created_at,
        booking_reference: booking.booking_reference,
        documents: booking.documents?.map((doc: any) => ({
          type: doc.type,
          url: doc.url
        })) || [],
        passengers: booking.passengers.map((passenger: any) => ({
          id: passenger.id,
          given_name: passenger.given_name,
          family_name: passenger.family_name,
          title: passenger.title
        })),
        slices: booking.slices.map((slice: any) => ({
          id: slice.id,
          segments: slice.segments.map((segment: any) => ({
            id: segment.id,
            passengers: segment.passengers.map((passenger: any) => ({
              passenger_id: passenger.passenger_id,
              seat: passenger.seat ? {
                designator: passenger.seat.designator,
                name: passenger.seat.name
              } : undefined
            }))
          }))
        }))
      };

    } catch (error: any) {
      logger.error('Duffel get booking error:', error);
      throw new Error(`Failed to get booking: ${error.message}`);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean; refund_amount?: string; refund_currency?: string }> {
    try {
      logger.info('Cancelling booking with Duffel API:', bookingId);

      const cancellation = await duffelClient.request('/air/order_cancellations', {
        method: 'POST',
        body: JSON.stringify({
          order_id: bookingId
        })
      });

      logger.info('Duffel booking cancelled:', cancellation.id);

      return {
        success: true,
        refund_amount: cancellation.refund_amount,
        refund_currency: cancellation.refund_currency
      };

    } catch (error: any) {
      logger.error('Duffel cancel booking error:', error);
      throw new Error(`Cancellation failed: ${error.message}`);
    }
  }

  /**
   * Get available airports for autocomplete
   */
  async searchAirports(query: string): Promise<Array<{ iata_code: string; name: string; city_name: string; country_name: string }>> {
    try {
      const response = await duffelClient.request('/air/airports?' + new URLSearchParams({
        name: query,
        limit: '10'
      }));

      return response.data.map((airport: any) => ({
        iata_code: airport.iata_code,
        name: airport.name,
        city_name: airport.city_name || airport.name,
        country_name: airport.city?.country_name || 'Unknown'
      }));

    } catch (error: any) {
      logger.error('Duffel airport search error:', error);
      throw new Error(`Airport search failed: ${error.message}`);
    }
  }
}

export const duffelFlightService = new DuffelFlightService();