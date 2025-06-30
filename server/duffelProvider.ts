import type { 
  DuffelOffer, 
  DuffelFlightSegment, 
  DuffelPassenger, 
  DuffelContactInfo, 
  DuffelBookingResponse, 
  FlightSearchResult, 
  HotelSearchResult
} from '@shared/schema/types/trip/business-trip.types.js';

interface HotelBookingParams {
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
}

interface HotelBookingResult {
  success: boolean;
  status: string;
  bookingReference?: string;
  confirmationNumber?: string;
  bookingDetails?: Record<string, unknown>;
  error?: string;
}

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
        this.apiKey = process.env.DUFFEL_API_KEY || '';
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Error fetching hotels from Duffel:', error);
            throw error;
        }
    }
    private getCityCoordinates(destination: string): {
        latitude: number;
        longitude: number;
    } {
        // Basic city coordinate mapping - in production you'd use a geocoding service
        const cityMap: Record<string, {
            latitude: number;
            longitude: number;
        }> = {
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
        const cityKey = Object.keys(cityMap).find(city => destination.toLowerCase().includes(city.toLowerCase()));
        return cityKey ? cityMap[cityKey] : { latitude: 37.7749, longitude: -122.4194 }; // Default to SF
    }
    private transformHotelResults(data: any): { hotels: HotelSearchResult[] } {
        if (!data?.data?.results || !Array.isArray(data.data.results)) {
            return { hotels: [] };
        }

        const hotels = data.data.results.map((hotel: any) => ({
            id: `hotel-${hotel.hotel_id || Math.random().toString(36).substr(2, 9)}`,
            name: hotel.hotel_name || 'Unknown Hotel',
            price: {
                amount: hotel.min_daily_rate?.amount || 0,
                currency: hotel.min_daily_rate?.currency || 'USD'
            },
            rating: hotel.star_rating || 0,
            location: {
                city: hotel.address?.city_name || 'Unknown City',
                country: hotel.address?.country || 'Unknown Country',
                address: [
                    hotel.address?.line1,
                    hotel.address?.line2,
                    hotel.address?.city_name,
                    hotel.address?.region,
                    hotel.address?.postal_code,
                    hotel.address?.country
                ].filter(Boolean).join(', ')
            },
            amenities: hotel.amenities?.map((a: any) => ({
                name: a.name || 'Unknown Amenity',
                code: a.code || '',
                isAvailable: a.available !== false
            })) || [],
            images: hotel.images?.map((img: any) => ({
                url: img.url || '',
                description: img.description || '',
                isPrimary: img.is_primary || false
            })) || [],
            checkIn: hotel.check_in_time || '14:00',
            checkOut: hotel.check_out_time || '12:00',
            description: hotel.description || '',
            phone: hotel.contact_numbers?.[0]?.number || '',
            ratingCount: hotel.review_count || 0,
            reviewScore: hotel.review_score || 0
        }));

        return { hotels };
    }

    private transformFlightResults(data: { data: DuffelOffer[] }): { flights: FlightSearchResult[] } {
        if (!data?.data || !Array.isArray(data.data)) {
            return { flights: [] };
        }

        const flights = data.data.map((offer: DuffelOffer, index: number) => {
            const slice = offer.slices?.[0];
            const segment = slice?.segments?.[0];
            const airline = segment?.marketing_carrier || { iata_code: '', name: 'Unknown Airline' };
            
            // Format duration from ISO 8601 to human readable format (e.g., "2h 30m")
            const formatDuration = (duration: string | undefined): string => {
                if (!duration) return '0h 0m';
                try {
                    const match = duration.match(/PT(\d+H)?(\d+M)?/);
                    if (!match) return duration;
                    const hours = match[1] ? match[1].replace('H', 'h ') : '';
                    const minutes = match[2] ? match[2].replace('M', 'm') : '0m';
                    return `${hours}${minutes}`.trim();
                } catch {
                    return duration;
                }
            };

            const flightNumber = segment?.marketing_carrier_flight_number || '';
            const flightResult: FlightSearchResult = {
                id: `duffel-${offer.id || index}`,
                price: {
                    amount: Math.round(parseFloat(offer.total_amount) || 0),
                    currency: offer.total_currency || 'USD'
                },
                departure: {
                    airport: {
                        code: segment?.origin?.iata_code || '',
                        name: segment?.origin?.name || 'Unknown Airport',
                        city: segment?.origin?.city_name || 'Unknown City',
                        country: segment?.origin?.country_name || 'Unknown Country'
                    },
                    time: segment?.departing_at || new Date().toISOString()
                },
                arrival: {
                    airport: {
                        code: segment?.destination?.iata_code || '',
                        name: segment?.destination?.name || 'Unknown Airport',
                        city: segment?.destination?.city_name || 'Unknown City',
                        country: segment?.destination?.country_name || 'Unknown Country'
                    },
                    time: segment?.arriving_at || new Date().toISOString()
                },
                airline: {
                    code: airline.iata_code || '',
                    name: airline.name || 'Unknown Airline'
                },
                flightNumber: flightNumber,
                duration: formatDuration(segment?.duration),
                segments: (slice?.segments || []).map((seg: DuffelFlightSegment) => ({
                    departure: {
                        airport: {
                            code: seg.origin?.iata_code || '',
                            name: seg.origin?.name || 'Unknown Airport',
                            city: seg.origin?.city_name || 'Unknown City',
                            country: seg.origin?.country_name || 'Unknown Country'
                        },
                        time: seg.departing_at || new Date().toISOString()
                    },
                    arrival: {
                        airport: {
                            code: seg.destination?.iata_code || '',
                            name: seg.destination?.name || 'Unknown Airport',
                            city: seg.destination?.city_name || 'Unknown City',
                            country: seg.destination?.country_name || 'Unknown Country'
                        },
                        time: seg.arriving_at || new Date().toISOString()
                    },
                    airline: {
                        code: seg.marketing_carrier?.iata_code || '',
                        name: seg.marketing_carrier?.name || 'Unknown Airline'
                    },
                    flight_number: seg.marketing_carrier_flight_number || '',
                    duration: formatDuration(seg.duration)
                })),
                bookingToken: offer.id || `offer-${index}`,
                validUntil: offer.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            return flightResult;
        });
        
        return { flights };
    }

    async bookFlight(bookingParams: {
        bookingToken: string;
        passengers: DuffelPassenger[];
        contactInfo: DuffelContactInfo;
    }): Promise<DuffelBookingResponse> {
        if (!this.apiKey) {
            return {
                success: false,
                status: 'error',
                error: 'Duffel API key not configured',
                bookingDetails: {}
            };
        }
        
        // Duffel booking requires creating an order
        try {
            const bookingRequest = {
                data: {
                    selected_offers: [bookingParams.bookingToken],
                    passengers: bookingParams.passengers,
                    type: 'instant',
                    payments: [{
                        type: 'balance',
                        amount: '0', // This will be replaced by the actual amount from the offer
                        currency: 'USD'
                    }],
                    metadata: {
                        contact_email: bookingParams.contactInfo.email,
                        contact_phone: bookingParams.contactInfo.phone_number
                    }
                }
            };

            const response = await fetch(`${this.baseUrl}/air/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Duffel-Version': 'v2'
                },
                body: JSON.stringify(bookingRequest)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData?.errors?.map((e: { message: string }) => e.message).join(', ') || 'Unknown error';
                throw new Error(`Booking failed: ${response.status} ${response.statusText} - ${errorMessage}`);
            }

            const booking = await response.json();
            const bookingData = booking.data;
            
            // Transform the response to match our expected format
            const result: DuffelBookingResponse = {
                success: true,
                status: 'confirmed',
                bookingReference: bookingData.id,
                confirmationNumber: bookingData.booking_reference || bookingData.id,
                bookingDetails: {
                    ...bookingData,
                    passengers: Array.isArray(bookingData.passengers) ? bookingData.passengers.map((p: any) => ({
                        id: p.id,
                        name: `${p.given_name || ''} ${p.family_name || ''}`.trim(),
                        type: p.type,
                        passenger_id: p.passenger_id
                    })) : [],
                    slices: Array.isArray(bookingData.slices) ? bookingData.slices.map((s: any) => ({
                        origin: s.origin || {},
                        destination: s.destination || {},
                        departure: s.departure || '',
                        arrival: s.arrival || ''
                    })) : []
                }
            };

            return result;
        } catch (error) {
            console.error('Duffel flight booking error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Booking failed';
            return {
                success: false,
                status: 'error',
                error: errorMessage,
                bookingDetails: { error: errorMessage }
            };
        }
    }

    async bookHotel(bookingParams: HotelBookingParams): Promise<HotelBookingResult> {
        if (!this.apiKey) {
            return {
                success: false,
                status: 'error',
                error: 'Duffel API key not configured. Please provide API key.'
            };
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
                        rate_id: bookingParams.rateId
                    }
                })
            });

            if (!quoteResponse.ok) {
                const errorData = await quoteResponse.json().catch(() => ({}));
                const errorMessage = errorData?.errors?.map((e: { message: string }) => e.message).join(', ') || 'Unknown error';
                throw new Error(`Quote creation failed: ${quoteResponse.status} ${quoteResponse.statusText} - ${errorMessage}`);
            }

            const quoteData = await quoteResponse.json();
            const quoteId = quoteData.data?.id;
            
            if (!quoteId) {
                throw new Error('Invalid quote ID received from API');
            }
            const bookingData = {
                data: {
                    quote_id: quoteId,
                    guests: bookingParams.guests,
                    payment: {
                        type: 'balance',
                        amount: quoteData.data.total_amount,
                        currency: quoteData.data.total_currency
                    },
                    metadata: {
                        contact_email: bookingParams.email,
                        contact_phone: bookingParams.phone_number,
                        special_requests: bookingParams.special_requests || ''
                    }
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
                const errorData = await bookingResponse.json().catch(() => ({}));
                const errorMessage = errorData?.errors?.map((e: { message: string }) => e.message).join(', ') || 'Unknown error';
                throw new Error(`Booking failed: ${bookingResponse.status} ${bookingResponse.statusText} - ${errorMessage}`);
            }

            const booking = await bookingResponse.json();
            
            if (!booking.data?.id) {
                throw new Error('Invalid booking response from API');
            }

            return {
                success: true,
                status: 'confirmed',
                bookingReference: booking.data.id,
                confirmationNumber: booking.data.reference || booking.data.id,
                bookingDetails: {
                    ...booking.data,
                    guests: booking.data.guests?.map((g: any) => ({
                        given_name: g.given_name,
                        family_name: g.family_name,
                        type: g.type
                    })) || [],
                    check_in: booking.data.check_in,
                    check_out: booking.data.check_out,
                    status: booking.data.status
                }
            };
        } catch (error) {
            console.error('Error booking hotel:', error);
            return {
                success: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                bookingDetails: {}
            };
        }
    }
}
export const duffelProvider = new DuffelProvider();
