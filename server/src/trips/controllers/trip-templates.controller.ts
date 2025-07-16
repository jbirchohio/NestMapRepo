import { Controller, Get, Post, Param, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

// Define the TripTemplate interface inline since we're having import issues
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
  }
];

/**
 * Simple controller for handling trip template related operations
 */
@Controller('templates')
export class TripTemplatesController {
  private readonly logger = new Logger(TripTemplatesController.name);

  // Get all trip templates
  @Get()
  async getTemplates(@Res() res: Response) {
    try {
      this.logger.log('Fetching trip templates');
      return res.status(HttpStatus.OK).json({
        success: true,
        data: MOCK_TRIP_TEMPLATES
      });
    } catch (error) {
      this.logger.error('Error fetching trip templates:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch trip templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create a trip from a template
  @Post(':templateId/create-trip')
  async createTripFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { startDate: string; userId: string },
    @Res() res: Response
  ) {
    try {
      const { startDate, userId } = body;
      
      if (!templateId || !startDate || !userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Missing required fields: templateId, startDate, or userId'
        });
      }
      
      this.logger.log(`Creating trip from template ${templateId}`);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: {
          id: 'new-trip-id',
          templateId,
          startDate,
          userId,
          status: 'planned',
          activities: MOCK_TRIP_TEMPLATES.find(t => t.id === templateId)?.activities || []
        }
      });
    } catch (error) {
      this.logger.error('Error creating trip from template:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create trip from template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
