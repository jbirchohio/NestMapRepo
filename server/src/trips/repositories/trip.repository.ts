import { eq, and } from '../../utils/drizzle-shim';
import { db } from '../../db/db';
import * as tripSchema from '../../db/tripSchema';
import * as schema from '../../db/schema';
import { TripRepository } from '../interfaces/trip.repository.interface';
import { CorporateTripDto } from '../interfaces/trip.service.interface';
import { BaseRepositoryImpl } from '../../common/repositories/base.repository';

export class TripRepositoryImpl extends BaseRepositoryImpl<tripSchema.Trip, string, Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>>> implements TripRepository {
  constructor() {
    super('Trip', tripSchema.trips, tripSchema.trips.id);
  }

  async getTripsByUserId(userId: string, orgId: string): Promise<tripSchema.Trip[]> {
    
    return db
      .select()
      .from(tripSchema.trips)
      .where(
        and(
          eq(tripSchema.trips.createdById, userId),
          eq(tripSchema.trips.organizationId, orgId)
        )
      );
  }

  async getTripsByOrganizationId(orgId: string): Promise<tripSchema.Trip[]> {
    
    return db
      .select()
      .from(tripSchema.trips)
      .where(eq(tripSchema.trips.organizationId, orgId));
  }

  async getTripById(tripId: string): Promise<tripSchema.Trip | null> {
    return super.findById(tripId);
  }

  async createTrip(tripData: Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<tripSchema.Trip> {
    return super.create(tripData);
  }

  async updateTrip(tripId: string, tripData: Partial<Omit<tripSchema.Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<tripSchema.Trip | null> {
    return super.update(tripId, tripData);
  }

  async deleteTrip(tripId: string): Promise<boolean> {
    return super.delete(tripId);
  }

  async getCorporateTrips(orgId: string): Promise<CorporateTripDto[]> {
    
    const trips = await this.getTripsByOrganizationId(orgId);

    const tripsWithUserDetails = await Promise.all(
      trips.map(async (trip) => {
        // Get the creator user information
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, trip.createdById || ''));

        // Extract metadata fields if they exist, or use defaults
        const metadata = trip.metadata as Record<string, any> || {};

        return {
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          userId: String(trip.createdById || ''),
          city: trip.destinationCity || null,
          country: trip.destinationCountry || null,
          budget: metadata.budget || null,
          completed: trip.status === 'completed',
          trip_type: metadata.tripType || null,
          client_name: metadata.clientName || null,
          project_type: metadata.projectType || null,
          userName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.email || 'Unknown User',
          userEmail: user?.email || 'No Email',
        };
      })
    );

    return tripsWithUserDetails;
  }

  async checkTripAccess(tripId: string, user: schema.User): Promise<boolean> {
    const trip = await this.getTripById(tripId);
    
    if (!trip) {
      return false;
    }

    // Super admins can access all trips
    if (user.role === 'super_admin') {
      return true;
    }
    
    // Users can only access trips in their organization
    return trip.organizationId === user.organizationId;
  }
}



