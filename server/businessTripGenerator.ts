// Core imports
import { v4 as uuidv4 } from 'uuid';

// Service imports
import { searchFlights, searchHotels } from './bookingProviders.js';
// Define local type interfaces for AI and optimization utilities
interface PricePrediction {
  amount: number;
  confidence: number;
}

interface CrowdPrediction {
  level: 'low' | 'moderate' | 'high' | 'peak';
  description: string;
  confidence: number;
}

interface WeatherAdaptation {
  activities: any[];
  recommendations: string[];
}

interface CarbonFootprint {
  totalCO2kg: number;
  flightsCO2: number;
  accommodationCO2: number;
  transportationCO2: number;
}

// Import functions with proper type assertions
const {
  predictFlightPrices,
  predictCrowdLevels,
  generateWeatherAdaptiveItinerary
} = require('./predictiveAI');

const {
  optimizeScheduleIntelligently,
  detectScheduleConflicts
} = require('./smartOptimizer');

const { calculateCarbonFootprint } = require('./carbonTracker');

// Helper to extract city from different flight segment formats
const extractCity = (flight: unknown, type: 'departure' | 'arrival'): string => {
  if (!flight || typeof flight !== 'object') return '';
  
  // Safely access the departure or arrival property
  const segment = flight as { [key: string]: unknown };
  const point = segment[type];
  
  if (!point || typeof point !== 'object' || point === null) return '';
  
  const pointObj = point as { airport?: unknown };
  
  // Handle airport as an object with city property
  if (pointObj.airport) {
    // Airport is an object with city property
    if (typeof pointObj.airport === 'object' && pointObj.airport !== null) {
      const airport = pointObj.airport as { city?: unknown };
      if (typeof airport.city === 'string') {
        return airport.city;
      }
    } 
    // Handle direct airport string
    else if (typeof pointObj.airport === 'string') {
      return pointObj.airport;
    }
  }
  
  return '';
};

// Shared types
import type { 
  BusinessTripRequest,
  FlightSearchParams,
  HotelSearchParams,
  DateRange,
  FlightSearchResult,
  FlightSegment as SharedFlightSegment,
  GeneratedBusinessTrip,
  LocalGeneratedBusinessTrip,
  Conflict,
  Accommodation,
  Meal,
  Transportation,
  TravelPolicy
} from '@shared/src/types/trip/business-trip.types.js';

// Extended FlightSegment with price information and baggage allowance
interface FlightSegmentWithPrice extends Omit<SharedFlightSegment, 'id'> {
  id: string;
  price?: {
    amount: number;
    currency: string;
  };
  // Ensure baggageAllowance is properly typed
  baggageAllowance: {
    carryOn: number;
    checked: number;
  };
  bookingUrl?: string;
}

// Local extension of LocalGeneratedBusinessTrip to include id and other required properties
interface LocalBusinessTrip extends Omit<LocalGeneratedBusinessTrip, 'id' | 'tripSummary'> {
  id: string;
  // Override flights to use our extended type with price
  flights: FlightSegmentWithPrice[];
  // Ensure tripSummary includes all required properties
  tripSummary: {
    title: string;
    description: string;
    totalCost: number;
    carbonFootprint: number;
    duration: number;
    startDate: string;
    endDate: string;
    budgetBreakdown: {
      flights: number;
      hotels: number;
      meals: number;
      activities: number;
      transportation: number;
      other: number;
    };
  };
  // Add other required properties from LocalGeneratedBusinessTrip
  accommodation: any[];
  activities: any[];
  workSchedule: any[];
  meals: any[];
  transportation: any[];
  conflicts: any[];
  recommendations: string[];
  weatherConsiderations: {
    forecast: any[];
    packingSuggestions: string[];
    potentialDisruptions: string[];
  };
  complianceNotes: string[];
}

// Interface for flight segment from the search API
interface SearchFlightSegment {
  id: string;
  departure: {
    airport: {
      code: string;
      name: string;
      city: string;
      country: string;
    };
    time: string;
  };
  arrival: {
    airport: {
      code: string;
      name: string;
      city: string;
      country: string;
    };
    time: string;
  };
  airline: {
    code: string;
    name: string;
  };
  flightNumber: string;
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  segments?: SearchFlightSegment[];
}

// Helper function to parse ISO 8601 duration string to minutes
function parseFlightDuration(duration: string): number {
  if (!duration) return 0;
  
  // Handle ISO 8601 duration format (e.g., PT2H30M)
  const matches = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!matches) return 0;
  
  const hours = matches[1] ? parseInt(matches[1]) : 0;
  const minutes = matches[2] ? parseInt(matches[2]) : 0;
  
  return hours * 60 + minutes;
}

// Helper function to calculate sustainability metrics
function calculateSustainabilityMetrics(trip: LocalGeneratedBusinessTrip): {
  carbonFootprint: number;
  energyUsage: number;
  wasteReduction: number;
} {
  // Calculate carbon footprint (simplified for now)
  const flightCarbon = trip.flights.length * 200; // Simplified carbon calculation
  const hotelCarbon = (trip.accommodation?.length || 0) * 50; // Simplified carbon calculation
  const transportCarbon = (trip.transportation?.length || 0) * 10; // Simplified carbon calculation
  
  // Calculate energy usage and waste reduction (simplified)
  const energyUsage = (trip.accommodation?.length || 0) * 10; // Simplified energy usage
  const wasteReduction = (trip.accommodation?.length || 0) * 5; // Simplified waste reduction
  
  return {
    carbonFootprint: flightCarbon + hotelCarbon + transportCarbon,
    energyUsage,
    wasteReduction
  };
}

// Helper function to generate compliance notes
function generateComplianceNotes(trip: LocalGeneratedBusinessTrip, policy: TravelPolicy): string[] {
  const notes: string[] = [];
  
  if (!policy) return notes;
  
  // Check flight class compliance
  if (policy.businessClassAllowed === false) {
    const hasBusinessClass = (trip.flights || []).some(flight => 
      flight.cabinClass === 'business' || flight.cabinClass === 'first'
    );
    
    if (hasBusinessClass) {
      notes.push('Business/First class flights require special approval according to travel policy');
    }
  }
  
  // Check hotel budget compliance
  if (policy.maxHotelRate) {
    const overBudgetHotels = (trip.accommodation || []).filter(hotel => 
      (hotel.rate?.amount || 0) > policy.maxHotelRate
    );
    
    if (overBudgetHotels.length > 0) {
      notes.push(`${overBudgetHotels.length} hotel(s) exceed the maximum allowed rate of ${policy.maxHotelRate} ${trip.accommodation?.[0]?.rate?.currency || 'USD'}`);
    }
  }
  
  // Check advance booking requirements
  if (policy.requiresAdvanceBooking) {
    const now = new Date();
    const departure = new Date(trip.tripSummary.startDate);
    const daysInAdvance = Math.ceil((departure.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysInAdvance < policy.requiresAdvanceBooking) {
      notes.push(`Booking made only ${daysInAdvance} days in advance, policy requires ${policy.requiresAdvanceBooking} days`);
    }
  }
  
  return notes;
}

// Helper function to get location string from Location object or string
function getLocationString(location: string | { city: string; country: string; code?: string }): string {
  if (typeof location === 'string') return location;
  return `${location.city}, ${location.country}${location.code ? ` (${location.code})` : ''}`;
}

// Helper function to enhance trip with real data
async function enhanceTripWithRealData(
  trip: LocalGeneratedBusinessTrip, 
  request: BusinessTripRequest
): Promise<LocalGeneratedBusinessTrip> {
  try {
    // Search for flights
    const flightParams: FlightSearchParams = {
      origin: request.destination.city,
      destination: request.destination.city,
      departureDate: request.dates.departure,
      returnDate: request.dates.return,
      passengers: request.groupSize,
      preferredAirlines: request.traveler.preferences?.hotelPreferences
    };
    
    const flightResults = await searchFlights(flightParams);
    
    // Map flight results to FlightSegmentWithPrice
    if (flightResults && flightResults.length > 0) {
      const flights: FlightSegmentWithPrice[] = [];
      
      flightResults.forEach((result) => {
        // Safely access flight properties with type assertions
        const flightData = result as unknown as {
          departure?: { airport: { code: string; city: string; country: string }; time: string };
          arrival?: { airport: { code: string; city: string; country: string }; time: string };
          airline?: { name: string; code?: string };
          flightNumber?: string;
          duration?: string;
          price?: { amount: number; currency: string };
        };
        
        const departureAirport = flightData.departure?.airport || { code: 'UNKNOWN', city: 'Unknown', country: 'Unknown' };
        const arrivalAirport = flightData.arrival?.airport || { code: 'UNKNOWN', city: 'Unknown', country: 'Unknown' };
        const airline = flightData.airline || { name: 'Unknown' };
        const flightNumber = flightData.flightNumber || 'UNKNOWN';
        const duration = flightData.duration || 'PT0H';
        const price = flightData.price || { amount: 0, currency: 'USD' };
        
        // Create main flight segment with proper baggage allowance
        const flightSegment: FlightSegmentWithPrice = {
          id: result.id,
          departure: {
            airport: departureAirport.code,
            time: flightData.departure?.time || new Date().toISOString(),
            terminal: '',
            gate: ''
          },
          arrival: {
            airport: arrivalAirport.code,
            time: flightData.arrival?.time || new Date().toISOString(),
            terminal: '',
            gate: ''
          },
          airline: airline.name,
          flightNumber,
          duration: parseFlightDuration(duration),
          cabinClass: 'economy',
          baggageAllowance: {
            carryOn: 1,
            checked: 1
          },
          price,
          bookingUrl: ''
        };
        
        flights.push(flightSegment);
        
        // Process any segments if they exist in the API response
        const segments = (result as any).segments as Array<{
          departure: { airport: { code: string }; time: string };
          arrival: { airport: { code: string }; time: string };
          airline: { name: string };
          flight_number: string;
          duration: string;
          price?: { amount: number; currency: string };
        }> | undefined;

        if (segments && segments.length > 0) {
          segments.forEach((segment, segmentIndex) => {
            const segmentPrice = segment.price || {
              amount: price.amount / (segments.length + 1),
              currency: price.currency
            };
            
            const segmentFlight: FlightSegmentWithPrice = {
              id: `${result.id}-seg${segmentIndex}`,
              departure: {
                airport: segment.departure.airport.code,
                time: segment.departure.time,
                terminal: '',
                gate: ''
              },
              arrival: {
                airport: segment.arrival.airport.code,
                time: segment.arrival.time,
                terminal: '',
                gate: ''
              },
              airline: segment.airline.name,
              flightNumber: segment.flight_number,
              duration: parseFlightDuration(segment.duration),
              cabinClass: 'economy',
              baggageAllowance: {
                carryOn: 1,
                checked: 1
              },
              price: segmentPrice,
              bookingUrl: ''
            };
            
            flights.push(segmentFlight);
          });
        }
      });
      
      trip.flights = flights;
    }
    
    // Search for hotels
    const hotelParams: HotelSearchParams = {
      destination: request.destination.city,
      checkIn: request.dates.departure,
      checkOut: request.dates.return,
      guests: request.groupSize,
      rooms: Math.ceil(request.groupSize / 2) // Assuming 2 people per room
    };
    
    const hotelResults = await searchHotels(hotelParams);
    
    // Map hotels to accommodation
    trip.accommodation = hotelResults.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      type: 'hotel' as const,
      address: {
        line1: hotel.address,
        city: hotel.city,
        country: hotel.country,
        postalCode: hotel.postalCode || ''
      },
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      roomType: 'Standard', // Default, can be enhanced
      rate: {
        amount: hotel.price.amount,
        currency: hotel.price.currency,
        includesBreakfast: false, // Default
        isRefundable: true // Default
      },
      amenities: hotel.amenities || [],
      distanceFromVenue: {
        value: 0, // Default, can be enhanced
        unit: 'kilometers' as const
      }
    }));

    // extractCity function is now at the top level of the file

    // Type guard to check if object has a price property with amount
    const hasPrice = (obj: unknown): obj is { price: { amount: number; currency?: string } } => {
      return (
        typeof obj === 'object' && 
        obj !== null && 
        'price' in obj && 
        typeof obj.price === 'object' && 
        obj.price !== null && 
        'amount' in obj.price && 
        typeof (obj.price as { amount: unknown }).amount === 'number'
      );
    };

    // Type guard to check if object has a rate property with amount
    const hasRate = (obj: unknown): obj is { rate: { amount: number; currency?: string } } => {
      return (
        typeof obj === 'object' && 
        obj !== null && 
        'rate' in obj && 
        typeof obj.rate === 'object' && 
        obj.rate !== null && 
        'amount' in obj.rate && 
        typeof (obj.rate as { amount: unknown }).amount === 'number'
      );
    };
    
    // Type guard to check if object is a flight segment with nested airport details
    const isNestedAirportSegment = (obj: unknown): obj is 
      { departure: { airport: { city?: string } }, arrival: { airport: { city?: string } } } => {
      try {
        const dep = obj as { departure?: { airport?: { city?: unknown } } };
        const arr = obj as { arrival?: { airport?: { city?: unknown } } };
        
        return (
          typeof obj === 'object' &&
          obj !== null &&
          dep.departure !== undefined &&
          dep.departure !== null &&
          typeof dep.departure === 'object' &&
          dep.departure.airport !== undefined &&
          dep.departure.airport !== null &&
          typeof dep.departure.airport === 'object' &&
          arr.arrival !== undefined &&
          arr.arrival !== null &&
          typeof arr.arrival === 'object' &&
          arr.arrival.airport !== undefined &&
          arr.arrival.airport !== null &&
          typeof arr.arrival.airport === 'object'
        );
      } catch (e) {
        return false;
      }
    };

    // Calculate total cost from flights and accommodation
    const flightCost = (trip.flights || []).reduce<number>((sum, flight) => {
      // Safely access price amount with type checking
      const price = hasPrice(flight) ? flight.price.amount : 0;
      return sum + (price || 0);
    }, 0);

    const hotelCost = (trip.accommodation || []).reduce<number>((sum, hotel) => {
      // Safely access hotel rate with type checking
      const rate = hasRate(hotel) ? hotel.rate.amount : 0;
      return sum + (rate || 0);
    }, 0);

    const totalCost = flightCost + hotelCost;
    
    // Get predicted flight prices for better cost estimation (if needed)
    if (trip.flights?.length) {
      try {
        // Get origin and destination from the first flight if available
        let originCity = '';
        let destinationCity = '';
        
        const firstFlight = trip.flights[0];
        if (firstFlight) {
          // Extract cities using the helper function
          originCity = extractCity(firstFlight, 'departure');
          destinationCity = extractCity(firstFlight, 'arrival');
        }
        
        const predictedPrices = await predictFlightPrices({
          origin: originCity,
          destination: destinationCity,
          departureDate: trip.tripSummary.startDate,
          returnDate: trip.tripSummary.endDate
        });

        // Update trip with predicted prices if available
        trip.flights = trip.flights.map(flight => {
          // Create a unique identifier for the flight
          let airlineCode = '';
          let flightNumber = '';
          
          // Extract airline code with type safety
          if (flight.airline) {
            if (typeof flight.airline === 'string') {
              airlineCode = flight.airline;
            } else if (typeof flight.airline === 'object' && flight.airline !== null) {
              const airline = flight.airline as Record<string, unknown>;
              if ('code' in airline && typeof airline.code === 'string') {
                airlineCode = airline.code;
              }
            }
          }
          
          // Extract flight number with type safety
          if ('flightNumber' in flight) {
            const flightRecord = flight as { flightNumber?: unknown };
            const flightNum = flightRecord.flightNumber;
            if (typeof flightNum === 'string') {
              flightNumber = flightNum;
            } else if (typeof flightNum === 'number') {
              flightNumber = flightNum.toString();
            }
          }
          
          // Create flight ID
          const flightId = 'id' in flight && flight.id !== undefined 
            ? String(flight.id)
            : airlineCode && flightNumber 
              ? `${airlineCode}${flightNumber}`
              : Math.random().toString(36).substr(2, 9);
          
          // Get predicted price or fall back to current price
          const predictedPrice = predictedPrices && flightId 
            ? (predictedPrices as Record<string, PricePrediction>)[flightId]?.amount 
            : undefined;
            
          // Get current price with type safety
          const currentPrice = hasPrice(flight) ? flight.price.amount : 0;
          
          // Get currency with type safety
          const currency = 
            hasPrice(flight) && 
            'currency' in flight.price && 
            typeof flight.price.currency === 'string'
              ? flight.price.currency
              : 'USD';
          
          return {
            ...flight,
            price: {
              amount: predictedPrice || currentPrice || 0,
              currency: currency
            }
          } as FlightSegmentWithPrice;
        });
      } catch (error) {
        console.error('Error predicting flight prices:', error);
      }
    }

    // Update trip summary with costs
    trip.tripSummary = {
      ...trip.tripSummary,
      totalCost,
      budgetBreakdown: {
        flights: flightCost,
        hotels: hotelCost,
        meals: 0, // Will be calculated
        activities: 0, // Will be calculated
        transportation: 0, // Will be calculated
        other: 0 // For any additional expenses
      }
    };

    // Add sustainability metrics
    const metrics = calculateSustainabilityMetrics(trip);
    
    try {
      const carbonFootprint = await calculateCarbonFootprint(
        trip.flights || [],
        trip.accommodation || [],
        trip.transportation || []
      ) as CarbonFootprint;
      trip.tripSummary.carbonFootprint = carbonFootprint.totalCO2kg;
    } catch (error) {
      console.error('Error calculating carbon footprint:', error);
      trip.tripSummary.carbonFootprint = 0; // Default value
    }
    
    // Get crowd level predictions
    try {
      // Get destination city from the first flight's arrival if available
      let destinationCity = '';
      const firstFlight = trip.flights?.[0];
      
      if (firstFlight) {
        destinationCity = extractCity(firstFlight, 'arrival');
      }
      
      if (destinationCity) {
        const crowdLevels = await predictCrowdLevels(
          destinationCity,
          trip.tripSummary.startDate,
          trip.tripSummary.endDate
        ) as CrowdPrediction;
        
        // Initialize weather considerations if not present
        if (!trip.weatherConsiderations) {
          trip.weatherConsiderations = {
            forecast: [],
            packingSuggestions: [],
            potentialDisruptions: []
          };
        }
        
        // Add crowd level information
        if (crowdLevels?.level && crowdLevels?.description) {
          trip.weatherConsiderations.potentialDisruptions = [
            ...(trip.weatherConsiderations.potentialDisruptions || []),
            `Expected crowd levels: ${crowdLevels.level} (${crowdLevels.description})`
          ];
        }
      }
    } catch (error) {
      console.error('Error predicting crowd levels:', error);
    }

    // Add compliance notes if company policy exists
    if (request.company.travelPolicy) {
      // Use type assertion to handle the undefined case
      trip.complianceNotes = generateComplianceNotes(trip as LocalGeneratedBusinessTrip, request.company.travelPolicy as TravelPolicy);
    }
    
    return trip;
  } catch (error) {
    console.error('Error enhancing trip with real data:', error);
    throw new Error('Failed to enhance trip with real data');
  }
}

// Helper function to generate business recommendations
function generateBusinessRecommendations(_trip: LocalBusinessTrip): string[] {
  // Implement recommendation logic here
  return [
    'Consider booking flights during off-peak hours for better rates',
    'Check for any visa requirements for your destination',
    'Verify hotel cancellation policies before booking'
  ];
}

// Helper function to generate date range
function generateDateRange(startDate: string, duration: number): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + duration);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
}

// Quick trip generation for simple requests
async function generateQuickBusinessTrip(
  destination: string, 
  duration: number, 
  budget: number,
  purpose: string
): Promise<LocalBusinessTrip> {
  const tripId = `trip_${uuidv4().substring(0, 8)}`;
  const now = new Date();
  const { startDate, endDate } = generateDateRange(now.toISOString(), duration);
  
  // Calculate budget breakdown (simplified for quick trip)
  const budgetBreakdown = {
    flights: Math.round(budget * 0.4), // 40% for flights
    hotels: Math.round(budget * 0.3),  // 30% for hotels
    meals: Math.round(budget * 0.15),  // 15% for meals
    activities: Math.round(budget * 0.1), // 10% for activities
    transportation: Math.round(budget * 0.03), // 3% for local transport
    contingency: Math.max(0, budget * 0.02) // 2% for contingency (or 0 if negative)
  };
  
  // Create budget breakdown for trip summary (with 'other' field)
  const tripSummaryBudgetBreakdown = {
    ...budgetBreakdown,
    other: budgetBreakdown.contingency // Map contingency to other for trip summary
  };
  
  // Create a new trip object with all required fields
  const trip: LocalBusinessTrip = {
    id: tripId,
    tripSummary: {
      title: `${purpose} Trip to ${destination}`,
      description: `Business trip to ${destination} for ${purpose} lasting ${duration} days`,
      totalCost: 0, // Will be updated with real data
      carbonFootprint: 0, // Will be calculated later
      duration,
      startDate,
      endDate,
      budgetBreakdown: tripSummaryBudgetBreakdown
    },
    // Add the budgetBreakdown at the root level as well to match the interface
    budgetBreakdown: budgetBreakdown,
    flights: [],
    accommodation: [],
    activities: [],
    workSchedule: [],
    meals: [],
    transportation: [],
    conflicts: [],
    recommendations: [],
    weatherConsiderations: {
      forecast: [],
      packingSuggestions: [],
      potentialDisruptions: []
    },
    complianceNotes: []
  };
  
  // Generate initial recommendations
  trip.recommendations = generateBusinessRecommendations(trip);
  
  try {
    // Optimize schedule and detect conflicts
    if (trip.workSchedule?.length) {
      const optimizedSchedule = await optimizeScheduleIntelligently(
        trip.workSchedule,
        trip.activities || [],
        trip.transportation || []
      ) as any[];
      
      const scheduleConflicts = await detectScheduleConflicts(
        trip.workSchedule,
        trip.activities || []
      ) as any[];
      
      // Update trip with optimized schedule and conflicts
      if (Array.isArray(optimizedSchedule)) {
        trip.workSchedule = optimizedSchedule;
      }
      
      if (Array.isArray(scheduleConflicts)) {
        trip.conflicts = [...(trip.conflicts || []), ...scheduleConflicts];
      }
    }
    
    // Generate weather-adaptive itinerary if there are activities
    if (trip.activities?.length) {
      // Get destination city from the first flight's arrival if available
      let destinationCity = '';
      const firstFlight = trip.flights?.[0];
      
      if (firstFlight) {
        destinationCity = extractCity(firstFlight, 'arrival');
      }
      
      if (destinationCity) {
        try {
          const weatherAdaptation = await generateWeatherAdaptiveItinerary(
            destinationCity,
            trip.tripSummary.startDate,
            trip.tripSummary.endDate,
            trip.activities
          ) as WeatherAdaptation;
          
          // Update activities with weather-adaptive suggestions
          if (weatherAdaptation) {
            // Only update activities if we got a valid array back
            if (Array.isArray(weatherAdaptation.activities)) {
              trip.activities = weatherAdaptation.activities;
            }
            
            // Add any new recommendations
            if (Array.isArray(weatherAdaptation.recommendations)) {
              trip.recommendations = [
                ...(trip.recommendations || []),
                ...weatherAdaptation.recommendations
              ];
            }
          }
        } catch (error) {
          console.error('Error generating weather-adaptive itinerary:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error optimizing schedule or adapting to weather:', error);
  }
  
  return trip;
}

// ... (rest of the code remains the same)
// Export all functions
export {
  generateQuickBusinessTrip,
  enhanceTripWithRealData,
  generateBusinessRecommendations,
  calculateSustainabilityMetrics,
  generateComplianceNotes,
  parseFlightDuration,
  generateDateRange,
  getLocationString
};

// Export types
export type {
  LocalGeneratedBusinessTrip as BusinessTrip,
  BusinessTripRequest,
  FlightSearchParams,
  HotelSearchParams,
  DateRange
};

// Default export with all functionality
export default {
  // Core functions
  generateQuick: generateQuickBusinessTrip,
  enhance: enhanceTripWithRealData,
  getRecommendations: generateBusinessRecommendations,
  
  // Helper functions
  calculateMetrics: calculateSustainabilityMetrics,
  getComplianceNotes: generateComplianceNotes,
  parseDuration: parseFlightDuration,
  generateDateRange,
  getLocation: getLocationString,
  
  // Types
  types: {
    Trip: {} as LocalGeneratedBusinessTrip,
    Request: {} as BusinessTripRequest,
    FlightSearch: {} as FlightSearchParams,
    HotelSearch: {} as HotelSearchParams,
    DateRange: {} as DateRange
  }
};
