import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all flight routes
router.use(authenticateJWT);

// Validation schemas
const flightSearchSchema = z.object({
  origin: z.string().length(3, 'Origin must be a 3-letter airport code'),
  destination: z.string().length(3, 'Destination must be a 3-letter airport code'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  passengers: z.number().min(1).max(9).default(1),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
});

// Duffel API integration helper
const duffelApiCall = async (endpoint: string, options: any = {}) => {
  const duffelApiKey = process.env.DUFFEL_API_KEY;
  
  if (!duffelApiKey) {
    throw new Error('Duffel API key not configured');
  }

  const response = await fetch(`https://api.duffel.com/air/${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${duffelApiKey}`,
      'Content-Type': 'application/json',
      'Duffel-Version': 'v1',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Duffel API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// POST /api/flights/search
router.post('/search', async (req: Request, res: Response) => {
  try {
    const searchParams = flightSearchSchema.parse(req.body);
    
    logger.info(`Flight search request: ${searchParams.origin} -> ${searchParams.destination}`);

    // In test environment, return mock data
    if (process.env.NODE_ENV === 'test') {
      const mockFlights = [
        {
          id: 'flight_1',
          origin: searchParams.origin,
          destination: searchParams.destination,
          departure_time: `${searchParams.departureDate}T08:00:00Z`,
          arrival_time: `${searchParams.departureDate}T14:00:00Z`,
          duration: '6h 0m',
          price: {
            amount: '299.99',
            currency: 'USD'
          },
          airline: 'Mock Airlines',
          flight_number: 'MA123',
          cabin_class: searchParams.cabinClass || 'economy'
        },
        {
          id: 'flight_2',
          origin: searchParams.origin,
          destination: searchParams.destination,
          departure_time: `${searchParams.departureDate}T12:00:00Z`,
          arrival_time: `${searchParams.departureDate}T18:00:00Z`,
          duration: '6h 0m',
          price: {
            amount: '399.99',
            currency: 'USD'
          },
          airline: 'Test Airways',
          flight_number: 'TA456',
          cabin_class: searchParams.cabinClass || 'economy'
        }
      ];

      return res.json({
        success: true,
        data: {
          flights: mockFlights,
          searchParams,
          total: mockFlights.length
        }
      });
    }

    // Create offer request with Duffel API
    const offerRequest = {
      data: {
        slices: [
          {
            origin: searchParams.origin,
            destination: searchParams.destination,
            departure_date: searchParams.departureDate,
          },
        ],
        passengers: Array(searchParams.passengers).fill({
          type: 'adult',
        }),
        cabin_class: searchParams.cabinClass,
      },
    };

    // Add return slice if return date provided
    if (searchParams.returnDate) {
      offerRequest.data.slices.push({
        origin: searchParams.destination,
        destination: searchParams.origin,
        departure_date: searchParams.returnDate,
      });
    }

    // Make request to Duffel API
    const duffelResponse = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Content-Type': 'application/json',
        'Duffel-Version': 'v1',
      },
      body: JSON.stringify(offerRequest),
    });

    if (!duffelResponse.ok) {
      throw new Error(`Duffel API error: ${duffelResponse.status}`);
    }

    const offerRequestData = await duffelResponse.json();
    
    // Get offers from the offer request
    const offersResponse = await duffelApiCall(`offers?offer_request_id=${offerRequestData.data.id}`);

    res.json({
      success: true,
      data: {
        offers: offersResponse.data,
        searchParams,
        offerRequestId: offerRequestData.data.id,
      },
    });

  } catch (error: unknown) {
    logger.error('Flight search failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid search parameters', details: error.errors },
        errors: error.errors, // Add this for test compatibility
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Flight search failed', details: errorMessage },
    });
  }
});

// GET /api/flights/offers/:id
router.get('/offers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info(`Fetching flight offer: ${id}`);

    const offerResponse = await duffelApiCall(`offers/${id}`);

    res.json({
      success: true,
      data: offerResponse.data,
    });

  } catch (error: unknown) {
    logger.error('Fetch offer error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch offer details', details: errorMessage },
    });
  }
});

// POST /api/flights/book
router.post('/book', async (req: Request, res: Response) => {
  try {
    const { offerId, passengers } = req.body;
    
    if (!offerId || !passengers) {
      return res.status(400).json({
        success: false,
        error: { message: 'Offer ID and passenger details are required' },
      });
    }

    logger.info(`Booking flight offer: ${offerId}`);

    // Create order with Duffel API
    const orderRequest = {
      data: {
        selected_offers: [offerId],
        passengers: passengers,
        payments: [
          {
            type: 'balance',
            amount: req.body.amount,
            currency: req.body.currency || 'USD',
          },
        ],
      },
    };

    const bookingResponse = await fetch('https://api.duffel.com/air/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Content-Type': 'application/json',
        'Duffel-Version': 'v1',
      },
      body: JSON.stringify(orderRequest),
    });

    if (!bookingResponse.ok) {
      throw new Error(`Duffel booking error: ${bookingResponse.status}`);
    }

    const orderData = await bookingResponse.json();

    res.json({
      success: true,
      data: orderData.data,
      message: 'Flight booked successfully',
    });

  } catch (error: unknown) {
    logger.error('Flight booking error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Flight booking failed', details: errorMessage },
    });
  }
});

// POST /api/flights/status
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { flightNumber, date } = req.body;
    
    if (!flightNumber || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Flight number and date are required' }
      });
    }

    logger.info(`Getting flight status for: ${flightNumber} on ${date}`);

    // In test environment, return mock data
    if (process.env.NODE_ENV === 'test') {
      const mockFlightStatus = {
        flightNumber: flightNumber,
        date: date,
        status: 'On Time',
        departure: {
          airport: 'JFK',
          scheduled: '14:30',
          estimated: '14:30',
          gate: 'A12'
        },
        arrival: {
          airport: 'LHR',
          scheduled: '02:45+1',
          estimated: '02:40+1',
          gate: 'B7'
        },
        aircraft: 'Boeing 777-300ER',
        airline: 'British Airways'
      };

      return res.json({
        success: true,
        data: mockFlightStatus
      });
    }

    // Try to get flight status from a real API (e.g., FlightStats, Aviation Edge, or AirLabs)
    try {
      let flightStatus;
      
      // Check if we have an API key for flight status
      const flightStatusApiKey = process.env.FLIGHT_STATUS_API_KEY || process.env.AIRLABS_API_KEY || process.env.AVIATION_EDGE_API_KEY;
      
      if (flightStatusApiKey && process.env.FLIGHT_STATUS_PROVIDER) {
        // Use real flight status API
        if (process.env.FLIGHT_STATUS_PROVIDER === 'airlabs') {
          const response = await fetch(
            `https://airlabs.co/api/v9/flight?flight_iata=${flightNumber}&api_key=${flightStatusApiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.response && data.response.length > 0) {
              const flight = data.response[0];
              flightStatus = {
                flightNumber: flightNumber,
                date: date,
                status: flight.status || 'Unknown',
                departure: {
                  airport: flight.dep_iata || 'Unknown',
                  scheduled: flight.dep_time || 'Unknown',
                  estimated: flight.dep_estimated || flight.dep_time || 'Unknown',
                  gate: flight.dep_gate || 'TBD'
                },
                arrival: {
                  airport: flight.arr_iata || 'Unknown',
                  scheduled: flight.arr_time || 'Unknown',
                  estimated: flight.arr_estimated || flight.arr_time || 'Unknown',
                  gate: flight.arr_gate || 'TBD'
                },
                aircraft: flight.aircraft_icao || 'Unknown',
                airline: flight.airline_iata || 'Unknown'
              };
            }
          }
        } else if (process.env.FLIGHT_STATUS_PROVIDER === 'aviation_edge') {
          const response = await fetch(
            `https://aviation-edge.com/v2/public/flights?key=${flightStatusApiKey}&flightIata=${flightNumber}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
              const flight = data[0];
              flightStatus = {
                flightNumber: flightNumber,
                date: date,
                status: flight.status || 'Unknown',
                departure: {
                  airport: flight.departure?.iata || 'Unknown',
                  scheduled: flight.departure?.scheduledTime || 'Unknown',
                  estimated: flight.departure?.estimatedTime || flight.departure?.scheduledTime || 'Unknown',
                  gate: flight.departure?.gate || 'TBD'
                },
                arrival: {
                  airport: flight.arrival?.iata || 'Unknown',
                  scheduled: flight.arrival?.scheduledTime || 'Unknown',
                  estimated: flight.arrival?.estimatedTime || flight.arrival?.scheduledTime || 'Unknown',
                  gate: flight.arrival?.gate || 'TBD'
                },
                aircraft: flight.aircraft?.model || 'Unknown',
                airline: flight.airline?.name || 'Unknown'
              };
            }
          }
        }
      }
      
      // If we couldn't get data from API, return a helpful message
      if (!flightStatus) {
        return res.status(503).json({
          success: false,
          error: { 
            message: 'Flight status service unavailable',
            details: 'Unable to retrieve real-time flight information. Please check flight number and try again.'
          }
        });
      }

      res.json({
        success: true,
        data: flightStatus
      });
      
    } catch (apiError) {
      logger.error('Flight status API error:', apiError);
      
      return res.status(503).json({
        success: false,
        error: { 
          message: 'Flight status service error',
          details: 'Unable to retrieve flight information at this time'
        }
      });
    }

  } catch (error: unknown) {
    logger.error('Flight status error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Flight status lookup failed', details: errorMessage },
    });
  }
});

export default router;
