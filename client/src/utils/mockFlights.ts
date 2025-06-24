import { Flight, FlightSegment, Airport, FlightPrice } from '@shared/types/flight';

// Helper function to create airport data
const createAirport = (iataCode: string, name: string, city: string, isOrigin: boolean): Airport => ({
  iataCode,
  name,
  city,
  country: 'USA',
  timezone: 'America/New_York',
  latitude: isOrigin ? 40.7128 : 34.0522, // NY vs LA
  longitude: isOrigin ? -74.0060 : -118.2437,
});

// Helper to create carrier information
const createCarrier = (i: number) => ({
  code: ['DL', 'UA', 'AA', 'WN', 'B6'][i % 5],
  name: ['Delta', 'United', 'American', 'Southwest', 'JetBlue'][i % 5],
});

// Helper to create aircraft information
const createAircraft = () => ({
  code: 'B737',
  name: 'Boeing 737',
});

// Interface for carrier information
interface CarrierInfo {
  code: string;
  name: string;
  logoUrl?: string;
}

// Helper to create a flight segment
const createFlightSegment = (
  i: number, 
  departureAirport: Airport, 
  arrivalAirport: Airport, 
  departureTime: Date, 
  arrivalTime: Date,
  carrier: CarrierInfo
): FlightSegment => {
  // Create carrier objects with all required properties
  const carrierInfo: CarrierInfo = {
    code: carrier.code || 'DL',
    name: carrier.name || 'Delta',
    logoUrl: ''
  };
  
  const operatingCarrier = {
    code: carrierInfo.code,
    name: carrierInfo.name
  } as const;
  
  const marketingCarrier = {
    code: carrierInfo.code,
    name: carrierInfo.name
  } as const;
  
  // Create the flight segment with all required properties
  return {
    id: `SEG-${i}`,
    departure: {
      airport: departureAirport,
      scheduledTime: departureTime.toISOString(),
      terminal: String(Math.floor(Math.random() * 5) + 1),
      gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 20) + 1}`,
    },
    arrival: {
      airport: arrivalAirport,
      scheduledTime: arrivalTime.toISOString(),
      terminal: String(Math.floor(Math.random() * 5) + 1),
      gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 20) + 1}`,
    },
    carrier: carrierInfo,
    operatingCarrier: operatingCarrier,
    marketingCarrier: marketingCarrier,
    flightNumber: `${100 + i}`,
    aircraft: createAircraft(),
    cabin: 'economy',
    duration: Math.floor((arrivalTime.getTime() - departureTime.getTime()) / 60000),
    fareBasis: 'Y',
    bookingClass: 'Y'
  };
};

// Helper to create flight price
const createFlightPrice = (): FlightPrice => {
  const amount = 100 + Math.floor(Math.random() * 900);
  return {
    amount,
    currency: 'USD',
    formatted: `$${amount.toFixed(2)}`,
    taxes: 50 + Math.floor(Math.random() * 50),
    fees: 25 + Math.floor(Math.random() * 25),
    baseFare: amount - 75, // Simple calculation for base fare
  };
};

/**
 * Generates mock flight data for development and testing
 */
export const generateMockFlights = (
  searchParams: {
    origin: string;
    destination: string;
    departureDate: Date;
    cabin: string;
    passengers: number;
  },
  isReturn: boolean
): Flight[] => {
  const flights: Flight[] = [];
  const baseDate = searchParams.departureDate;
  
  if (!baseDate) return [];
  
  const originIata = isReturn ? searchParams.destination : searchParams.origin;
  const destIata = isReturn ? searchParams.origin : searchParams.destination;
  
  if (!originIata || !destIata) return [];
  
  // Generate 3-5 mock flights
  const flightCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < flightCount; i++) {
    const departureTime = new Date(baseDate);
    departureTime.setHours(6 + i * 2);
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(departureTime.getHours() + 2 + Math.random() * 2);
    
    const originAirport = createAirport(
      originIata,
      isReturn ? 'Destination Airport' : 'Origin Airport',
      isReturn ? 'Destination City' : 'Origin City',
      !isReturn
    );
    
    const destAirport = createAirport(
      destIata,
      isReturn ? 'Origin Airport' : 'Destination Airport',
      isReturn ? 'Origin City' : 'Destination City',
      isReturn
    );
    
    const carrier = createCarrier(i);
    // Ensure carrier has required properties with fallbacks
    const carrierInfo: CarrierInfo = {
      code: carrier.code || 'DL',
      name: carrier.name || 'Delta',
      logoUrl: ''
    };
    
    const segment = createFlightSegment(
      i,
      originAirport,
      destAirport,
      departureTime,
      arrivalTime,
      carrierInfo
    );
    
    const price = createFlightPrice();
    
    const flight: Flight = {
      id: `FL-${isReturn ? 'RET' : 'OUT'}-${1000 + i}`,
      type: isReturn ? 'return' : 'departure',
      segments: [segment],
      price,
      duration: segment.duration,
      stops: 0,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      refundable: Math.random() > 0.5,
      changeable: Math.random() > 0.3,
      cabin: searchParams.cabin as 'economy' | 'premium' | 'business' | 'first',
      airline: carrier.name,
      flightNumber: segment.flightNumber,
    };
    
    flights.push(flight);
  }
  
  return flights;
};

// Mock airports for search suggestions
export const MOCK_AIRPORTS = [
  { 
    iataCode: 'JFK', 
    name: 'John F. Kennedy International Airport', 
    city: 'New York',
    country: 'USA',
    timezone: 'America/New_York',
    latitude: 40.7128,
    longitude: -74.0060
  },
  { 
    iataCode: 'LAX', 
    name: 'Los Angeles International Airport', 
    city: 'Los Angeles',
    country: 'USA',
    timezone: 'America/Los_Angeles',
    latitude: 34.0522,
    longitude: -118.2437
  },
  { 
    iataCode: 'ORD', 
    name: "O'Hare International Airport", 
    city: 'Chicago',
    country: 'USA',
    timezone: 'America/Chicago',
    latitude: 41.8781,
    longitude: -87.6298
  },
  { 
    iataCode: 'LHR', 
    name: 'Heathrow Airport', 
    city: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    latitude: 51.5074,
    longitude: -0.1278
  },
  { 
    iataCode: 'CDG', 
    name: 'Charles de Gaulle Airport', 
    city: 'Paris',
    country: 'France',
    timezone: 'Europe/Paris',
    latitude: 48.8566,
    longitude: 2.3522
  },
  { 
    iataCode: 'DXB', 
    name: 'Dubai International Airport', 
    city: 'Dubai',
    country: 'UAE',
    timezone: 'Asia/Dubai',
    latitude: 25.2048,
    longitude: 55.2708
  }
];

// Cabin class options
export const CABIN_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];
