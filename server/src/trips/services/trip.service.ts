import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator.js';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator.js';
import { UnauthorizedException } from '@nestjs/common/exceptions/index.js';
import { Logger } from '@nestjs/common/services/logger.service.js';
import type { Trip } from '../../db/tripSchema.ts';
import type { User } from '../../db/schema.ts';
import type { CorporateTripDto, TripService } from '../interfaces/trip.service.interface.js';
import type { TripRepository } from '../interfaces/trip.repository.interface.js';

@Injectable()
export class TripServiceImpl implements TripService {
  private readonly logger = new Logger(TripServiceImpl.name);

  constructor(
    @Inject('TripRepository') private readonly tripRepository: TripRepository
  ) {}

  async getTripsByUserId(userId: string, orgId: string): Promise<Trip[]> {
    this.logger.log(`Fetching trips for user ${userId} in organization ${orgId}`);
    return this.tripRepository.getTripsByUserId(userId, orgId);
  }

  async getCorporateTrips(orgId: string): Promise<CorporateTripDto[]> {
    this.logger.log(`Fetching corporate trips for organization ${orgId}`);
    return this.tripRepository.getCorporateTrips(orgId);
  }

  async getTripById(tripId: string, user: User): Promise<Trip | null> {
    this.logger.log(`Fetching trip ${tripId} for user ${user.id}`);
    
    const trip = await this.tripRepository.getTripById(tripId);
    
    if (!trip) {
      return null;
    }

    // Enforce organization-level access control
    const hasAccess = await this.tripRepository.checkTripAccess(tripId, user);
    if (!hasAccess) {
      throw new UnauthorizedException('Access denied: You do not have permission to view this trip.');
    }

    return trip;
  }
}
