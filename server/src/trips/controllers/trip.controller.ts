import { Request, Response } from 'express';
import { TripService } from '../interfaces/trip.service.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { User } from '../../../db/schema.js';
import { ResponseFormatter } from '../../common/utils/response-formatter.util';
import { asyncHandler } from '../../common/middleware/error-handler.middleware';
import { requireAuth, requireOrgContext } from '../../common/middleware/auth.middleware';

@Injectable()
export class TripController {
  private readonly logger = new Logger(TripController.name);

  constructor(@Inject('TripService') private readonly tripService: TripService) {}

  getTrips = [
    requireAuth(this.logger),
    requireOrgContext(this.logger),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const orgId = req.user!.organizationId;
      
      const trips = await this.tripService.getTripsByUserId(userId, orgId);
      return ResponseFormatter.success(res, trips, 'Trips retrieved successfully');
    }, this.logger)
  ];

  getCorporateTrips = [
    requireAuth(this.logger),
    requireOrgContext(this.logger),
    asyncHandler(async (req: Request, res: Response) => {
      const orgId = req.user!.organizationId;
      
      const trips = await this.tripService.getCorporateTrips(orgId);
      return ResponseFormatter.success(res, trips, 'Corporate trips retrieved successfully');
    }, this.logger)
  ];

  getTripById = [
    requireAuth(this.logger),
    asyncHandler(async (req: Request, res: Response) => {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return ResponseFormatter.badRequest(res, 'Invalid trip ID');
      }

      const trip = await this.tripService.getTripById(tripId, req.user as User);

      if (!trip) {
        return ResponseFormatter.notFound(res, 'Trip not found');
      }

      return ResponseFormatter.success(res, trip, 'Trip retrieved successfully');
    }, this.logger)
  ];
}
