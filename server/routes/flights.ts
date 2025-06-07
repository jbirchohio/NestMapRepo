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

    // Check if Duffel service is available
    let duffelService;
    try {
      const { duffelFlightService } = await import('../services/duffelFlightService');
      duffelService = duffelFlightService;
    } catch (importError) {
      console.warn('Duffel service not available, using test data:', importError.message);
      
      // Provide authentic-looking test data with real airline information
      const testFlights = [
        {
          id: `test_offer_${Date.now()}_1`,
          price: {
            amount: '385.50',
            currency: 'USD'
          },
          slices: [{
            origin: {
              iata_code: searchParams.origin,
              name: getAirportName(searchParams.origin),
              city_name: getCityName(searchParams.origin)
            },
            destination: {
              iata_code: searchParams.destination,
              name: getAirportName(searchParams.destination),
              city_name: getCityName(searchParams.destination)
            },
            departure_datetime: `${searchParams.departure_date}T08:30:00Z`,
            arrival_datetime: `${searchParams.departure_date}T12:45:00Z`,
            duration: 'PT4H15M',
            segments: [{
              airline: {
                name: 'United Airlines',
                iata_code: 'UA',
                logo_url: 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/UA.svg'
              },
              flight_number: 'UA1234',
              aircraft: {
                name: 'Boeing 737-800'
              },
              origin: {
                iata_code: searchParams.origin,
                name: getAirportName(searchParams.origin)
              },
              destination: {
                iata_code: searchParams.destination,
                name: getAirportName(searchParams.destination)
              },
              departure_datetime: `${searchParams.departure_date}T08:30:00Z`,
              arrival_datetime: `${searchParams.departure_date}T12:45:00Z`,
              duration: 'PT4H15M'
            }]
          }],
          passengers: Array(searchParams.passengers.adults).fill({
            type: 'adult',
            cabin_class: searchParams.cabin_class || 'economy',
            baggage: [
              { type: 'carry_on', quantity: 1 },
              { type: 'checked', quantity: 1 }
            ]
          }),
          conditions: {
            change_before_departure: {
              allowed: true,
              penalty_amount: '75.00',
              penalty_currency: 'USD'
            },
            cancel_before_departure: {
              allowed: true,
              penalty_amount: '150.00',
              penalty_currency: 'USD'
            }
          }
        },
        {
          id: `test_offer_${Date.now()}_2`,
          price: {
            amount: '425.75',
            currency: 'USD'
          },
          slices: [{
            origin: {
              iata_code: searchParams.origin,
              name: getAirportName(searchParams.origin),
              city_name: getCityName(searchParams.origin)
            },
            destination: {
              iata_code: searchParams.destination,
              name: getAirportName(searchParams.destination),
              city_name: getCityName(searchParams.destination)
            },
            departure_datetime: `${searchParams.departure_date}T14:20:00Z`,
            arrival_datetime: `${searchParams.departure_date}T18:55:00Z`,
            duration: 'PT4H35M',
            segments: [{
              airline: {
                name: 'Delta Air Lines',
                iata_code: 'DL',
                logo_url: 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/DL.svg'
              },
              flight_number: 'DL5678',
              aircraft: {
                name: 'Airbus A320'
              },
              origin: {
                iata_code: searchParams.origin,
                name: getAirportName(searchParams.origin)
              },
              destination: {
                iata_code: searchParams.destination,
                name: getAirportName(searchParams.destination)
              },
              departure_datetime: `${searchParams.departure_date}T14:20:00Z`,
              arrival_datetime: `${searchParams.departure_date}T18:55:00Z`,
              duration: 'PT4H35M'
            }]
          }],
          passengers: Array(searchParams.passengers.adults).fill({
            type: 'adult',
            cabin_class: searchParams.cabin_class || 'economy',
            baggage: [
              { type: 'carry_on', quantity: 1 },
              { type: 'checked', quantity: 1 }
            ]
          }),
          conditions: {
            change_before_departure: {
              allowed: true,
              penalty_amount: '100.00',
              penalty_currency: 'USD'
            },
            cancel_before_departure: {
              allowed: false
            }
          }
        }
      ];

      return res.json({
        success: true,
        data: testFlights,
        search_params: searchParams,
        note: 'Using test data - Duffel integration available with API key'
      });
    }

    // Use real Duffel API
    const flights = await duffelService.searchFlights(searchParams);
    
    res.json({
      success: true,
      data: flights,
      search_params: searchParams
    });

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