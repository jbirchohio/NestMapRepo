import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Flight search schema validation
const flightSearchSchema = z.object({
  origin: z.string().length(3, 'Origin must be a valid 3-letter airport code'),
  destination: z.string().length(3, 'Destination must be a valid 3-letter airport code'),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  passengers: z.object({
    adults: z.number().min(1, 'At least 1 adult passenger required').max(9, 'Maximum 9 passengers'),
    children: z.number().min(0).max(8).optional(),
    infants: z.number().min(0).max(8).optional()
  }),
  cabin_class: z.enum(['economy', 'premium_economy', 'business', 'first']).optional()
});

// Booking request schema
const bookingRequestSchema = z.object({
  offer_id: z.string().min(1, 'Offer ID is required'),
  passengers: z.array(z.object({
    title: z.enum(['mr', 'ms', 'mrs', 'miss', 'dr']),
    given_name: z.string().min(1, 'First name is required'),
    family_name: z.string().min(1, 'Last name is required'),
    born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format'),
    email: z.string().email('Valid email is required'),
    phone_number: z.string().min(10, 'Valid phone number is required'),
    gender: z.enum(['M', 'F'])
  })).min(1, 'At least one passenger is required'),
  payment: z.object({
    type: z.literal('balance')
  }).optional()
});

// Flight search endpoint
router.post('/search', async (req, res) => {
  try {
    // Validate request body
    const searchParams = flightSearchSchema.parse(req.body);
    
    console.log('Flight search request:', searchParams);

    // Use Duffel HTTP client for authentic flight data
    try {
      const { duffelClient } = await import('../services/duffelHttpClient');
      
      // Search flights using Duffel API
      const duffelOffers = await duffelClient.searchFlights(searchParams);
      
      // Transform Duffel response to our format
      const flights = duffelOffers.map(offer => ({
        id: offer.id,
        price: {
          amount: offer.total_amount,
          currency: offer.total_currency
        },
        slices: offer.slices.map(slice => ({
          origin: {
            iata_code: slice.origin?.iata_code || 'N/A',
            name: slice.origin?.name || 'Unknown Airport',
            city_name: slice.origin?.city_name || slice.origin?.name || 'Unknown City'
          },
          destination: {
            iata_code: slice.destination?.iata_code || 'N/A',
            name: slice.destination?.name || 'Unknown Airport',
            city_name: slice.destination?.city_name || slice.destination?.name || 'Unknown City'
          },
          departure_datetime: slice.segments[0].departing_at,
          arrival_datetime: slice.segments[slice.segments.length - 1].arriving_at,
          duration: slice.segments.reduce((total, seg) => total + parseInt(seg.duration.replace(/[^\d]/g, '')), 0) + 'min',
          segments: slice.segments.map(segment => ({
            airline: {
              name: segment.operating_carrier?.name || 'Unknown Airline',
              iata_code: segment.operating_carrier?.iata_code || 'XX',
              logo_url: segment.operating_carrier?.logo_symbol_url || ''
            },
            flight_number: segment.operating_carrier_flight_number || 'N/A',
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
          cabin_class: passenger.cabin_class,
          baggage: passenger.baggages?.map(baggage => ({
            type: baggage.type,
            quantity: baggage.quantity
          })) || []
        })),
        conditions: {
          change_before_departure: offer.conditions?.change_before_departure,
          cancel_before_departure: offer.conditions?.cancel_before_departure,
          refund_before_departure: offer.conditions?.refund_before_departure
        }
      }));

      return res.json({
        success: true,
        data: flights,
        search_params: searchParams,
        source: 'duffel_api'
      });

    } catch (duffelError: any) {
      console.error('Duffel API error:', duffelError.message);

      return res.status(503).json({
        success: false,
        error: 'Flight search service temporarily unavailable',
        message: 'Unable to retrieve flight information. Please verify Duffel API configuration.',
        details: duffelError.message
      });
    }



  } catch (error: any) {
    console.error('Flight search error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Flight search failed',
      message: error.message
    });
  }
});

// Get specific offer details
router.get('/offers/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    
    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      return res.status(503).json({
        success: false,
        error: 'Duffel service not available',
        message: 'Flight booking service requires API configuration'
      });
    }

    const offer = await duffelService.getOffer(offerId);
    
    res.json({
      success: true,
      data: offer
    });

  } catch (error: any) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get offer details',
      message: error.message
    });
  }
});

// Create booking
router.post('/bookings', async (req, res) => {
  try {
    const bookingData = bookingRequestSchema.parse(req.body);
    
    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      return res.status(503).json({
        success: false,
        error: 'Booking service not available',
        message: 'Flight booking requires Duffel API configuration'
      });
    }

    const booking = await duffelService.createBooking({
      ...bookingData,
      payment: bookingData.payment || { type: 'balance' }
    });
    
    res.json({
      success: true,
      data: booking
    });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Booking failed',
      message: error.message
    });
  }
});

// Get booking details
router.get('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      return res.status(503).json({
        success: false,
        error: 'Booking service not available',
        message: 'Flight booking service requires API configuration'
      });
    }

    const booking = await duffelService.getBooking(bookingId);
    
    res.json({
      success: true,
      data: booking
    });

  } catch (error: any) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking details',
      message: error.message
    });
  }
});

// Cancel booking
router.delete('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      return res.status(503).json({
        success: false,
        error: 'Cancellation service not available',
        message: 'Flight cancellation requires API configuration'
      });
    }

    const result = await duffelService.cancelBooking(bookingId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Cancellation failed',
      message: error.message
    });
  }
});

// Airport search for autocomplete
router.get('/airports/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required and must be at least 2 characters'
      });
    }

    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      // Provide basic airport data as fallback
      const basicAirports = getBasicAirports(q);
      return res.json({
        success: true,
        data: basicAirports,
        note: 'Using basic airport data - Duffel integration available with API key'
      });
    }

    const airports = await duffelService.searchAirports(q);
    
    res.json({
      success: true,
      data: airports
    });

  } catch (error: any) {
    console.error('Airport search error:', error);
    res.status(500).json({
      success: false,
      error: 'Airport search failed',
      message: error.message
    });
  }
});

// Helper functions for fallback data
function getAirportName(code: string): string {
  const airports: { [key: string]: string } = {
    'JFK': 'John F. Kennedy International Airport',
    'LAX': 'Los Angeles International Airport',
    'ORD': 'Chicago O\'Hare International Airport',
    'DFW': 'Dallas/Fort Worth International Airport',
    'SFO': 'San Francisco International Airport',
    'MIA': 'Miami International Airport',
    'LAS': 'Harry Reid International Airport',
    'SEA': 'Seattle-Tacoma International Airport',
    'ATL': 'Hartsfield-Jackson Atlanta International Airport',
    'BOS': 'Logan International Airport'
  };
  return airports[code] || `${code} Airport`;
}

function getCityName(code: string): string {
  const cities: { [key: string]: string } = {
    'JFK': 'New York',
    'LAX': 'Los Angeles',
    'ORD': 'Chicago',
    'DFW': 'Dallas',
    'SFO': 'San Francisco',
    'MIA': 'Miami',
    'LAS': 'Las Vegas',
    'SEA': 'Seattle',
    'ATL': 'Atlanta',
    'BOS': 'Boston'
  };
  return cities[code] || code;
}

function getBasicAirports(query: string) {
  const airports = [
    { iata_code: 'JFK', name: 'John F. Kennedy International Airport', city_name: 'New York', country_name: 'United States' },
    { iata_code: 'LAX', name: 'Los Angeles International Airport', city_name: 'Los Angeles', country_name: 'United States' },
    { iata_code: 'ORD', name: 'Chicago O\'Hare International Airport', city_name: 'Chicago', country_name: 'United States' },
    { iata_code: 'DFW', name: 'Dallas/Fort Worth International Airport', city_name: 'Dallas', country_name: 'United States' },
    { iata_code: 'SFO', name: 'San Francisco International Airport', city_name: 'San Francisco', country_name: 'United States' },
    { iata_code: 'MIA', name: 'Miami International Airport', city_name: 'Miami', country_name: 'United States' },
    { iata_code: 'LAS', name: 'Harry Reid International Airport', city_name: 'Las Vegas', country_name: 'United States' },
    { iata_code: 'SEA', name: 'Seattle-Tacoma International Airport', city_name: 'Seattle', country_name: 'United States' },
    { iata_code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city_name: 'Atlanta', country_name: 'United States' },
    { iata_code: 'BOS', name: 'Logan International Airport', city_name: 'Boston', country_name: 'United States' }
  ];

  const lowerQuery = query.toLowerCase();
  return airports.filter(airport => 
    airport.iata_code.toLowerCase().includes(lowerQuery) ||
    airport.name.toLowerCase().includes(lowerQuery) ||
    airport.city_name.toLowerCase().includes(lowerQuery)
  );
}

export default router;