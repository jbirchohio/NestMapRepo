import { Controller, Get, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Controller('trips')
export class TripController {
  private readonly logger = new Logger(TripController.name);

  @Get()
  async getTrips(@Res() res: Response) {
    try {
      this.logger.log('Fetching trips');
      return res.status(HttpStatus.OK).json({
        success: true,
        data: []
      });
    } catch (error) {
      this.logger.error('Error fetching trips:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch trips',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

