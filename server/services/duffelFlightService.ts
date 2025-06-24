// Types for Duffel API responses
interface DuffelSegment {
    id: string;
    origin: {
        iata_code: string;
        name: string;
        city_name?: string;
    };
    destination: {
        iata_code: string;
        name: string;
        city_name?: string;
    };
    departing_at: string;
    arriving_at: string;
    duration: string;
    operating_carrier: {
        name: string;
        iata_code: string;
        logo_symbol_url?: string;
    };
    operating_carrier_flight_number: string;
    aircraft: {
        name: string;
    };
}

interface DuffelSlice {
    origin: {
        iata_code: string;
        name: string;
        city_name?: string;
    };
    destination: {
        iata_code: string;
        name: string;
        city_name?: string;
    };
    duration: string;
    segments: DuffelSegment[];
}

interface DuffelPassenger {
    type: string;
    fare_basis_code?: string;
    cabin_class: string;
    baggage?: Array<{
        type: string;
        quantity: number;
    }>;
}

interface DuffelOffer {
    id: string;
    total_amount: string;
    total_currency: string;
    slices: DuffelSlice[];
    passengers: DuffelPassenger[];
    conditions?: {
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
    owner?: {
        name?: string;
        logo_symbol_url?: string;
        logo_lockup_url?: string;
    };
    expires_at?: string;
    created_at?: string;
    updated_at?: string;
}

interface DuffelOfferResponse {
    data: DuffelOffer[];
}

// Import Duffel client types
import type { DuffelClient } from '@duffel/api';

if (!process.env.DUFFEL_API_KEY) {
    throw new Error('DUFFEL_API_KEY environment variable is required');
}
const DUFFEL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api.duffel.com'
    : 'https://api.duffel.com'; // Duffel uses same endpoint for both
// HTTP client for Duffel API
interface DuffelResponse<T> {
    data: T;
    meta?: {
        limit: number;
        count: number;
        [key: string]: unknown;
    };
}

interface DuffelErrorResponse {
    errors: Array<{
        type: string;
        title: string;
        message: string;
        code: string;
    }>;
}

class DuffelHTTPClient {
    private baseURL = DUFFEL_API_BASE;
    private apiKey = process.env.DUFFEL_API_KEY!;

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<DuffelResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;
        const headers = new Headers({
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Duffel-Version': 'v1',
            ...(options.headers || {})
        });

        console.log(`Duffel API Request: ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                body: options.body,
            });

            const responseData = await response.json() as DuffelResponse<T> | DuffelErrorResponse;
            
            if (!response.ok) {
                const errorData = responseData as DuffelErrorResponse;
                const errorMessage = errorData?.errors?.[0]?.message || response.statusText;
                
                console.error('Duffel API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    message: errorMessage,
                    errors: errorData.errors
                });
                
                throw new Error(`Duffel API Error: ${response.status} ${errorMessage}`);
            }

            console.log(`Duffel API Response: ${response.status} - Data length: ${JSON.stringify(responseData).length}`);
            return responseData as DuffelResponse<T>;
        } catch (error) {
            console.error('Network error in Duffel API request:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Network error: ${errorMessage}`);
        }
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
            console.log('Searching flights with params:', params);
            
            // Prepare passengers array with proper types
            const passengers = [
                ...Array(params.passengers.adults).fill({ type: 'adult' as const }),
                ...(params.passengers.children ? Array(params.passengers.children).fill({ type: 'child' as const }) : []),
                ...(params.passengers.infants ? Array(params.passengers.infants).fill({ type: 'infant' as const }) : [])
            ];

            // Prepare slices array with proper types
            const slices = [
                {
                    origin: params.origin,
                    destination: params.destination,
                    departure_date: params.departure_date
                },
                ...(params.return_date ? [{
                    origin: params.destination,
                    destination: params.origin,
                    departure_date: params.return_date
                }] : [])
            ];
            
            // Create an offer request to get available flights
            const offerRequest = await duffelClient.request<{ id: string }>('/air/offer_requests', {
                method: 'POST',
                body: JSON.stringify({
                    data: {
                        slices,
                        passengers,
                        cabin_class: params.cabin_class || 'economy'
                    }
                })
            });
            
            const offerRequestId = offerRequest.data.id;
            console.log('Duffel offer request created:', offerRequestId);
            
            // Get offers from the request
            const offersResponse = await duffelClient.request<DuffelOffer[]>(
                `/air/offers?offer_request_id=${offerRequestId}&limit=50`
            );
            
            console.log(`Found ${offersResponse.data.length} flight offers`);
            
            // Transform Duffel response to our format
            return offersResponse.data.map((offer): FlightOffer => {
                // Safely handle potentially undefined values
                const firstSegment = (slice: DuffelSlice) => slice.segments[0];
                const lastSegment = (slice: DuffelSlice) => slice.segments[slice.segments.length - 1];
                
                return {
                    id: offer.id,
                    price: {
                        amount: offer.total_amount,
                        currency: offer.total_currency
                    },
                    slices: offer.slices.map(slice => ({
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
                        departure_datetime: firstSegment(slice)?.departing_at || '',
                        arrival_datetime: lastSegment(slice)?.arriving_at || '',
                        duration: slice.duration,
                        segments: slice.segments.map(segment => ({
                            airline: {
                                name: segment.operating_carrier?.name || 'Unknown',
                                iata_code: segment.operating_carrier?.iata_code || '',
                                logo_url: segment.operating_carrier?.logo_symbol_url
                            },
                            flight_number: segment.operating_carrier_flight_number || '',
                            aircraft: {
                                name: segment.aircraft?.name || 'Unknown Aircraft'
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
                    passengers: offer.passengers.map(passenger => ({
                        type: passenger.type,
                        fare_basis_code: passenger.fare_basis_code || '',
                        cabin_class: passenger.cabin_class,
                        baggage: (passenger.baggage || []).map(baggage => ({
                            type: baggage.type,
                            quantity: baggage.quantity
                        }))
                    })),
                    conditions: {
                        change_before_departure: {
                            allowed: false,
                            penalty_amount: '0',
                            penalty_currency: 'USD'
                        },
                        cancel_before_departure: {
                            allowed: false,
                            penalty_amount: '0',
                            penalty_currency: 'USD'
                        },
                        refund_before_departure: {
                            allowed: false,
                            penalty_amount: '0',
                            penalty_currency: 'USD'
                        }
                    }
                };
            });
        } catch (error: unknown) {
            console.error('Duffel flight search error:', error);
            
            // Handle different error types
            if (error instanceof Error) {
                if ('response' in error && (error as any).response?.data) {
                    console.error('Duffel API error details:', (error as any).response.data);
                }
                throw new Error(`Failed to search for flights: ${error.message}`);
            }
            throw new Error('Failed to search for flights due to an unknown error');
        }
    }

    /**
     * Get detailed offer information
     */
    async getOffer(offerId: string): Promise<FlightOffer> {
        try {
            const response = await duffelClient.request<DuffelOffer>(`/air/offers/${offerId}`);
            const offer = response.data;

            // Helper functions to safely access segment data
            const firstSegment = (slice: DuffelSlice) => slice.segments[0];
            const lastSegment = (slice: DuffelSlice) => slice.segments[slice.segments.length - 1];

            return {
                id: offer.id,
                price: {
                    amount: offer.total_amount,
                    currency: offer.total_currency
                },
                slices: offer.slices.map(slice => ({
                    origin: {
                        iata_code: slice.origin.iata_code,
                        name: slice.origin.name,
                        city_name: slice.origin.city_name || ''
                    },
                    destination: {
                        iata_code: slice.destination.iata_code,
                        name: slice.destination.name,
                        city_name: slice.destination.city_name || ''
                    },
                    departure_datetime: firstSegment(slice)?.departing_at || '',
                    arrival_datetime: lastSegment(slice)?.arriving_at || '',
                    duration: slice.duration,
                    segments: slice.segments.map(segment => ({
                        airline: {
                            name: segment.operating_carrier?.name || 'Unknown',
                            iata_code: segment.operating_carrier?.iata_code || '',
                            logo_url: segment.operating_carrier?.logo_symbol_url
                        },
                        flight_number: segment.operating_carrier_flight_number || '',
                        aircraft: {
                            name: segment.aircraft?.name || 'Unknown Aircraft'
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
                passengers: offer.passengers.map(passenger => ({
                    type: passenger.type,
                    fare_basis_code: passenger.fare_basis_code || '',
                    cabin_class: passenger.cabin_class,
                    baggage: (passenger.baggage || []).map(baggage => ({
                        type: baggage.type,
                        quantity: baggage.quantity
                    }))
                })),
                conditions: {
                    change_before_departure: offer.conditions?.change_before_departure ? {
                        allowed: offer.conditions.change_before_departure.allowed,
                        penalty_amount: offer.conditions.change_before_departure.penalty_amount || '0',
                        penalty_currency: offer.conditions.change_before_departure.penalty_currency || 'USD'
                    } : {
                        allowed: false,
                        penalty_amount: '0',
                        penalty_currency: 'USD'
                    },
                    cancel_before_departure: offer.conditions?.cancel_before_departure ? {
                        allowed: offer.conditions.cancel_before_departure.allowed,
                        penalty_amount: offer.conditions.cancel_before_departure.penalty_amount || '0',
                        penalty_currency: offer.conditions.cancel_before_departure.penalty_currency || 'USD'
                    } : {
                        allowed: false,
                        penalty_amount: '0',
                        penalty_currency: 'USD'
                    },
                    refund_before_departure: offer.conditions?.refund_before_departure ? {
                        allowed: offer.conditions.refund_before_departure.allowed,
                        penalty_amount: offer.conditions.refund_before_departure.penalty_amount || '0',
                        penalty_currency: offer.conditions.refund_before_departure.penalty_currency || 'USD'
                    } : {
                        allowed: false,
                        penalty_amount: '0',
                        penalty_currency: 'USD'
                    }
                }
            };
        } catch (error) {
            console.error('Duffel get offer error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get offer: ${errorMessage}`);
        }
    }

    /**
     * Create a flight booking
     */
    async createBooking(bookingData: BookingRequest): Promise<BookingResponse> {
        try {
            console.log('Creating booking with Duffel API:', bookingData.offer_id);
            const booking = await duffel.orders.create({
                selected_offers: [bookingData.offer_id],
                passengers: bookingData.passengers.map(passenger => ({
                    title: passenger.title,
                    given_name: passenger.given_name,
                    family_name: passenger.family_name,
                    born_on: passenger.born_on,
                    email: passenger.email,
                    phone_number: passenger.phone_number,
                    gender: passenger.gender
                })),
                payments: [bookingData.payment]
            });
            console.log('Duffel booking created:', booking.id);
            return {
                id: booking.id,
                reference: booking.booking_reference,
                status: booking.status,
                created_at: booking.created_at,
                booking_reference: booking.booking_reference,
                documents: booking.documents?.map(doc => ({
                    type: doc.type,
                    url: doc.url
                })) || [],
                passengers: booking.passengers.map(passenger => ({
                    id: passenger.id,
                    given_name: passenger.given_name,
                    family_name: passenger.family_name,
                    title: passenger.title
                })),
                slices: booking.slices.map(slice => ({
                    id: slice.id,
                    segments: slice.segments.map(segment => ({
                        id: segment.id,
                        passengers: segment.passengers.map(passenger => ({
                            passenger_id: passenger.passenger_id,
                            seat: passenger.seat ? {
                                designator: passenger.seat.designator,
                                name: passenger.seat.name
                            } : undefined
                        }))
                    }))
                }))
            };
        }
        catch (error: any) {
            console.error('Duffel booking error:', error);
            if (error.response?.data) {
                console.error('Duffel API booking error details:', error.response.data);
            }
            throw new Error(`Booking failed: ${error.message}`);
        }
    }
    /**
     * Get booking details
     */
    async getBooking(bookingId: string): Promise<BookingResponse> {
        try {
            const booking = await duffel.orders.get(bookingId);
            return {
                id: booking.id,
                reference: booking.booking_reference,
                status: booking.status,
                created_at: booking.created_at,
                booking_reference: booking.booking_reference,
                documents: booking.documents?.map(doc => ({
                    type: doc.type,
                    url: doc.url
                })) || [],
                passengers: booking.passengers.map(passenger => ({
                    id: passenger.id,
                    given_name: passenger.given_name,
                    family_name: passenger.family_name,
                    title: passenger.title
                })),
                slices: booking.slices.map(slice => ({
                    id: slice.id,
                    segments: slice.segments.map(segment => ({
                        id: segment.id,
                        passengers: segment.passengers.map(passenger => ({
                            passenger_id: passenger.passenger_id,
                            seat: passenger.seat ? {
                                designator: passenger.seat.designator,
                                name: passenger.seat.name
                            } : undefined
                        }))
                    }))
                }))
            };
        }
        catch (error: any) {
            console.error('Duffel get booking error:', error);
            throw new Error(`Failed to get booking: ${error.message}`);
        }
    }
    /**
     * Cancel a booking
     */
    async cancelBooking(bookingId: string): Promise<{
        success: boolean;
        refund_amount?: string;
        refund_currency?: string;
    }> {
        try {
            console.log('Cancelling booking with Duffel API:', bookingId);
            const cancellation = await duffel.orderCancellations.create({
                order_id: bookingId
            });
            console.log('Duffel booking cancelled:', cancellation.id);
            return {
                success: true,
                refund_amount: cancellation.refund_amount,
                refund_currency: cancellation.refund_currency
            };
        }
        catch (error: any) {
            console.error('Duffel cancel booking error:', error);
     */
    async searchAirports(query: string): Promise<Array<{
        iata_code: string;
        name: string;
        city_name: string;
        country_name: string;
    }>> {
        try {
            // Use the duffel client if available, otherwise fall back to direct API call
            if (duffel && duffel.airports) {
                const response = await duffel.airports.list({
                    name: query,
                    limit: 10
                });
                return response.data.map(airport => ({
                    iata_code: airport.iata_code,
                    name: airport.name,
                    city_name: airport.city_name || airport.city?.name || airport.name,
                    country_name: airport.country_name || airport.city?.country_name || 'Unknown'
                }));
            } else {
                // Fallback to direct API call if duffel client is not available
                const response = await fetch(`https://api.duffel.com/air/airports?name=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
                        'Accept': 'application/json',
                        'Duffel-Version': 'v1'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch airports: ${response.statusText}`);
                }

                const { data } = await response.json();
                return data.map((airport: any) => ({
                    iata_code: airport.iata_code,
                    name: airport.name,
                    city_name: airport.city_name || airport.name,
                    country_name: airport.city?.country_name || 'Unknown'
                }));
            }
        } catch (error) {
            console.error('Error searching airports:', error);
            throw new Error('Failed to search for airports');
        }
    }
}

// Export a singleton instance
export const duffelFlightService = new DuffelFlightService();

export default duffelFlightService;
