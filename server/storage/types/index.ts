import { 
  User, 
  Trip, 
  Activity,
  BaseEntity 
} from '../../shared/src/schema.js'/../shared/src/schema.js';

// Define types that are used but not yet in the shared schema
type NewActivity = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;

// Temporary interfaces - these should be moved to @shared/schema when implemented
interface Todo {}
interface Note {}
interface Invitation {}
interface NewInvitation {}
export interface TripTraveler extends BaseEntity {
  id: string;
  tripId: string;
  userId: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'removed.js';
  createdAt: string;
  updatedAt: string;
}

export interface NewTripTraveler {
  tripId: string;
  userId: string;
  role: string;
  status?: 'pending' | 'accepted' | 'declined' | 'removed.js';
}

type InsertUser = any; // Define or import the correct type
type InsertTrip = any; // Define or import the correct type
type InsertTodo = any; // Define or import the correct type
type InsertNote = any; // Define or import the correct type

// Base repository interface for common operations
export interface IRepository<T, InsertT> {
  get(id: number): Promise<T | undefined>;
  create(data: InsertT): Promise<T>;
  update(id: number, data: Partial<InsertT>): Promise<T | undefined>;
  delete(id: number): Promise<boolean>;
}

// User repository interface
export interface IUserRepository extends IRepository<User, InsertUser> {
  getByUsername(username: string): Promise<User | undefined>;
  getByAuthId(authId: string): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
}

// Trip repository interface
export interface ITripRepository extends IRepository<Trip, InsertTrip> {
  getByUserId(userId: number, organizationId?: number | null): Promise<Trip[]>;
  getByOrganizationId(organizationId: number): Promise<Trip[]>;
  getByShareCode(shareCode: string): Promise<Trip | undefined>;
}

// Trip Traveler repository interface
export interface ITripTravelerRepository {
  getTripTravelers(tripId: string): Promise<TripTraveler[]>;
  getTripTraveler(id: string): Promise<TripTraveler | undefined>;
  addTripTraveler(traveler: NewTripTraveler): Promise<TripTraveler>;
  updateTripTraveler(id: string, updates: Partial<NewTripTraveler>): Promise<TripTraveler | undefined>;
  removeTripTraveler(id: string): Promise<boolean>;
}

// Main storage interface that composes all repositories
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAuthId(authId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Trip operations
  getTrip(id: string, organizationId: string): Promise<Trip | undefined>;
  getTripsByUserId(userId: string, organizationId?: string | null): Promise<Trip[]>;
  getTripsByOrganizationId(organizationId: string): Promise<Trip[]>;
  getUserTrips(userId: string, organizationId?: string | null): Promise<Trip[]>;
  getTripByShareCode(shareCode: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, organizationId: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string, organizationId: string): Promise<boolean>;

  // Trip Traveler operations
  getTripTravelers(tripId: string): Promise<TripTraveler[]>;
  getTripTraveler(id: string): Promise<TripTraveler | undefined>;
  addTripTraveler(traveler: NewTripTraveler): Promise<TripTraveler>;
  updateTripTraveler(id: string, updates: Partial<NewTripTraveler>): Promise<TripTraveler | undefined>;
  removeTripTraveler(id: string): Promise<boolean>;
  
  // Activity operations
  getActivitiesByTripId(tripId: string): Promise<Activity[]>;
}
  // ... other operations can be added here
