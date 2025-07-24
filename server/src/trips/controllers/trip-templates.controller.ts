import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import { getDatabase } from '../../db/connection';
import { trips } from '../../db/tripSchema';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

const router = Router();

// Validation schemas
const createTripFromTemplateSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  userId: z.string().uuid(),
});

// Type for API response
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

// Define the TripTemplate interface
interface TripTemplate {
  id: string;
  title: string;
  description: string;
  duration: number;
  city: string;
  country: string;
  tags: string[];
  activities: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    locationName: string;
    coordinates: { lat: number; lng: number };
    duration: number;
    tags: string[];
  }>;
  suggestedTodos: string[];
}

// Mock data for trip templates
const MOCK_TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'beach-getaway',
    title: 'Beach Getaway',
    description: 'A relaxing weekend at the beach',
    duration: 3,
    city: 'Miami',
    country: 'USA',
    tags: ['beach', 'relaxation', 'weekend'],
    activities: [
      {
        id: 'beach-day',
        title: 'Beach Day',
        description: 'Relax on the sandy beaches of Miami',
        category: 'leisure',
        locationName: 'South Beach',
        coordinates: { lat: 25.7617, lng: -80.1918 },
        duration: 240,
        tags: ['beach', 'relaxation']
      }
    ],
    suggestedTodos: ['Bring sunscreen', 'Pack swimsuit']
  },
  {
    id: 'city-explorer',
    title: 'City Explorer',
    description: 'Explore the urban jungle',
    duration: 5,
    city: 'New York',
    country: 'USA',
    tags: ['city', 'sightseeing', 'culture'],
    activities: [
      {
        id: 'central-park',
        title: 'Central Park Walk',
        description: 'Stroll through the iconic Central Park',
        category: 'sightseeing',
        locationName: 'Central Park',
        coordinates: { lat: 40.7829, lng: -73.9654 },
        duration: 180,
        tags: ['park', 'walking']
      }
    ],
    suggestedTodos: ['Comfortable shoes', 'Camera']
  },
  {
    id: 'europe-summer',
    title: 'European Summer Adventure',
    description: 'A 2-week adventure through major European cities',
    duration: 14,
    city: 'Multiple',
    country: 'Europe',
    tags: ['sightseeing', 'culture', 'history'],
    activities: [
      {
        id: 'eiffel-tower',
        title: 'Eiffel Tower Visit',
        description: 'Visit the iconic Eiffel Tower in Paris',
        category: 'sightseeing',
        locationName: 'Eiffel Tower, Paris',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        duration: 120,
        tags: ['landmark', 'must-see']
      },
      // More activities...
    ],
    suggestedTodos: [
      'Book intercity train tickets',
      'Check visa requirements',
      'Download offline maps'
    ]
  },
  // More templates...
];

// GET /api/trip-templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const response: ApiResponse<TripTemplate[]> = {
      success: true,
      data: MOCK_TRIP_TEMPLATES
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching trip templates:', error);
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch trip templates' }
    };
    res.status(500).json(response);
  }
});

// POST /api/trip-templates/:templateId/create-trip
router.post('/:templateId/create-trip', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const validation = createTripFromTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: { 
          message: 'Validation error',
          details: validation.error.format()
        }
      };
      return res.status(400).json(response);
    }

    const { startDate, userId } = validation.data;

    // Find the template
    const template = MOCK_TRIP_TEMPLATES.find(t => t.id === templateId);
    
    if (!template) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Trip template not found' }
      };
      return res.status(404).json(response);
    }

    // In a real implementation, we would create a new trip based on the template
    // and save it to the database
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + template.duration - 1);
    
    const db = getDatabase();
    if (!db) {
      logger.error('Database connection not available');
      const response: ApiResponse = {
        success: false,
        error: { message: 'Database connection not available' }
      };
      return res.status(503).json(response);
    }

    const [newTrip] = await getDB().insert(trips).values({
      title: template.title,
      description: template.description,
      startDate: new Date(startDate),
      endDate,
      status: 'planned',
      createdById: userId,
      // Add other necessary fields
      destinationCity: template.city,
      destinationCountry: template.country,
      isPrivate: true,
      organizationId: null, // Set appropriate organization ID
      lastUpdatedById: userId
    }).returning();

    const response: ApiResponse<typeof newTrip> = {
      success: true,
      data: newTrip
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating trip from template:', error);
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to create trip from template' }
    };
    res.status(500).json(response);
  }
});

export default router;
