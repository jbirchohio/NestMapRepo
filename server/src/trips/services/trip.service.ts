import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../../db';
import { trips as tripsTable } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../../../storage';
import { Trip, User } from '@shared/schema';
import { CorporateTripDto, TripService } from '../interfaces/trip.service.interface';
import { UnauthorizedError } from '../../auth/errors/unauthorized.error';

@Injectable()
export class TripServiceImpl implements TripService {
  private readonly logger = new Logger(TripServiceImpl.name);

  async getTripsByUserId(userId: string, orgId: number): Promise<Trip[]> {
    this.logger.log(`Fetching trips for user ${userId} in organization ${orgId}`);
    // @ts-ignore
    return storage.getTripsByUserId(userId, orgId);
  }

  async getCorporateTrips(orgId: number): Promise<CorporateTripDto[]> {
    this.logger.log(`Fetching corporate trips for organization ${orgId}`);
    const trips = await storage.getTripsByOrganizationId(orgId);

    const tripsWithUserDetails = await Promise.all(
      trips.map(async (trip) => {
        const user = await storage.getUser(trip.user_id);
        return {
          id: trip.id,
          title: trip.title,
          startDate: trip.start_date.toISOString(),
          endDate: trip.end_date.toISOString(),
          userId: String(trip.user_id),
          city: trip.city,
          country: trip.country,
          budget: trip.budget,
          completed: trip.completed ?? false,
          trip_type: trip.trip_type as 'business' | 'leisure' | 'bleisure' | null,
          client_name: trip.client_name,
          project_type: trip.project_type,
          userName: user?.display_name || 'Unknown User',
          userEmail: user?.email || 'No Email',
        };
      }),
    );

    return tripsWithUserDetails;
  }

  async getTripById(tripId: number, user: User): Promise<Trip | null> {
    this.logger.log(`Fetching trip ${tripId} for user ${user.id}`);
    const [trip] = await db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId))
      .limit(1);

    if (!trip) {
      return null;
    }

    // Enforce organization-level access control
    // @ts-ignore - Linter is incorrectly inferring the type of user from the db schema instead of the shared schema
    if (user.role !== 'super_admin' && trip.organization_id !== user.organizationId) {
      throw new UnauthorizedError('Access denied: You do not have permission to view this trip.');
    }

    return trip;
  }
}
