import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all booking routes
router.use(authenticateJWT);

// Type for API response to ensure consistency
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

// Validation schemas
const flightSearchSchema = z.object({
  origin: z.string().min(3).max(3), // Airport code
  destination: z.string().min(3).max(3), // Airport code
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.number().min(1).max(10).default(1),
  class: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
});

// POST /api/bookings/flights/search
router.post('/flights/search', async (req: Request, res: Response) => {
  try {
    const searchParams = flightSearchSchema.parse(req.body);
    
    // Mock flight search results
    const mockFlights = [
      {
        id: 'flight-1',
        airline: 'American Airlines',
        flightNumber: 'AA1234',
        origin: searchParams.origin,
        destination: searchParams.destination,
        departure: {
          time: '08:00',
          date: searchParams.departureDate,
          airport: `${searchParams.origin} Airport`,
        },
        arrival: {
          time: '12:00',
          date: searchParams.departureDate,
          airport: `${searchParams.destination} Airport`,
        },
        duration: '4h 00m',
        price: {
          amount: 299.99,
          currency: 'USD',
        },
        class: searchParams.class,
        availability: 'available',
      },
      {
        id: 'flight-2',
        airline: 'Delta Air Lines',
        flightNumber: 'DL5678',
        origin: searchParams.origin,
        destination: searchParams.destination,
        departure: {
          time: '14:00',
          date: searchParams.departureDate,
          airport: `${searchParams.origin} Airport`,
        },
        arrival: {
          time: '18:30',
          date: searchParams.departureDate,
          airport: `${searchParams.destination} Airport`,
        },
        duration: '4h 30m',
        price: {
          amount: 349.99,
          currency: 'USD',
        },
        class: searchParams.class,
        availability: 'available',
      },
    ];

    logger.info(`Flight search: ${searchParams.origin} to ${searchParams.destination} on ${searchParams.departureDate}`);

    const response: ApiResponse<{ flights: typeof mockFlights }> = {
      success: true,
      data: { flights: mockFlights },
    };
    res.json(response);

  } catch (error) {
    logger.error('Flight search error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid search parameters', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Flight search failed' },
    };
    res.status(500).json(response);
  }
});

// POST /api/bookings/complete
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const bookingSchema = z.object({
      flightId: z.string().min(1),
      passengers: z.array(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        dateOfBirth: z.string(),
      })),
      paymentMethod: z.string().min(1),
    });

    const bookingData = bookingSchema.parse(req.body);
    const user = req.user;

    // Mock booking completion
    const booking = {
      id: 'booking-' + Date.now(),
      flightId: bookingData.flightId,
      userId: user?.userId,
      passengers: bookingData.passengers,
      status: 'confirmed',
      confirmationNumber: 'ABC123',
      totalPrice: 299.99,
      currency: 'USD',
      bookingDate: new Date().toISOString(),
    };

    logger.info(`Booking completed: ${booking.id} by user ${user?.userId}`);

    const response: ApiResponse<typeof booking> = {
      success: true,
      data: booking,
    };
    res.status(201).json(response);

  } catch (error) {
    logger.error('Booking completion error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid booking data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Booking completion failed' },
    };
    res.status(500).json(response);
  }
});

// GET /api/bookings/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Mock booking retrieval
    const booking = {
      id: id,
      flightId: 'flight-1',
      userId: req.user?.userId,
      status: 'confirmed',
      confirmationNumber: 'ABC123',
      totalPrice: 299.99,
      currency: 'USD',
      bookingDate: new Date().toISOString(),
      flight: {
        airline: 'American Airlines',
        flightNumber: 'AA1234',
        departure: '2024-01-15T08:00:00Z',
        arrival: '2024-01-15T12:00:00Z',
      },
    };

    const response: ApiResponse<typeof booking> = {
      success: true,
      data: booking,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get booking error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch booking' },
    };
    res.status(500).json(response);
  }
});

export default router;