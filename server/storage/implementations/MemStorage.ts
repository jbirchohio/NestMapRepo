import type { IStorage } from '../types/index.js';
import  { InMemoryTripTravelerRepository } from '../repositories/TripTravelerRepository.js';
import * as crypto from 'crypto';
import type { Activity, TripTraveler, NewTripTraveler, User, NewUser, Trip, NewTrip } from '@shared/src/schema.ts';
type InsertUser = NewUser;
type InsertTrip = NewTrip;
export class MemStorage implements IStorage {
    private travelerRepository: InMemoryTripTravelerRepository;
    private activities: Map<string, Activity> = new Map();
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
    async updateTripTraveler(id: string, updates: Partial<NewTripTraveler>): Promise<TripTraveler | undefined> {
        return this.travelerRepository.updateTripTraveler(id, updates);
    }
    async removeTripTraveler(id: string): Promise<boolean> {
        return this.travelerRepository.removeTripTraveler(id);
    }
    // Corporate Card operations
    async createCorporateCard(cardData: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): Promise<any> {
        // In a real implementation, this would create a new card in the database
        // For the mock, we'll return a basic card object
        return {
            id: 'card_' + Math.random().toString(36).substr(2, 9),
            ...cardData,
            status: 'active',
            created_at: new Date().toISOString()
        };
    }
    async updateCorporateCard(_id: string | number, _updates: {
        status?: string;
        [key: string]: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
    }): Promise<boolean> {
        // In a real implementation, this would update the card in the database
        // For the mock, we'll just return true to indicate success
        return true;
    }
    async getCorporateCard(_id: string | number): Promise<any> {
        // In a real implementation, this would fetch the card from the database
        // For the mock, we'll return a basic card object
        return {
            id: _id,
            user_id: 'mock-user-id',
            organization_id: 'mock-org-id',
            stripe_card_id: 'card_mock123',
            last_four: '4242',
            status: 'active'
        };
    }
    // Organization operations
    async getOrganization(id: string): Promise<any> {
        // In a real implementation, this would fetch the organization from the database
        // For the mock, we'll return a basic organization object with Stripe Connect enabled
        return {
            id: id,
            name: 'Test Organization',
            stripe_connect_id: 'acct_mock123',
            is_stripe_connected: true
        };
    }
    // Stub implementations for other required methods
    async getUser(_id: string): Promise<User | undefined> {
        throw new Error('Not implemented');
    }
    async getUserByUsername(_username: string): Promise<User | undefined> {
        throw new Error('Not implemented');
    }
    async getUserByAuthId(_authId: string): Promise<User | undefined> {
        throw new Error('Not implemented');
    }
    async getUserByEmail(_email: string): Promise<User | undefined> {
        throw new Error('Not implemented');
    }
    async createUser(_user: InsertUser): Promise<User> {
        throw new Error('Not implemented');
    }
    async updateUser(_id: string, _user: Partial<InsertUser>): Promise<User | undefined> {
        throw new Error('Not implemented');
    }
    // Trip operations
    async getTrip(_id: string, _organizationId: string): Promise<Trip | undefined> {
        throw new Error('Not implemented');
    }
    async getTripsByUserId(_userId: string, _organizationId?: string | null): Promise<Trip[]> {
        throw new Error('Not implemented');
    }
    async getTripsByOrganizationId(_organizationId: string): Promise<Trip[]> {
        throw new Error('Not implemented');
    }
    async getUserTrips(_userId: string, _organizationId?: string | null): Promise<Trip[]> {
        throw new Error('Not implemented');
    }
    async getTripByShareCode(_shareCode: string): Promise<Trip | undefined> {
        throw new Error('Not implemented');
    }
    async createTrip(_trip: InsertTrip): Promise<Trip> {
        throw new Error('Not implemented');
    }
    async updateTrip(_id: string, _organizationId: string, _trip: Partial<InsertTrip>): Promise<Trip | undefined> {
        throw new Error('Not implemented');
    }
    async deleteTrip(_id: string, _organizationId: string): Promise<boolean> {
        throw new Error('Not implemented');
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
        const now = new Date().toISOString();
        const newActivity: Activity = {
            ...activity,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        };
        this.activities.set(newActivity.id, newActivity);
        return newActivity;
    }
    async updateActivity(id: string, updates: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | undefined> {
        const activity = await this.getActivity(id);
        if (!activity)
            return undefined;
        const updatedActivity = {
            ...activity,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.activities.set(id, updatedActivity);
        return updatedActivity;
    }
    async deleteActivity(id: string): Promise<boolean> {
        return this.activities.delete(id);
    }
}
