import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import type { Trip } from '@shared/schema';
import type { CorporateTripDto, TripService } from '../interfaces/trip.service.interface.js';
import type { ITripRepository } from '../interfaces/trip.repository.interface.js';
import type { AuthUser } from '../../../common/types/express.js';

@Injectable()
export class TripServiceImpl implements TripService {
    private readonly logger = new Logger(TripServiceImpl.name);
    constructor(
    @Inject('TripRepository')
    private readonly tripRepository: ITripRepository) { }
    async getTripsByUserId(userId: string, orgId: string): Promise<Trip[]> {
        this.logger.log(`Fetching trips for user ${userId} in organization ${orgId}`);
        return this.tripRepository.getTripsByUserId(userId, orgId);
    }
    async getCorporateTrips(orgId: string): Promise<CorporateTripDto[]> {
        this.logger.log(`Fetching corporate trips for organization ${orgId}`);
        return this.tripRepository.getCorporateTrips(orgId);
    }
    async getTripById(tripId: string, user: AuthUser): Promise<Trip | null> {
        this.logger.log(`Fetching trip ${tripId} for user ${user.id}`);
        const trip = await this.tripRepository.getTripById(tripId, user);
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
