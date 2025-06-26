import { format } from 'date-fns';
// Helper function to convert city names to airport codes
function convertCityToAirportCode(cityOrCode: string): string {
    const cityToAirport: Record<string, string> = {
        'new york': 'JFK',
        'new york city': 'JFK',
        'nyc': 'JFK',
        'los angeles': 'LAX',
        'la': 'LAX',
        'san francisco': 'SFO',
        'sf': 'SFO',
        'chicago': 'ORD',
        'miami': 'MIA',
        'boston': 'BOS',
        'seattle': 'SEA',
        'denver': 'DEN',
        'atlanta': 'ATL',
        'dallas': 'DFW',
        'houston': 'IAH',
        'phoenix': 'PHX',
        'las vegas': 'LAS',
        'orlando': 'MCO',
        'washington': 'DCA',
        'washington dc': 'DCA',
        'philadelphia': 'PHL',
        'detroit': 'DTW',
        'minneapolis': 'MSP',
        'portland': 'PDX',
        'salt lake city': 'SLC',
        'nashville': 'BNA',
        'austin': 'AUS',
        'san diego': 'SAN',
        'sacramento': 'SMF',
        'raleigh': 'RDU',
        'charlotte': 'CLT',
        'pittsburgh': 'PIT',
        'cleveland': 'CLE',
        'cincinnati': 'CVG',
        'kansas city': 'MCI',
        'st louis': 'STL',
        'milwaukee': 'MKE',
        'indianapolis': 'IND',
        'columbus': 'CMH',
        'jacksonville': 'JAX',
        'tampa': 'TPA',
        'fort lauderdale': 'FLL',
        'baltimore': 'BWI',
        'richmond': 'RIC',
        'norfolk': 'ORF',
        'memphis': 'MEM',
        'new orleans': 'MSY',
        'birmingham': 'BHM',
        'little rock': 'LIT',
        'oklahoma city': 'OKC',
        'tulsa': 'TUL',
        'albuquerque': 'ABQ',
        'el paso': 'ELP',
        'tucson': 'TUS',
        'fresno': 'FAT',
        'san jose': 'SJC',
        'oakland': 'OAK',
        'long beach': 'LGB',
        'burbank': 'BUR',
        'santa ana': 'SNA',
        'san antonio': 'SAT',
        'corpus christi': 'CRP',
        'mcallen': 'MFE',
        'lubbock': 'LBB',
        'amarillo': 'AMA',
        'wichita': 'ICT',
        'omaha': 'OMA',
        'des moines': 'DSM',
        'cedar rapids': 'CID',
        'davenport': 'DVN',
        'grand rapids': 'GRR',
        'flint': 'FNT',
        'lansing': 'LAN',
        'toledo': 'TOL',
        'akron': 'CAK',
        'dayton': 'DAY',
        'lexington': 'LEX',
        'louisville': 'SDF',
        'evansville': 'EVV',
        'fort wayne': 'FWA',
        'south bend': 'SBN',
        'peoria': 'PIA',
        'rockford': 'RFD',
        'madison': 'MSN',
        'green bay': 'GRB',
        'appleton': 'ATW',
        'duluth': 'DLH',
        'rochester': 'RST',
        'sioux falls': 'FSD',
        'fargo': 'FAR',
        'bismarck': 'BIS',
        'rapid city': 'RAP',
        'billings': 'BIL',
        'great falls': 'GTF',
        'bozeman': 'BZN',
        'missoula': 'MSO',
        'helena': 'HLN',
        'pocatello': 'PIH',
        'boise': 'BOI',
        'spokane': 'GEG',
        'yakima': 'YKM',
        'bellingham': 'BLI',
        'olympia': 'OLM',
        'eugene': 'EUG',
        'medford': 'MFR',
        'redmond': 'RDM',
        'bend': 'RDM',
        'reno': 'RNO',
        'henderson': 'LAS',
        'anchorage': 'ANC',
        'fairbanks': 'FAI',
        'juneau': 'JNU',
        'honolulu': 'HNL',
        'hilo': 'ITO',
        'kona': 'KOA',
        'lihue': 'LIH',
        'kahului': 'OGG',
        'molokai': 'MKK',
        'lanai': 'LNY'
    };
    // If it's already an airport code (3 letters), return as is
    if (/^[A-Z]{3}$/.test(cityOrCode.toUpperCase())) {
        return cityOrCode.toUpperCase();
    }
    // Convert to lowercase for lookup
    const lookup = cityOrCode.toLowerCase().trim();
    // Return airport code if found, otherwise return original (assuming it might be a valid code)
    return cityToAirport[lookup] || cityOrCode.toUpperCase();
}
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
export function generateBookingUrl(type: 'flights' | 'hotels' | 'activities', provider: string, params: Record<string, string>, organizationId?: string): string {
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
interface FlightSearchResult {
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    price: number;
    airline: string;
}
/**
 * Search flights using Kiwi API
 */
export async function searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
}): Promise<FlightSearchResult[]> {
    console.log('searchFlights called with params:', params);
    // Convert city names to airport codes
    const originCode = convertCityToAirportCode(params.origin);
    const destinationCode = convertCityToAirportCode(params.destination);
    console.log(`Converted ${params.origin} -> ${originCode}, ${params.destination} -> ${destinationCode}`);
    try {
        // Format dates to 'YYYY-MM-DD'
        const formattedDepartureDate = format(new Date(params.departureDate), 'yyyy-MM-dd');
        const formattedReturnDate = params.returnDate ? format(new Date(params.returnDate), 'yyyy-MM-dd') : undefined;
        const result = await duffelProvider.searchFlights({
            departure: originCode,
            destination: destinationCode,
            departureDate: formattedDepartureDate,
            returnDate: formattedReturnDate,
            passengers: params.passengers || 1
        });
        console.log('Duffel flight search completed for:', originCode, '→', destinationCode);
        return result.flights || [];
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
