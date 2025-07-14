import { eq, and } from 'drizzle-orm/expressions';
import { db } from '../../db';
import { trips as tripsTable, users as usersTable } from '../../shared/schema';
import { Trip, User } from '../../shared/types';
import { TripRepository } from '../interfaces/trip.repository.interface';
import { CorporateTripDto } from '../interfaces/trip.service.interface';
import { BaseRepositoryImpl } from '../../shared/repositories/base.repository';

export class TripRepositoryImpl extends BaseRepositoryImpl<Trip, string, Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>> implements TripRepository {
  constructor() {
    super('Trip', tripsTable, tripsTable.id);
  }

  async getTripsByUserId(userId: string, orgId: string): Promise<Trip[]> {
    
    return db
      .select()
      .from(tripsTable)
      .where(
        and(
          eq(tripsTable.userId, userId),
          eq(tripsTable.organizationId, orgId)
        )
      );
  }

  async getTripsByOrganizationId(orgId: string): Promise<Trip[]> {
    
    return db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.organizationId, orgId));
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    return super.findById(tripId);
  }

  async createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    return super.create(tripData);
  }

  async updateTrip(tripId: string, tripData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip | null> {
    return super.update(tripId, tripData);
  }

  async deleteTrip(tripId: string): Promise<boolean> {
    return super.delete(tripId);
  }

  async getCorporateTrips(orgId: string): Promise<CorporateTripDto[]> {
    
    const trips = await this.getTripsByOrganizationId(orgId);

    const tripsWithUserDetails = await Promise.all(
      trips.map(async (trip) => {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, trip.userId));

        return {
          id: trip.id, // Now using string ID directly
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          userId: String(trip.userId),
          city: trip.city,
          country: trip.country,
          budget: trip.budget,
          completed: trip.completed ?? false,
          trip_type: trip.tripType,
          client_name: trip.clientName,
          project_type: trip.projectType,
          userName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.email || 'Unknown User',
          userEmail: user?.email || 'No Email',
        };
      })
    );

    return tripsWithUserDetails;
  }

  async checkTripAccess(tripId: string, user: User): Promise<boolean> {
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
