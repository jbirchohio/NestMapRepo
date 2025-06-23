import type { ITripTravelerRepository, TripTraveler, NewTripTraveler } from '../types/index.js';
export class InMemoryTripTravelerRepository implements ITripTravelerRepository {
    private travelers: Map<string, TripTraveler> = new Map();
    private nextId = 1;
    async getTripTravelers(tripId: string): Promise<TripTraveler[]> {
        return Array.from(this.travelers.values())
            .filter(traveler => traveler.tripId === tripId);
    }
    async getTripTraveler(id: string): Promise<TripTraveler | undefined> {
        return this.travelers.get(id);
    }
    async addTripTraveler(traveler: NewTripTraveler): Promise<TripTraveler> {
        const id = (this.nextId++).toString();
        const now = new Date().toISOString();
        const newTraveler: TripTraveler = {
            id,
            ...traveler,
            status: traveler.status || 'pending',
            createdAt: now,
            updatedAt: now
        };
        this.travelers.set(id, newTraveler);
        return newTraveler;
    }
    async updateTripTraveler(id: string, updates: Partial<NewTripTraveler>): Promise<TripTraveler | undefined> {
        const traveler = this.travelers.get(id);
        if (!traveler)
            return undefined;
        const updatedTraveler: TripTraveler = {
            ...traveler,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.travelers.set(id, updatedTraveler);
        return updatedTraveler;
    }
    async removeTripTraveler(id: string): Promise<boolean> {
        return this.travelers.delete(id);
    }
}
