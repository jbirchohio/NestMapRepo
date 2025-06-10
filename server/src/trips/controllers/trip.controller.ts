import { Request, Response } from 'express';
import { TripService } from '../interfaces/trip.service.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { User } from '@shared/schema';

@Injectable()
export class TripController {
  private readonly logger = new Logger(TripController.name);

  constructor(@Inject('TripService') private readonly tripService: TripService) {}

  async getTrips(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const orgId = req.user?.organizationId;

      if (!userId || !orgId) {
        return res.status(401).json({ message: 'User and organization context are required.' });
      }

      const trips = await this.tripService.getTripsByUserId(userId, orgId);
      return res.json(trips);
    } catch (error) {
      this.logger.error('Error fetching trips:', error);
      return res.status(500).json({ message: 'Could not fetch trips' });
    }
  }

  async getCorporateTrips(req: Request, res: Response): Promise<Response> {
    try {
      const orgId = req.user?.organizationId;

      if (!orgId) {
        return res.status(400).json({ message: 'Organization context required' });
      }

      const trips = await this.tripService.getCorporateTrips(orgId);
      return res.json(trips);
    } catch (error) {
      this.logger.error('Error fetching corporate trips:', error);
      return res.status(500).json({ message: 'Failed to fetch corporate trips' });
    }
  }

  async getTripById(req: Request, res: Response): Promise<Response> {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      const trip = await this.tripService.getTripById(tripId, req.user as User);

      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      return res.json(trip);
    } catch (error: any) {
      this.logger.error(`Error fetching trip ${req.params.id}:`, error);
      if (error.name === 'UnauthorizedError') {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Could not fetch trip' });
    }
  }
}
