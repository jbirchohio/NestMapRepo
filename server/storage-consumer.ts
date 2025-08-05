import { db } from './db';
import { 
  users, trips, activities, notes, todos, bookings,
  tripCollaborators, invitations, waitlist,
  insertTripSchema, insertActivitySchema, insertNoteSchema, 
  insertTodoSchema, insertBookingSchema, registerUserSchema,
  User, Trip, Activity, Note, Todo, Booking
} from '../shared/schema';
import { eq, and, desc, inArray, sql, or } from 'drizzle-orm';
import { hashPassword } from './auth';
import { nanoid } from 'nanoid';
import { logger } from './utils/logger';

// Simple storage interface for consumer app
export interface IStorage {
  // User management
  createUser(userData: any): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Trip management
  createTrip(tripData: any): Promise<Trip>;
  getTripById(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number): Promise<Trip[]>;
  updateTrip(id: number, updates: any): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  getPublicTrips(): Promise<Trip[]>;
  getTripByShareCode(shareCode: string): Promise<Trip | undefined>;
  
  // Activity management
  createActivity(activityData: any): Promise<Activity>;
  getActivitiesByTripId(tripId: number): Promise<Activity[]>;
  updateActivity(id: number, updates: any): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Notes & Todos
  createNote(noteData: any): Promise<Note>;
  getNotesByTripId(tripId: number): Promise<Note[]>;
  createTodo(todoData: any): Promise<Todo>;
  getTodosByTripId(tripId: number): Promise<Todo[]>;
  updateTodo(id: number, updates: any): Promise<Todo | undefined>;
  
  // Bookings
  createBooking(bookingData: any): Promise<Booking>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  updateBooking(id: number, updates: any): Promise<Booking | undefined>;
  
  // Collaboration
  addTripCollaborator(tripId: number, userId: number, role: string): Promise<any>;
  getTripCollaborators(tripId: number): Promise<any[]>;
  removeTripCollaborator(tripId: number, userId: number): Promise<boolean>;
  
  // Waitlist
  addToWaitlist(email: string, referralSource?: string): Promise<any>;
}

// Consumer-focused database storage implementation
export class ConsumerDatabaseStorage implements IStorage {
  // User management
  async createUser(userData: any): Promise<User> {
    const validatedData = registerUserSchema.parse(userData);
    const hashedPassword = hashPassword(validatedData.password);
    
    const [newUser] = await db.insert(users).values({
      username: validatedData.username,
      email: validatedData.email,
      password_hash: hashedPassword,
      display_name: validatedData.display_name,
      role: 'user', // Always regular user for consumers
      role_type: 'consumer',
      organization_id: null, // No organizations in consumer app
    }).returning();
    
    return newUser;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Trip management
  async createTrip(tripData: any): Promise<Trip> {
    const insertTrip = insertTripSchema.parse(tripData);
    const shareCode = nanoid(8);
    
    const [newTrip] = await db.insert(trips).values({
      title: insertTrip.title,
      start_date: insertTrip.start_date,
      end_date: insertTrip.end_date,
      user_id: insertTrip.user_id,
      organization_id: null, // Always null for consumers
      share_code: shareCode,
      sharing_enabled: insertTrip.sharingEnabled || false,
      share_permission: insertTrip.sharePermission || 'read-only',
      is_public: insertTrip.isPublic || false,
      city: insertTrip.city,
      country: insertTrip.country,
      location: insertTrip.location,
      city_latitude: insertTrip.city_latitude,
      city_longitude: insertTrip.city_longitude,
      hotel: insertTrip.hotel,
      hotel_latitude: insertTrip.hotel_latitude,
      hotel_longitude: insertTrip.hotel_longitude,
      trip_type: 'personal', // Always personal for consumers
      budget: insertTrip.budget,
      collaborators: [],
    }).returning();
    
    return newTrip;
  }

  async getTripById(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
    return trip;
  }

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    // Get trips where user is owner or collaborator
    const ownTrips = await db.select()
      .from(trips)
      .where(eq(trips.user_id, userId))
      .orderBy(desc(trips.start_date));
      
    const collaboratingTrips = await db.select()
      .from(trips)
      .innerJoin(tripCollaborators, eq(trips.id, tripCollaborators.trip_id))
      .where(and(
        eq(tripCollaborators.user_id, userId),
        eq(tripCollaborators.status, 'accepted')
      ))
      .orderBy(desc(trips.start_date));
    
    const allTrips = [...ownTrips, ...collaboratingTrips.map(t => t.trips)];
    return allTrips.sort((a, b) => b.start_date.getTime() - a.start_date.getTime());
  }

  async updateTrip(id: number, updates: any): Promise<Trip | undefined> {
    const [updated] = await db.update(trips)
      .set(updates)
      .where(eq(trips.id, id))
      .returning();
    return updated;
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = await db.delete(trips).where(eq(trips.id, id));
    return result.count > 0;
  }

  async getPublicTrips(): Promise<Trip[]> {
    return await db.select()
      .from(trips)
      .where(eq(trips.is_public, true))
      .orderBy(desc(trips.created_at))
      .limit(50);
  }

  async getTripByShareCode(shareCode: string): Promise<Trip | undefined> {
    const [trip] = await db.select()
      .from(trips)
      .where(and(
        eq(trips.share_code, shareCode),
        eq(trips.sharing_enabled, true)
      ))
      .limit(1);
    return trip;
  }

  // Activity management
  async createActivity(activityData: any): Promise<Activity> {
    const insertActivity = insertActivitySchema.parse(activityData);
    
    const [newActivity] = await db.insert(activities).values({
      trip_id: insertActivity.trip_id,
      organization_id: null, // Always null for consumers
      title: insertActivity.title,
      date: insertActivity.date,
      time: insertActivity.time,
      location_name: insertActivity.location_name,
      latitude: insertActivity.latitude,
      longitude: insertActivity.longitude,
      notes: insertActivity.notes,
      tag: insertActivity.tag,
      assigned_to: insertActivity.assigned_to,
      order: insertActivity.order,
      travel_mode: insertActivity.travel_mode,
      booking_url: insertActivity.booking_url,
      booking_reference: insertActivity.booking_reference,
      price: insertActivity.price,
      currency: insertActivity.currency,
      provider: insertActivity.provider,
    }).returning();
    
    return newActivity;
  }

  async getActivitiesByTripId(tripId: number): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .where(eq(activities.trip_id, tripId))
      .orderBy(activities.date, activities.order);
  }

  async updateActivity(id: number, updates: any): Promise<Activity | undefined> {
    const [updated] = await db.update(activities)
      .set(updates)
      .where(eq(activities.id, id))
      .returning();
    return updated;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return result.count > 0;
  }

  // Notes & Todos
  async createNote(noteData: any): Promise<Note> {
    const insertNote = insertNoteSchema.parse(noteData);
    
    const [newNote] = await db.insert(notes).values({
      trip_id: insertNote.trip_id,
      content: insertNote.content,
      created_by: insertNote.created_by,
    }).returning();
    
    return newNote;
  }

  async getNotesByTripId(tripId: number): Promise<Note[]> {
    return await db.select()
      .from(notes)
      .where(eq(notes.trip_id, tripId))
      .orderBy(desc(notes.created_at));
  }

  async createTodo(todoData: any): Promise<Todo> {
    const insertTodo = insertTodoSchema.parse(todoData);
    
    const [newTodo] = await db.insert(todos).values({
      trip_id: insertTodo.trip_id,
      content: insertTodo.content,
      is_completed: insertTodo.is_completed || false,
      assigned_to: insertTodo.assigned_to,
    }).returning();
    
    return newTodo;
  }

  async getTodosByTripId(tripId: number): Promise<Todo[]> {
    return await db.select()
      .from(todos)
      .where(eq(todos.trip_id, tripId))
      .orderBy(todos.created_at);
  }

  async updateTodo(id: number, updates: any): Promise<Todo | undefined> {
    const [updated] = await db.update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning();
    return updated;
  }

  // Bookings
  async createBooking(bookingData: any): Promise<Booking> {
    const insertBooking = insertBookingSchema.parse(bookingData);
    
    const [newBooking] = await db.insert(bookings).values(insertBooking).returning();
    return newBooking;
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return await db.select()
      .from(bookings)
      .where(eq(bookings.user_id, userId))
      .orderBy(desc(bookings.created_at));
  }

  async updateBooking(id: number, updates: any): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  // Collaboration
  async addTripCollaborator(tripId: number, userId: number, role: string): Promise<any> {
    const [collaborator] = await db.insert(tripCollaborators).values({
      trip_id: tripId,
      user_id: userId,
      role: role,
      status: 'pending',
    }).returning();
    
    return collaborator;
  }

  async getTripCollaborators(tripId: number): Promise<any[]> {
    return await db.select({
      id: tripCollaborators.id,
      user_id: tripCollaborators.user_id,
      role: tripCollaborators.role,
      status: tripCollaborators.status,
      user: users,
    })
    .from(tripCollaborators)
    .innerJoin(users, eq(tripCollaborators.user_id, users.id))
    .where(eq(tripCollaborators.trip_id, tripId));
  }

  async removeTripCollaborator(tripId: number, userId: number): Promise<boolean> {
    const result = await db.delete(tripCollaborators)
      .where(and(
        eq(tripCollaborators.trip_id, tripId),
        eq(tripCollaborators.user_id, userId)
      ));
    return result.count > 0;
  }

  // Waitlist
  async addToWaitlist(email: string, referralSource?: string): Promise<any> {
    const [entry] = await db.insert(waitlist).values({
      email,
      referral_source: referralSource,
    }).returning();
    
    return entry;
  }
}

// Export a single storage instance
export const storage = new ConsumerDatabaseStorage();