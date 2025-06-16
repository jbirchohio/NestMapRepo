import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../db';
import { trips as tripsTable, users as usersTable } from '../../../db/schema.js';
import { Trip, User } from '../../../db/schema.js';
import { TripRepository } from '../interfaces/trip.repository.interface';
import { CorporateTripDto } from '../interfaces/trip.service.interface';
import { UnauthorizedError } from '../../common/errors';
import { BaseRepositoryImpl } from '../../common/repositories/base.repository';

@Injectable()
export class TripRepositoryImpl extends BaseRepositoryImpl<Trip, number, Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>> implements TripRepository {
  constructor() {
    super('Trip', tripsTable, tripsTable.id);
  }

  async getTripsByUserId(userId: string, orgId: number): Promise<Trip[]> {
    this.logger.log(`Fetching trips for user ${userId} in organization ${orgId}`);
    
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

  async getTripsByOrganizationId(orgId: number): Promise<Trip[]> {
    this.logger.log(`Fetching all trips for organization ${orgId}`);
    
    return db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.organizationId, orgId));
  }

  async getTripById(tripId: number): Promise<Trip | null> {
    this.logger.log(`Fetching trip ${tripId}`);
    return super.findById(tripId);
  }

  async createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    this.logger.log('Creating new trip');
    return super.create(tripData);
  }

  async updateTrip(tripId: number, tripData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip | null> {
    this.logger.log(`Updating trip ${tripId}`);
    return super.update(tripId, tripData);
  }

  async deleteTrip(tripId: number): Promise<boolean> {
    this.logger.log(`Deleting trip ${tripId}`);
    return super.delete(tripId);
  }

  async getCorporateTrips(orgId: number): Promise<CorporateTripDto[]> {
    this.logger.log(`Fetching corporate trips for organization ${orgId}`);
    
    const trips = await this.getTripsByOrganizationId(orgId);

    const tripsWithUserDetails = await Promise.all(
      trips.map(async (trip) => {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, trip.userId))
          .limit(1);

        return {
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          userId: String(trip.userId),
          city: trip.city,
          country: trip.country,
          budget: trip.budget,
          completed: trip.completed ?? false,
          trip_type: trip.tripType as 'business' | 'leisure' | 'bleisure' | null,
          client_name: trip.clientName,
          project_type: trip.projectType,
          userName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || 'Unknown User',
          userEmail: user?.email || 'No Email',
        };
      })
    );

    return tripsWithUserDetails;
  }

  async checkTripAccess(tripId: number, user: User): Promise<boolean> {
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
