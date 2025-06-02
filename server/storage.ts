import { 
  users, type User, type InsertUser,
  trips, type Trip, type InsertTrip,
  activities, type Activity, type InsertActivity,
  todos, type Todo, type InsertTodo,
  notes, type Note, type InsertNote,
  invitations, type Invitation, type InsertInvitation,
  organizations,
  transformTripToFrontend, transformActivityToFrontend
} from "@shared/schema";
import { transformActivityToDatabase, transformTodoToDatabase, transformNoteToDatabase, transformTripToDatabase } from "@shared/fieldTransforms";
import { eq, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAuthId(authId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number, organizationId?: number | null): Promise<Trip[]>;
  getTripsByOrganizationId(organizationId: number): Promise<Trip[]>;
  getUserTrips(userId: number, organizationId?: number | null): Promise<Trip[]>;
  getTripByShareCode(shareCode: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;

  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByTripId(tripId: number): Promise<Activity[]>;
  getActivities(tripId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;

  // Todo operations
  getTodo(id: number): Promise<Todo | undefined>;
  getTodosByTripId(tripId: number): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(id: number): Promise<boolean>;

  // Note operations
  getNote(id: number): Promise<Note | undefined>;
  getNotesByTripId(tripId: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;

  // Team invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string, userId: number): Promise<Invitation | undefined>;

  // Organization operations
  getOrganization(id: number): Promise<any>;
  updateOrganization(id: number, data: any): Promise<any>;
  getOrganizationMembers(id: number): Promise<any[]>;
  updateOrganizationMember(orgId: number, userId: number, data: any): Promise<any>;
  removeOrganizationMember(orgId: number, userId: number): Promise<boolean>;
  getAllTrips(): Promise<Trip[]>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private activities: Map<number, Activity>;
  private todos: Map<number, Todo>;
  private notes: Map<number, Note>;
  private invitations: Map<number, Invitation>;

  private userIdCounter: number;
  private tripIdCounter: number;
  private activityIdCounter: number;
  private todoIdCounter: number;
  private noteIdCounter: number;
  private invitationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.activities = new Map();
    this.todos = new Map();
    this.notes = new Map();
    this.invitations = new Map();

    this.userIdCounter = 1;
    this.tripIdCounter = 1;
    this.activityIdCounter = 1;
    this.todoIdCounter = 1;
    this.noteIdCounter = 1;
    this.invitationIdCounter = 1;

    // Add sample user for testing
    this.createUser({
      auth_id: "test-auth-id",
      username: "testuser",
      email: "demo@nestmap.com"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.auth_id === authId
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || null,
      role_type: insertUser.role_type || null,
      organization_id: insertUser.organization_id || null,
      company: insertUser.company || null,
      job_title: insertUser.job_title || null,
      team_size: insertUser.team_size || null,
      use_case: insertUser.use_case || null,
      created_at: new Date(),
      display_name: insertUser.display_name || null,
      avatar_url: insertUser.avatar_url || null,
      password_hash: insertUser.password_hash ?? null
    };
    this.users.set(id, user);
    return user;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.user_id === userId
    );
  }

  async getTripsByOrganizationId(organizationId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.organization_id === organizationId
    );
  }

  async getUserTrips(userId: number): Promise<Trip[]> {
    return this.getTripsByUserId(userId);
  }

  async getTripByShareCode(shareCode: string): Promise<Trip | undefined> {
    return Array.from(this.trips.values()).find(
      (trip) => trip.share_code === shareCode
    );
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.tripIdCounter++;
    const trip: Trip = { 
      ...insertTrip, 
      id,
      organization_id: insertTrip.organizationId || null,
      share_permission: "read-only",
      created_at: new Date(),
      updated_at: new Date(),
      collaborators: insertTrip.collaborators || [],
      is_public: insertTrip.isPublic || false,
      sharing_enabled: insertTrip.sharingEnabled || false,
      share_code: insertTrip.shareCode || null,
      city: insertTrip.city || null,
      country: insertTrip.country || null,
      location: insertTrip.location || null,
      city_latitude: insertTrip.city_latitude || null,
      city_longitude: insertTrip.city_longitude || null,
      hotel: insertTrip.hotel || null,
      hotel_latitude: insertTrip.hotel_latitude || null,
      hotel_longitude: insertTrip.hotel_longitude || null,
      completed: insertTrip.completed || false,
      completed_at: insertTrip.completed_at || null,
      trip_type: insertTrip.trip_type || "personal",
      client_name: insertTrip.client_name || null,
      project_type: insertTrip.project_type || null,
      budget: insertTrip.budget || null,
      start_date: insertTrip.startDate,
      end_date: insertTrip.endDate,
      user_id: insertTrip.userId
    };
    this.trips.set(id, trip);
    return trip;
  }

  async updateTrip(id: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;

    const updatedTrip = { ...trip, ...tripData };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }

  async deleteTrip(id: number): Promise<boolean> {
    return this.trips.delete(id);
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByTripId(tripId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((activity) => activity.trip_id === tripId)
      .sort((a, b) => a.order - b.order);
  }

  async getActivities(tripId: number): Promise<Activity[]> {
    return this.getActivitiesByTripId(tripId);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const activity: Activity = { 
      ...insertActivity, 
      id,
      organization_id: insertActivity.organizationId || null,
      latitude: insertActivity.latitude || null,
      longitude: insertActivity.longitude || null,
      notes: insertActivity.notes || null,
      tag: insertActivity.tag || null,
      assigned_to: insertActivity.assignedTo || null,
      travel_mode: insertActivity.travelMode || null,
      completed: insertActivity.completed ?? false,
      trip_id: insertActivity.tripId,
      date: insertActivity.date,
      time: insertActivity.time,
      title: insertActivity.title,
      location_name: insertActivity.locationName
    };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;

    const updatedActivity = { ...activity, ...activityData };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Todo operations
  async getTodo(id: number): Promise<Todo | undefined> {
    return this.todos.get(id);
  }

  async getTodosByTripId(tripId: number): Promise<Todo[]> {
    return Array.from(this.todos.values()).filter(
      (todo) => todo.trip_id === tripId
    );
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    const id = this.todoIdCounter++;
    const todo: Todo = { 
      ...insertTodo, 
      id,
      organization_id: insertTodo.organizationId || null,
      assigned_to: insertTodo.assignedTo || null,
      completed: insertTodo.completed ?? false,
      trip_id: insertTodo.tripId,
      task: insertTodo.task
    };
    this.todos.set(id, todo);
    return todo;
  }

  async updateTodo(id: number, todoData: Partial<InsertTodo>): Promise<Todo | undefined> {
    const todo = this.todos.get(id);
    if (!todo) return undefined;

    const updatedTodo = { ...todo, ...todoData };
    this.todos.set(id, updatedTodo);
    return updatedTodo;
  }

  async deleteTodo(id: number): Promise<boolean> {
    return this.todos.delete(id);
  }

  // Note operations
  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async getNotesByTripId(tripId: number): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(
      (note) => note.trip_id === tripId
    );
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const note: Note = { 
      ...insertNote, 
      id,
      organization_id: insertNote.organizationId || null,
      trip_id: insertNote.tripId,
      content: insertNote.content
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: number, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;

    const updatedNote = { ...note, ...noteData };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Team invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const id = this.invitationIdCounter++;
    const newInvitation: Invitation = { 
      ...invitation, 
      id,
      organizationId: invitation.organizationId ?? null,
      status: 'pending',
      createdAt: new Date(),
      acceptedAt: null
    };
    this.invitations.set(id, newInvitation);
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    for (const invitation of this.invitations.values()) {
      if (invitation.token === token) {
        return invitation;
      }
    }
    return undefined;
  }

  async acceptInvitation(token: string, userId: number): Promise<Invitation | undefined> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending') {
      return undefined;
    }

    // Update user's organization and role
    const user = this.users.get(userId);
    if (user) {
      user.organizationId = invitation.organizationId;
      user.role = invitation.role;
      this.users.set(userId, user);
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  // Organization operations
  async getOrganization(id: number): Promise<any> {
    // Placeholder for organization data
    return { id, name: `Organization ${id}`, settings: {} };
  }

  async updateOrganization(id: number, data: any): Promise<any> {
    // Placeholder for organization update
    return { id, ...data };
  }

  async getOrganizationMembers(id: number): Promise<any[]> {
    // Return users in this organization
    return Array.from(this.users.values()).filter(user => user.organization_id === id);
  }

  async updateOrganizationMember(orgId: number, userId: number, data: any): Promise<any> {
    const user = this.users.get(userId);
    if (user && user.organization_id === orgId) {
      const updatedUser = { ...user, ...data };
      this.users.set(userId, updatedUser);
      return updatedUser;
    }
    return null;
  }

  async removeOrganizationMember(orgId: number, userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (user && user.organization_id === orgId) {
      user.organization_id = null;
      this.users.set(userId, user);
      return true;
    }
    return false;
  }

  async getAllTrips(): Promise<Trip[]> {
    return Array.from(this.trips.values());
  }
}

// Database storage implementation
import { db } from './db';

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.auth_id, authId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip || undefined;
  }

  async getTripsByUserId(userId: number, organizationId?: number | null): Promise<Trip[]> {
    // Critical security fix: Include organization filtering to prevent cross-tenant data access
    if (organizationId !== undefined) {
      // Secure multi-tenant query with organization isolation
      const tripList = await db.select().from(trips).where(
        organizationId ? and(
          eq(trips.user_id, userId),
          eq(trips.organization_id, organizationId)
        ) : eq(trips.user_id, userId)
      );
      return tripList;
    } else {
      // For non-organization users, filter by user only
      const tripList = await db.select().from(trips).where(eq(trips.user_id, userId));
      return tripList;
    }
  }

  async getTripsByOrganizationId(organizationId: number): Promise<Trip[]> {
    const tripList = await db.select().from(trips).where(eq(trips.organization_id, organizationId));
    return tripList;
  }

  async getUserTrips(userId: number): Promise<Trip[]> {
    return this.getTripsByUserId(userId);
  }

  async getTripByShareCode(shareCode: string): Promise<Trip | undefined> {
    try {
      const [trip] = await db.select().from(trips).where(eq(trips.share_code, shareCode));
      return trip || undefined;
    } catch (error) {
      console.error("Error fetching trip by share code:", error);
      throw error;
    }
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = transformTripToDatabase(insertTrip);
    
    const [trip] = await db
      .insert(trips)
      .values(dbData)
      .returning();
    
    // Return the trip as-is since the database now uses snake_case
    return trip;
  }

  async updateTrip(id: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = transformTripToDatabase(tripData);
    
    const [updatedTrip] = await db
      .update(trips)
      .set(dbData)
      .where(eq(trips.id, id))
      .returning();
    
    return updatedTrip || undefined;
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = await db
      .delete(trips)
      .where(eq(trips.id, id))
      .returning({ id: trips.id });
    return result.length > 0;
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivitiesByTripId(tripId: number): Promise<Activity[]> {
    const activityList = await db.select().from(activities).where(eq(activities.trip_id, tripId)).orderBy(activities.order);
    return activityList;
  }

  async getActivities(tripId: number): Promise<Activity[]> {
    return this.getActivitiesByTripId(tripId);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = transformActivityToDatabase(insertActivity);
    
    const [activity] = await db
      .insert(activities)
      .values(dbData)
      .returning();
    
    return activity;
  }

  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    try {
      // Special handling for completion toggle
      if (Object.keys(activityData).length === 1 && 'completed' in activityData) {
        console.log(`Direct DB update for activity completion: ${id}, value: ${activityData.completed}`);

        // Direct SQL query to update just the completion field
        const [updatedActivity] = await db
          .update(activities)
          .set({ completed: activityData.completed === true })
          .where(eq(activities.id, id))
          .returning();

        return updatedActivity;
      }

      // Normal update for other cases
      const [updatedActivity] = await db
        .update(activities)
        .set(activityData)
        .where(eq(activities.id, id))
        .returning();

      return updatedActivity || undefined;
    } catch (error) {
      console.error("Error in updateActivity:", error);
      throw error;
    }
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning({ id: activities.id });
    return result.length > 0;
  }

  // Todo operations
  async getTodo(id: number): Promise<Todo | undefined> {
    const [todo] = await db.select().from(todos).where(eq(todos.id, id));
    return todo || undefined;
  }

  async getTodosByTripId(tripId: number): Promise<Todo[]> {
    const todoList = await db.select().from(todos).where(eq(todos.trip_id, tripId));
    return todoList;
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = transformTodoToDatabase(insertTodo);
    
    const [todo] = await db
      .insert(todos)
      .values(dbData)
      .returning();
    
    return todo;
  }

  async updateTodo(id: number, todoData: Partial<InsertTodo>): Promise<Todo | undefined> {
    const [updatedTodo] = await db
      .update(todos)
      .set(todoData)
      .where(eq(todos.id, id))
      .returning();
    return updatedTodo || undefined;
  }

  async deleteTodo(id: number): Promise<boolean> {
    const result = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning({ id: todos.id });
    return result.length > 0;
  }

  // Note operations
  async getNote(id: number): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async getNotesByTripId(tripId: number): Promise<Note[]> {
    const noteList = await db.select().from(notes).where(eq(notes.trip_id, tripId));
    return noteList;
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = transformNoteToDatabase(insertNote);
    
    const [note] = await db
      .insert(notes)
      .values(dbData)
      .returning();
    
    return note;
  }

  async updateNote(id: number, noteData: Partial<InsertNote>): Promise<Note | undefined> {
    const [updatedNote] = await db
      .update(notes)
      .set(noteData)
      .where(eq(notes.id, id))
      .returning();
    return updatedNote || undefined;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await db
      .delete(notes)
      .where(eq(notes.id, id))
      .returning({ id: notes.id });
    return result.length > 0;
  }

  // Team invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db
      .insert(invitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation || undefined;
  }

  async acceptInvitation(token: string, userId: number): Promise<Invitation | undefined> {
    // First verify the invitation exists and is valid
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
      return undefined;
    }

    // Update user's organization and role based on invitation
    await db
      .update(users)
      .set({
        organization_id: invitation.organization_id,
        role: invitation.role
      })
      .where(eq(users.id, userId));

    // Mark invitation as accepted
    const [acceptedInvitation] = await db
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date()
      })
      .where(eq(invitations.token, token))
      .returning();

    return acceptedInvitation || undefined;
  }

  // Organization operations
  async getOrganization(id: number): Promise<any> {
    // Placeholder for organization data - would be implemented with proper organization table
    return { id, name: `Organization ${id}`, settings: {} };
  }

  async updateOrganization(id: number, data: any): Promise<any> {
    // Placeholder for organization update - would be implemented with proper organization table
    return { id, ...data };
  }

  async getOrganizationMembers(id: number): Promise<any[]> {
    const members = await db.select().from(users).where(eq(users.organization_id, id));
    return members;
  }

  async updateOrganizationMember(orgId: number, userId: number, data: any): Promise<any> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(and(eq(users.id, userId), eq(users.organization_id, orgId)))
      .returning();
    return updatedUser || null;
  }

  async removeOrganizationMember(orgId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ organization_id: null })
      .where(and(eq(users.id, userId), eq(users.organization_id, orgId)))
      .returning({ id: users.id });
    return result.length > 0;
  }

  async getAllTrips(): Promise<Trip[]> {
    return await db.select().from(trips);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
}



// Extend DatabaseStorage class
export class ExtendedDatabaseStorage extends DatabaseStorage {
  // Method to get trips by organization ID
  async getTripsByOrganizationId(organizationId: number): Promise<Trip[]> {
    try {
      console.log('Fetching trips for organization:', organizationId);
      const results = await this.db
        .select()
        .from(trips)
        .where(eq(trips.organization_id, organizationId));

      console.log(`Found ${results.length} trips for organization ${organizationId}`);
      return results;
    } catch (error) {
      console.error('Error fetching trips by organization ID:', error);
      throw new Error('Failed to fetch organization trips');
    }
  }

  private db = db;

  private async initializeTestData() {
    console.log("🎯 Initializing test data...");

    // First create an organization if it doesn't exist
    try {
      await this.db.insert(organizations).values({
        id: 1,
        name: "JonasCo",
        domain: "jonasco.com",
        created_at: new Date(),
        updated_at: new Date()
      }).onConflictDoNothing();
      console.log('Organization JonasCo created/verified');
    } catch (error) {
      console.log('Organization already exists or error creating:', error);
    }

    this.createUser({
      auth_id: "test-auth-id",
      username: "testuser",
      email: "demo@nestmap.com",
      organization_id: 1
    });

    // Add sample corporate user
    const userPromise = this.createUser({
      auth_id: "20e22e11-048f-4f69-b8e8-42d0c8c8c88e",
      username: "jbirchohio",
      email: "jbirchohio@gmail.com",
      display_name: "Jonas Birch",
      organization_id: 1,
      role: "admin"
    }).then(user => {
      console.log('Created/updated user with organization:', user);
      return user;
    }).then(user => {
      // Example of creating trips associated with the user and organization
      this.createTrip({
        userId: user.id,
        title: "Corporate Trip 1",
        city: "New York",
        country: "USA",
        organizationId: user.organization_id || 1,
        client_name: "Acme Corp",
        project_type: "Consulting",
        budget: 10000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        collaborators: [],
        completed: false,
        trip_type: "business",
        isPublic: false,
        sharingEnabled: false,
        sharePermission: "view"
      });

      this.createTrip({
        userId: user.id,
        title: "Corporate Trip 2",
        city: "London",
        country: "UK",
        organizationId: user.organization_id || 1,
        client_name: "Beta Ltd",
        project_type: "Software Development",
        budget: 15000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        collaborators: [],
        completed: false,
        trip_type: "business",
        isPublic: false,
        sharingEnabled: false,
        sharePermission: "view"
      });
      return user;
    });
  }
}

// Create and export storage instance
export const storage = new ExtendedDatabaseStorage();