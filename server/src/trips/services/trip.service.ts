import type { Trip, User } from '../../../db/schema/index.js';
import type { CorporateTripDto, TripService } from '../interfaces/trip.service.interface.js';
import type { TripRepository } from '../interfaces/trip.repository.interface.js';
import { AuthError, AuthErrorCode } from '@shared/types/auth/auth.js';
import logger from '../../utils/logger.js';
@Injectable()
export class TripServiceImpl implements TripService {
    private readonly logger = new Logger(TripServiceImpl.name);
    constructor(
    @Inject('TripRepository')
    private readonly tripRepository: TripRepository) { }
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
            throw new UnauthorizedError('Access denied: You do not have permission to view this trip.');
        }
        return trip;
    }
}
