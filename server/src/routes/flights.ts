import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';

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

export default router;
