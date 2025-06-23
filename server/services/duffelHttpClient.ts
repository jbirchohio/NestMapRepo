if (!process.env.DUFFEL_API_KEY) {
    throw new Error('DUFFEL_API_KEY environment variable is required');
}
const DUFFEL_API_BASE = 'https://api.duffel.com';
export interface DuffelFlightSearchParams {
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
export interface DuffelFlightOffer {
    id: string;
    total_amount: string;
    total_currency: string;
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
        segments: Array<{
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
            origin: {
                iata_code: string;
                name: string;
            };
            destination: {
                iata_code: string;
                name: string;
            };
        }>;
    }>;
    passengers: Array<{
        type: string;
        fare_basis_code?: string;
        cabin_class: string;
        baggages?: Array<{
            type: string;
            quantity: number;
        }>;
    }>;
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
}
export class DuffelHTTPClient {
    private baseURL = DUFFEL_API_BASE;
    private apiKey = process.env.DUFFEL_API_KEY!;
    async request(endpoint: string, options: RequestInit = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Duffel-Version': 'v2',
            'Accept': 'application/json',
            ...options.headers
        };
        console.log(`Duffel API Request: ${options.method || 'GET'} ${url}`);
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Duffel API Error: ${response.status} ${errorText}`);
                throw new Error(`Duffel API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`Duffel API Response: ${response.status} - Data received`);
            return data;
        }
        catch (error: any) {
            console.error('Duffel API Request Failed:', error.message);
            throw error;
        }
    }
    /**
     * Search for flights using Duffel API
     */
    async searchFlights(params: DuffelFlightSearchParams): Promise<DuffelFlightOffer[]> {
        try {
            console.log('Searching flights with Duffel API:', params);
            // Create offer request data
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
            // Create offer request
            const offerRequest = await this.request('/air/offer_requests', {
                method: 'POST',
                body: JSON.stringify({ data: offerRequestData })
            });
            console.log('Duffel offer request created:', offerRequest.data.id);
            // Get offers from the request
            const offersResponse = await this.request(`/air/offers?offer_request_id=${offerRequest.data.id}&limit=50`);
            console.log(`Found ${offersResponse.data.length} flight offers`);
            return offersResponse.data;
        }
        catch (error: any) {
            console.error('Duffel flight search error:', error);
            throw new Error(`Flight search failed: ${error.message}`);
        }
    }
    /**
     * Get specific offer details
     */
    async getOffer(offerId: string): Promise<DuffelFlightOffer> {
        try {
            const offerResponse = await this.request(`/air/offers/${offerId}`);
            return offerResponse.data;
        }
        catch (error: any) {
            console.error('Duffel get offer error:', error);
            throw new Error(`Failed to get offer: ${error.message}`);
        }
    }
    /**
     * Search airports for autocomplete
     */
    async searchAirports(query: string): Promise<Array<{
        iata_code: string;
        name: string;
        city_name: string;
        city: {
            country_name: string;
        };
    }>> {
        try {
            const response = await this.request(`/air/airports?name=${encodeURIComponent(query)}&limit=10`);
            return response.data;
        }
        catch (error: any) {
            console.error('Duffel airport search error:', error);
            throw new Error(`Airport search failed: ${error.message}`);
        }
    }
    /**
     * Create booking
     */
    async createBooking(bookingData: {
        selected_offers: string[];
        passengers: Array<{
            title: string;
            given_name: string;
            family_name: string;
            born_on: string;
            email: string;
            phone_number: string;
            gender: string;
        }>;
        payments: Array<{
            type: string;
        }>;
    }) {
        try {
            console.log('Creating booking with Duffel API');
            const response = await this.request('/air/orders', {
                method: 'POST',
                body: JSON.stringify({ data: bookingData })
            });
            console.log('Duffel booking created:', response.data.id);
            return response.data;
        }
        catch (error: any) {
            console.error('Duffel booking error:', error);
            throw new Error(`Booking failed: ${error.message}`);
        }
    }
    /**
     * Cancel booking
     */
    async cancelBooking(bookingId: string) {
        try {
            console.log('Cancelling booking with Duffel API:', bookingId);
            const response = await this.request('/air/order_cancellations', {
                method: 'POST',
                body: JSON.stringify({
                    data: { order_id: bookingId }
                })
            });
            console.log('Duffel booking cancelled:', response.data.id);
            return response.data;
        }
        catch (error: any) {
            console.error('Duffel cancel booking error:', error);
            throw new Error(`Cancellation failed: ${error.message}`);
        }
    }
}
export const duffelClient = new DuffelHTTPClient();
