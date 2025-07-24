import { IStorage } from '../types/index';
import { InMemoryTripTravelerRepository } from '../repositories/TripTravelerRepository';
import * as crypto from 'crypto';
import { 
  Activity,
  User, 
  NewUser, 
  Trip, 
  NewTrip 
} from '../../src/db/schema';
import { 
  TripTraveler, 
  NewTripTraveler 
} from '../types/index';

type InsertUser = NewUser;
type InsertTrip = NewTrip;

export class MemStorage implements IStorage {
  private travelerRepository: InMemoryTripTravelerRepository;
  private activities: Map<string, Activity> = new Map();
  private users: Map<string, User> = new Map();
  private trips: Map<string, Trip> = new Map();

  constructor() {
    this.travelerRepository = new InMemoryTripTravelerRepository();
  }

  // Trip Traveler operations
  async getTripTravelers(tripId: string): Promise<TripTraveler[]> {
    return this.travelerRepository.getTripTravelers(tripId);
  }

  async getTripTraveler(id: string): Promise<TripTraveler | undefined> {
    return this.travelerRepository.getTripTraveler(id);
  }

  async addTripTraveler(traveler: NewTripTraveler): Promise<TripTraveler> {
    return this.travelerRepository.addTripTraveler(traveler);
  }

  async updateTripTraveler(
    id: string, 
    updates: Partial<NewTripTraveler>
  ): Promise<TripTraveler | undefined> {
    return this.travelerRepository.updateTripTraveler(id, updates);
  }

  async removeTripTraveler(id: string): Promise<boolean> {
    return this.travelerRepository.removeTripTraveler(id);
  }

  // Corporate Card operations
  async createCorporateCard(cardData: any): Promise<any> {
    throw new Error('Corporate card creation requires database integration');
  }

  async updateCorporateCard(
    _id: string | number, 
    _updates: { status?: string; [key: string]: any }
  ): Promise<boolean> {
    throw new Error('Corporate card updates require database integration');
  }

  async getCorporateCard(_id: string | number): Promise<any> {
    throw new Error('Corporate card retrieval requires database integration');
  }

  // Organization operations
  async getOrganization(id: string): Promise<any> {
    throw new Error('Organization retrieval requires database integration');
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> { 
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> { 
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUserByAuthId(authId: string): Promise<User | undefined> { 
    // Note: User schema doesn't have authId property
    // This might need to be implemented differently or the User schema needs to be updated
    return undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> { 
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(userData: InsertUser): Promise<User> { 
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      // Handle optional fields properly
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      passwordChangedAt: userData.passwordChangedAt ?? null,
      passwordResetToken: userData.passwordResetToken ?? null,
      passwordResetExpires: userData.passwordResetExpires ?? null,
      resetToken: userData.resetToken ?? null,
      resetTokenExpires: userData.resetTokenExpires ?? null,
      failedLoginAttempts: userData.failedLoginAttempts ?? 0,
      lockedUntil: userData.lockedUntil ?? null,
      mfaSecret: userData.mfaSecret ?? null,
      lastLoginAt: userData.lastLoginAt ?? null,
      lastLoginIp: userData.lastLoginIp ?? null,
      role: userData.role ?? 'member',
      organizationId: userData.organizationId ?? null,
      emailVerified: userData.emailVerified ?? false,
      isActive: userData.isActive ?? true,
      // Required fields
      email: userData.email,
      username: userData.username,
      passwordHash: userData.passwordHash
    };
    this.users.set(user.id, user);
    return user;
  }
  
  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> { 
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Trip operations
  async getTrip(id: string, organizationId: string): Promise<Trip | undefined> { 
    const trip = this.trips.get(id);
    return (trip && trip.organizationId === organizationId) ? trip : undefined;
  }
  
  async getTripsByUserId(userId: string, organizationId?: string | null): Promise<Trip[]> { 
    return Array.from(this.trips.values()).filter(trip => 
      trip.userId === userId && 
      (!organizationId || trip.organizationId === organizationId)
    );
  }
  
  async getTripsByOrganizationId(organizationId: string): Promise<Trip[]> { 
    return Array.from(this.trips.values()).filter(trip => 
      trip.organizationId === organizationId
    );
  }
  
  async getUserTrips(userId: string, organizationId?: string | null): Promise<Trip[]> { 
    return this.getTripsByUserId(userId, organizationId);
  }
  
  async getTripByShareCode(shareCode: string): Promise<Trip | undefined> { 
    return Array.from(this.trips.values()).find(trip => trip.shareCode === shareCode);
  }
  
  async createTrip(tripData: InsertTrip): Promise<Trip> { 
    const trip: Trip = {
      id: crypto.randomUUID(),
      shareCode: this.generateShareCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
      // Handle optional fields properly with correct field names
      organizationId: tripData.organizationId ?? null,
      collaborators: tripData.collaborators ?? null,
      isPublic: tripData.isPublic ?? false,
      sharingEnabled: tripData.sharingEnabled ?? false,
      sharePermission: tripData.sharePermission ?? 'read-only',
      city: tripData.city ?? null,
      country: tripData.country ?? null,
      location: tripData.location ?? null,
      cityLatitude: tripData.cityLatitude ?? null,
      cityLongitude: tripData.cityLongitude ?? null,
      hotel: tripData.hotel ?? null,
      hotelLatitude: tripData.hotelLatitude ?? null,
      hotelLongitude: tripData.hotelLongitude ?? null,
      completed: tripData.completed ?? false,
      completedAt: tripData.completedAt ?? null,
      tripType: tripData.tripType ?? 'personal',
      clientName: tripData.clientName ?? null,
      projectType: tripData.projectType ?? null,
      budget: tripData.budget ?? null,
      // Required fields
      title: tripData.title,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      userId: tripData.userId
    };
    this.trips.set(trip.id, trip);
    return trip;
  }
  
  async updateTrip(
    id: string, 
    organizationId: string, 
    tripData: Partial<InsertTrip>
  ): Promise<Trip | undefined> { 
    const existingTrip = this.trips.get(id);
    if (!existingTrip || existingTrip.organizationId !== organizationId) {
      return undefined;
    }
    
    const updatedTrip: Trip = {
      ...existingTrip,
      ...tripData,
      updatedAt: new Date()
    };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }
  
  async deleteTrip(id: string, organizationId: string): Promise<boolean> { 
    const trip = this.trips.get(id);
    if (!trip || trip.organizationId !== organizationId) {
      return false;
    }
    return this.trips.delete(id);
  }

  private generateShareCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  // Activity operations
  async getActivitiesByTripId(tripId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.tripId === tripId);
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const now = new Date();
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.activities.set(newActivity.id, newActivity);
    return newActivity;
  }

  async updateActivity(
    id: string,
    updates: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Activity | undefined> {
    const activity = await this.getActivity(id);
    if (!activity) return undefined;

    const updatedActivity = {
      ...activity,
      ...updates,
      updatedAt: new Date()
    };
    
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }
}
