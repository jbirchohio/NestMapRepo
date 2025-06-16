import { 
  users, type User, type InsertUser,
  trips, type Trip, type InsertTrip,
  activities, type Activity, type InsertActivity,
  todos, type Todo, type InsertTodo,
  notes, type Note, type InsertNote,
  invitations, type Invitation, type InsertInvitation,
  tripTravelers, type TripTraveler, type InsertTripTraveler,
  organizations,
  corporateCards,
  expenses,
  cardTransactions,
  expenseApprovals,
  superadminAuditLogs
} from "@shared/schema";

import { 
  activeSessions, 
  aiUsageLogs, 
  billingEvents,
  superadminFeatureFlags as featureFlags, 
  organizationFeatureFlags,
  superadminBackgroundJobs as backgroundJobs 
} from "./db/superadminSchema";

import { eq, and, desc, sql, getTableColumns, gte, lte } from 'drizzle-orm';

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
  getTrip(id: number, organizationId: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number, organizationId?: number | null): Promise<Trip[]>;
  getTripsByOrganizationId(organizationId: number): Promise<Trip[]>;
  getUserTrips(userId: number, organizationId?: number | null): Promise<Trip[]>;
  getTripByShareCode(shareCode: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, organizationId: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number, organizationId: number): Promise<boolean>;

  // Activity operations
  getActivity(id: number, organizationId: number): Promise<Activity | undefined>;
  getActivitiesByTripId(tripId: number, organizationId: number): Promise<Activity[]>;
  getActivities(tripId: number, organizationId: number): Promise<Activity[]>; 
  createActivity(organizationId: number, activityData: InsertActivity): Promise<Activity | undefined>;
  updateActivity(organizationId: number, activityId: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(organizationId: number, activityId: number): Promise<boolean>;

  // Todo operations
  getTodo(id: number, organizationId: number): Promise<Todo | undefined>;
  getTodosByTripId(tripId: number, organizationId: number): Promise<Todo[]>;
  createTodo(organizationId: number, todoData: InsertTodo): Promise<Todo | undefined>;
  updateTodo(organizationId: number, todoId: number, todoData: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(organizationId: number, todoId: number): Promise<boolean>;

  // Note operations
  getNote(id: number, organizationId: number): Promise<Note | undefined>;
  getNotesByTripId(tripId: number, organizationId: number): Promise<Note[]>;
  createNote(organizationId: number, noteData: InsertNote): Promise<Note | undefined>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;

  // Team invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string, userId: number): Promise<Invitation | undefined>;

  // Trip travelers operations
  getTripTravelers(tripId: number): Promise<TripTraveler[]>;
  addTripTraveler(traveler: InsertTripTraveler): Promise<TripTraveler>;
  updateTripTraveler(travelerId: number, data: Partial<InsertTripTraveler>): Promise<TripTraveler | undefined>;
  removeTripTraveler(travelerId: number): Promise<boolean>;

  // Organization operations
  getOrganization(id: number): Promise<any>;
  updateOrganization(id: number, data: any): Promise<any>;
  getOrganizationMembers(id: number): Promise<any[]>;
  updateOrganizationMember(orgId: number, userId: number, data: any): Promise<any>;
  removeOrganizationMember(orgId: number, userId: number): Promise<boolean>;
  getAllTrips(): Promise<Trip[]>;

  // Corporate Card operations
  createCorporateCard(card: any): Promise<any>;
  getCorporateCard(id: number): Promise<any>;
  getCorporateCardByStripeId(stripeCardId: string): Promise<any>;
  getCorporateCardsByOrganization(organizationId: number): Promise<any[]>;
  getCorporateCardsByUser(userId: number): Promise<any[]>;
  updateCorporateCard(id: number, updates: any): Promise<any>;
  deleteCorporateCard(id: number): Promise<boolean>;

  // Card Transaction operations
  createCardTransaction(transaction: any): Promise<any>;
  upsertCardTransaction(transaction: any): Promise<any>;
  updateCardTransactionByStripeId(stripeTransactionId: string, updates: any): Promise<any>;
  getCardTransactions(cardId: number, limit: number, offset: number): Promise<any[]>;

  // Expense operations
  createExpense(expense: any): Promise<any>;
  updateExpense(id: number, updates: any): Promise<any>;
  getExpenses(filters: any): Promise<any[]>;

  // Expense Approval operations
  createExpenseApproval(approval: any): Promise<any>;

  // Analytics operations
  getSpendingAnalytics(filters: any): Promise<any>;

  // Superadmin operations
  getSuperadminOrganizations(): Promise<any[]>;
  getSuperadminUsers(): Promise<any[]>;
  deactivateUser(userId: number): Promise<void>;
  disableOrganization(orgId: number): Promise<void>;
  updateUserRole(userId: number, newRole: string): Promise<void>;
  getSuperadminActivity(): Promise<any[]>;
  getActiveSessions(): Promise<any[]>;
  terminateSession(sessionId: string): Promise<void>;
  getTripLogs(): Promise<any[]>;
  getAiUsage(): Promise<any[]>;
  createImpersonationSession(superadminId: number, userId: number): Promise<string>;
  getBillingOverview(): Promise<any>;
  setBillingOverride(orgId: number, planOverride: string, credits: number): Promise<void>;
  getInvoices(): Promise<any[]>;
  getFeatureFlags(): Promise<any[]>;
  setOrganizationFeatureFlag(orgId: number, flagName: string, enabled: boolean): Promise<void>;
  getWhiteLabelData(): Promise<any[]>;
  setOrganizationTheme(orgId: number, theme: any): Promise<void>;
  createExportJob(orgId: number, superadminId: number): Promise<number>;
  deleteUserData(userId: number): Promise<void>;
  getBackgroundJobs(): Promise<any[]>;
  retryBackgroundJob(jobId: number): Promise<void>;
  testWebhook(url: string, payload: any): Promise<any>;
  createSuperadminAuditLog(log: any): Promise<any>;
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
  async getTrip(id: number, organizationId: number): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (trip && trip.organization_id === organizationId) {
      return trip;
    }
    return undefined;
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
    
    // Create trip object with proper snake_case database field names
    const trip: Trip = { 
      id,
      title: insertTrip.title,
      start_date: insertTrip.start_date,
      end_date: insertTrip.end_date,
      user_id: insertTrip.user_id,
      organization_id: insertTrip.organization_id || null,
      collaborators: insertTrip.collaborators || [],
      is_public: insertTrip.isPublic || false,
      sharing_enabled: insertTrip.sharingEnabled || false,
      share_permission: insertTrip.sharePermission || "read-only",
      share_code: insertTrip.shareCode || `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date(),
      city: insertTrip.city || null,
      country: insertTrip.country || null,
      location: insertTrip.location || null,
      city_latitude: (insertTrip as any).city_latitude || null,
      city_longitude: (insertTrip as any).city_longitude || null,
      hotel: insertTrip.hotel || null,
      hotel_latitude: (insertTrip as any).hotel_latitude || null,
      hotel_longitude: (insertTrip as any).hotel_longitude || null,
      completed: insertTrip.completed || false,
      completed_at: (insertTrip as any).completed_at || null,
      trip_type: insertTrip.trip_type || "personal",
      client_name: (insertTrip as any).client_name || null,
      project_type: (insertTrip as any).project_type || null,
      budget: insertTrip.budget || null
    };
    this.trips.set(id, trip);
    return trip;
  }

  async updateTrip(id: number, organizationId: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    const existingTrip = this.trips.get(id);
    if (!existingTrip || existingTrip.organization_id !== organizationId) {
      return undefined;
    }

    const updatedTrip = { ...existingTrip, ...tripData, updated_at: new Date() };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }

  async deleteTrip(id: number, organizationId: number): Promise<boolean> {
    const existingTrip = this.trips.get(id);
    if (existingTrip && existingTrip.organization_id === organizationId) {
      return this.trips.delete(id);
    }
    return false;
  }

  // Activity operations
  async getActivity(id: number, organizationId: number): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity || typeof activity.trip_id !== 'number') {
      return undefined;
    }
    const trip = this.trips.get(activity.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      return undefined;
    }
    return activity;
  }

  async getActivitiesByTripId(tripId: number, organizationId: number): Promise<Activity[]> {
    const trip = this.trips.get(tripId);
    if (!trip || trip.organization_id !== organizationId) {
      return []; // Trip doesn't exist or doesn't belong to the organization
    }
    return Array.from(this.activities.values())
      .filter((activity) => activity.trip_id === tripId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getActivities(tripId: number, organizationId: number): Promise<Activity[]> {
    return this.getActivitiesByTripId(tripId, organizationId);
  }

  async createActivity(organizationId: number, activityData: InsertActivity): Promise<Activity | undefined> {
    const trip = this.trips.get(activityData.tripId);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to create activity for trip ${activityData.tripId} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    const id = this.activityIdCounter++;
    const activity: Activity = {
      id,
      title: activityData.title,
      date: activityData.date,
      time: activityData.time,
      order: activityData.order || 0,
      completed: activityData.completed ?? false,
      trip_id: activityData.tripId,
      location_name: activityData.locationName,
      organization_id: organizationId, // Enforce organizationId from parameter
      latitude: activityData.latitude || null,
      longitude: activityData.longitude || null,
      notes: activityData.notes || null,
      tag: activityData.tag || null,
      assigned_to: activityData.assignedTo || null,
      travel_mode: activityData.travelMode || null
    };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(organizationId: number, activityId: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(activityId);
    if (!activity || typeof activity.trip_id !== 'number') {
      return undefined; // Activity not found or trip_id missing
    }

    const trip = this.trips.get(activity.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to update activity ${activityId} for trip ${activity.trip_id} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    // Prevent changing trip_id or organization_id during an update
    const { tripId, organizationId: _, ...restOfActivityData } = activityData;
    if (tripId !== undefined && tripId !== activity.trip_id) {
        console.warn(`Attempt to change tripId during activity update for activity ${activityId} was blocked.`);
    }

    const updatedActivity = { ...activity, ...restOfActivityData };
    this.activities.set(activityId, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(organizationId: number, activityId: number): Promise<boolean> {
    const activity = this.activities.get(activityId);
    if (!activity || typeof activity.trip_id !== 'number') {
      return false; // Activity not found or trip_id missing
    }

    const trip = this.trips.get(activity.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to delete activity ${activityId} for trip ${activity.trip_id} not in organization ${organizationId}`);
      return false; // Trip doesn't exist or doesn't belong to the organization
    }

    return this.activities.delete(activityId);
  }

  // Todo operations
  async getTodo(id: number, organizationId: number): Promise<Todo | undefined> {
    const todo = this.todos.get(id);
    if (!todo || typeof todo.trip_id !== 'number') {
      return undefined;
    }
    const trip = this.trips.get(todo.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      return undefined;
    }
    return todo;
  }

  async getTodosByTripId(tripId: number, organizationId: number): Promise<Todo[]> {
    const trip = this.trips.get(tripId);
    if (!trip || trip.organization_id !== organizationId) {
      return []; // Trip doesn't exist or doesn't belong to the organization
    }
    return Array.from(this.todos.values()).filter(
      (todo) => todo.trip_id === tripId
    );
  }

  async createTodo(organizationId: number, todoData: InsertTodo): Promise<Todo | undefined> {
    const trip = this.trips.get(todoData.tripId);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to create todo for trip ${todoData.tripId} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    const id = this.todoIdCounter++;
    const todo: Todo = {
      id,
      trip_id: todoData.tripId,
      task: todoData.task,
      completed: todoData.completed ?? false,
      organization_id: organizationId, // Enforce organizationId from parameter
      due_date: todoData.dueDate || null,
      assigned_to: todoData.assignedTo || null
    };
    this.todos.set(id, todo);
    return todo;
  }

  async updateTodo(organizationId: number, todoId: number, todoData: Partial<InsertTodo>): Promise<Todo | undefined> {
    const todo = this.todos.get(todoId);
    if (!todo || typeof todo.trip_id !== 'number') {
      return undefined; // Todo not found or trip_id missing
    }

    const trip = this.trips.get(todo.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to update todo ${todoId} for trip ${todo.trip_id} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    // Prevent changing trip_id or organization_id during an update
    const { tripId, organizationId: _, ...restOfTodoData } = todoData;
    if (tripId !== undefined && tripId !== todo.trip_id) {
        console.warn(`Attempt to change tripId during todo update for todo ${todoId} was blocked.`);
    }

    const updatedTodo = { ...todo, ...restOfTodoData };
    this.todos.set(todoId, updatedTodo);
    return updatedTodo;
  }

  async deleteTodo(organizationId: number, todoId: number): Promise<boolean> {
    const todo = this.todos.get(todoId);
    if (!todo || typeof todo.trip_id !== 'number') {
      return false; // Todo not found or trip_id missing
    }

    const trip = this.trips.get(todo.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to delete todo ${todoId} for trip ${todo.trip_id} not in organization ${organizationId}`);
      return false; // Trip doesn't exist or doesn't belong to the organization
    }

    return this.todos.delete(todoId);
  }

  // Note operations
  async getNote(id: number, organizationId: number): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note || typeof note.trip_id !== 'number') {
      return undefined;
    }
    const trip = this.trips.get(note.trip_id);
    if (!trip || trip.organization_id !== organizationId) {
      return undefined;
    }
    return note;
  }

  async getNotesByTripId(tripId: number, organizationId: number): Promise<Note[]> {
    const trip = this.trips.get(tripId);
    if (!trip || trip.organization_id !== organizationId) {
      return []; // Trip doesn't exist or doesn't belong to the organization
    }
    return Array.from(this.notes.values()).filter(
      (note) => note.trip_id === tripId
    );
  }

  async createNote(organizationId: number, noteData: InsertNote): Promise<Note | undefined> {
    const trip = this.trips.get(noteData.tripId);
    if (!trip || trip.organization_id !== organizationId) {
      console.error(`Attempt to create note for trip ${noteData.tripId} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    const id = this.noteIdCounter++;
    const note: Note = {
      id,
      trip_id: noteData.tripId,
      content: noteData.content,
      organization_id: organizationId, // Enforce organizationId from parameter
      created_at: new Date(),
      updated_at: new Date()
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
      user.organization_id = invitation.organizationId;
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
  async getTrip(id: number, organizationId: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(
      and(
        eq(trips.id, id),
        eq(trips.organization_id, organizationId)
      )
    );
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
    const dbData = {
      title: insertTrip.title,
      start_date: insertTrip.start_date,
      end_date: insertTrip.end_date,
      user_id: insertTrip.user_id,
      organization_id: insertTrip.organization_id || null,
      is_public: insertTrip.isPublic || false,
      sharing_enabled: insertTrip.sharingEnabled || false,
      share_permission: insertTrip.sharePermission || "read-only",
      collaborators: insertTrip.collaborators || [],
      city: insertTrip.city,
      country: insertTrip.country,
      location: insertTrip.location,
      hotel: insertTrip.hotel,
      completed: insertTrip.completed || false,
      budget: insertTrip.budget
    };
    
    const [trip] = await db
      .insert(trips)
      .values(dbData)
      .returning();
    
    // Return the trip as-is since the database now uses snake_case
    return trip;
  }

  async updateTrip(id: number, organizationId: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    // Transform camelCase frontend data to snake_case database format  
    const dbData: any = {};
    if (tripData.title !== undefined) dbData.title = tripData.title;
    if (tripData.start_date !== undefined) dbData.start_date = tripData.start_date;
    if (tripData.end_date !== undefined) dbData.end_date = tripData.end_date;
    if (tripData.isPublic !== undefined) dbData.is_public = tripData.isPublic;
    if (tripData.budget !== undefined) dbData.budget = tripData.budget;
    // Ensure updated_at is set
    dbData.updated_at = new Date();

    const [updatedTrip] = await db
      .update(trips)
      .set(dbData)
      .where(and(eq(trips.id, id), eq(trips.organization_id, organizationId)))
      .returning();
    
    return updatedTrip || undefined;
  }

  async deleteTrip(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(trips)
      .where(and(eq(trips.id, id), eq(trips.organization_id, organizationId)))
      .returning({ id: trips.id });
    return result.length > 0;
  }

  async getActivity(id: number, organizationId: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select(getTableColumns(activities))
      .from(activities)
      .leftJoin(trips, eq(activities.trip_id, trips.id))
      .where(and(eq(activities.id, id), eq(trips.organization_id, organizationId)));
    return activity || undefined;
  }

  async getActivitiesByTripId(tripId: number, organizationId: number): Promise<Activity[]> {
    try {
      console.log(`🔍 Fetching activities for trip ID: ${tripId}, Organization ID: ${organizationId}`);
      const activityList = await db
        .select(getTableColumns(activities))
        .from(activities)
        .leftJoin(trips, eq(activities.trip_id, trips.id))
        .where(and(eq(activities.trip_id, tripId), eq(trips.organization_id, organizationId)));

      console.log(`✅ Query successful - Found ${activityList.length} activities for trip ${tripId} in organization ${organizationId}`);
      
      if (activityList.length === 0) {
        console.log(`📝 No activities found for trip ${tripId} in organization ${organizationId} - returning empty array`);
        return [];
      }
      
      const sorted = activityList.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log(`🔢 Sorted ${sorted.length} activities`);
      return sorted;
    } catch (error) {
      console.error(`❌ Database error fetching activities for trip ${tripId}, org ${organizationId}:`);
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.log(`🔄 Returning empty array due to error`);
      return [];
    }
  }

  async getActivities(tripId: number, organizationId: number): Promise<Activity[]> {
    return this.getActivitiesByTripId(tripId, organizationId);
  }

  async createActivity(organizationId: number, activityData: InsertActivity): Promise<Activity | undefined> {
    // Verify trip ownership by organizationId
    const [trip] = await db
      .select({ id: trips.id, orgId: trips.organization_id })
      .from(trips)
      .where(eq(trips.id, activityData.tripId));

    if (!trip || trip.orgId !== organizationId) {
      console.error(`Attempt to create activity for trip ${activityData.tripId} not in organization ${organizationId}`);
      return undefined;
    }

    // Transform camelCase frontend data to snake_case database format
    const dbInsertData = {
      trip_id: activityData.tripId,
      title: activityData.title,
      date: activityData.date,
      time: activityData.time,
      location_name: activityData.locationName,
      order: activityData.order || 0,
      completed: activityData.completed ?? false,
      organization_id: organizationId, // Enforce organizationId from parameter
      latitude: activityData.latitude || null,
      longitude: activityData.longitude || null,
      notes: activityData.notes || null,
      tag: activityData.tag || null,
      assigned_to: activityData.assignedTo || null,
      travel_mode: activityData.travelMode || null
    };
    
    const [activity] = await db
      .insert(activities)
      .values(dbInsertData)
      .returning();
    
    return activity;
  }

  async updateActivity(organizationId: number, activityId: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    try {
      // Special handling for completion toggle
      if (Object.keys(activityData).length === 1 && 'completed' in activityData) {
        console.log(`Direct DB update for activity completion: ${activityId}, value: ${activityData.completed}`);

        // Direct SQL query to update just the completion field
        const [updatedActivity] = await db
          .update(activities)
          .set({ completed: activityData.completed === true })
          .where(eq(activities.id, activityId))
          .returning();

        return updatedActivity;
      }

      // Normal update for other cases
      // Prevent changing trip_id or organization_id during an update
      const { tripId, organizationId: _, ...restOfActivityData } = activityData;
      if (tripId !== undefined) {
        console.warn(`Attempt to change tripId during activity update for activity ${activityId} was blocked.`);
      }

      const [activityToUpdate] = await db
        .select({ tripOrgId: trips.organization_id })
        .from(activities)
        .leftJoin(trips, eq(activities.trip_id, trips.id))
        .where(eq(activities.id, activityId));

      if (!activityToUpdate || activityToUpdate.tripOrgId !== organizationId) {
        console.error(`Attempt to update activity ${activityId} not found or not in organization ${organizationId}`);
        return undefined;
      }

      if (Object.keys(restOfActivityData).length === 0) {
        // If, after removing tripId and organizationId, there's nothing to update, fetch and return current activity.
        // This can happen if only tripId or organizationId was in activityData.
        return this.getActivity(activityId, organizationId);
      }

      const [updatedActivity] = await db
        .update(activities)
        .set(restOfActivityData)
        .where(eq(activities.id, activityId)) // The check above ensures this activity belongs to the org
        .returning();

      return updatedActivity || undefined;
    } catch (error) {
      console.error("Error in updateActivity:", error);
      throw error;
    }
  }

  async deleteActivity(organizationId: number, activityId: number): Promise<boolean> {
    // First, verify the activity belongs to the organization via its trip
    const [activityToDelete] = await db
      .select({ tripOrgId: trips.organization_id })
      .from(activities)
      .leftJoin(trips, eq(activities.trip_id, trips.id))
      .where(eq(activities.id, activityId));

    if (!activityToDelete || activityToDelete.tripOrgId !== organizationId) {
      console.error(`Attempt to delete activity ${activityId} not found or not in organization ${organizationId}`);
      return false;
    }

    // If verification passes, proceed with deletion
    const result = await db
      .delete(activities)
      .where(eq(activities.id, activityId));
    
    return result.rowCount > 0;
  }

  // Todo operations
  async getTodo(id: number, organizationId: number): Promise<Todo | undefined> {
    const [todo] = await db
      .select(getTableColumns(todos))
      .from(todos)
      .leftJoin(trips, eq(todos.trip_id, trips.id))
      .where(and(eq(todos.id, id), eq(trips.organization_id, organizationId)));
    return todo || undefined;
  }

  async getTodosByTripId(tripId: number, organizationId: number): Promise<Todo[]> {
    const todoList = await db
      .select(getTableColumns(todos))
      .from(todos)
      .leftJoin(trips, eq(todos.trip_id, trips.id))
      .where(and(eq(todos.trip_id, tripId), eq(trips.organization_id, organizationId)));
    return todoList;
  }

  async createTodo(organizationId: number, todoData: InsertTodo): Promise<Todo | undefined> {
    // Verify trip ownership by organizationId
    const [trip] = await db
      .select({ id: trips.id, orgId: trips.organization_id })
      .from(trips)
      .where(eq(trips.id, todoData.tripId));

    if (!trip || trip.orgId !== organizationId) {
      console.error(`Attempt to create todo for trip ${todoData.tripId} not in organization ${organizationId}`);
      return undefined; // Trip doesn't exist or doesn't belong to the organization
    }

    // Transform camelCase frontend data to snake_case database format
    const dbInsertData = {
      trip_id: todoData.tripId,
      task: todoData.task,
      completed: todoData.completed || false,
      organization_id: organizationId, // Enforce organizationId from parameter
      due_date: todoData.dueDate || null,
      assigned_to: todoData.assignedTo || null
    };
    
    const [todo] = await db
      .insert(todos)
      .values(dbInsertData)
      .returning();
    
    return todo;
  }

  async updateTodo(organizationId: number, todoId: number, todoData: Partial<InsertTodo>): Promise<Todo | undefined> {
    // Prevent changing trip_id or organization_id during an update
    const { tripId, organizationId: _, ...restOfTodoData } = todoData;
    if (tripId !== undefined) {
      console.warn(`Attempt to change tripId during todo update for todo ${todoId} was blocked.`);
    }

    // Verify ownership and get current todo data for the organization
    const [todoToUpdate] = await db
      .select({ id: todos.id, tripOrgId: trips.organization_id })
      .from(todos)
      .leftJoin(trips, eq(todos.trip_id, trips.id))
      .where(eq(todos.id, todoId));

    if (!todoToUpdate || todoToUpdate.tripOrgId !== organizationId) {
      console.error(`Attempt to update todo ${todoId} not found or not in organization ${organizationId}`);
      return undefined;
    }

    if (Object.keys(restOfTodoData).length === 0) {
      // If, after removing tripId and organizationId, there's nothing to update, fetch and return current todo.
      return this.getTodo(todoId, organizationId);
    }

    const [updatedTodo] = await db
      .update(todos)
      .set(restOfTodoData) // Update only with allowed fields
      .where(eq(todos.id, todoId)) // The check above ensures this todo belongs to the org
      .returning();
    return updatedTodo || undefined;
  }

  async deleteTodo(organizationId: number, todoId: number): Promise<boolean> {
    // First, verify the todo belongs to the organization via its trip
    const [todoToDelete] = await db
      .select({ tripOrgId: trips.organization_id })
      .from(todos)
      .leftJoin(trips, eq(todos.trip_id, trips.id))
      .where(eq(todos.id, todoId));

    if (!todoToDelete || todoToDelete.tripOrgId !== organizationId) {
      console.error(`Attempt to delete todo ${todoId} not found or not in organization ${organizationId}`);
      return false;
    }

    // If verification passes, proceed with deletion
    const result = await db
      .delete(todos)
      .where(eq(todos.id, todoId));
    
    return result.rowCount > 0;
  }

  // Note operations
  async getNote(id: number, organizationId: number): Promise<Note | undefined> {
    const [note] = await db
      .select(getTableColumns(notes))
      .from(notes)
      .leftJoin(trips, eq(notes.trip_id, trips.id))
      .where(and(eq(notes.id, id), eq(trips.organization_id, organizationId)));
    return note || undefined;
  }

  async getNotesByTripId(tripId: number, organizationId: number): Promise<Note[]> {
    const noteList = await db
      .select(getTableColumns(notes))
      .from(notes)
      .leftJoin(trips, eq(notes.trip_id, trips.id))
      .where(and(eq(notes.trip_id, tripId), eq(trips.organization_id, organizationId)));
    return noteList;
  }

  async createNote(organizationId: number, noteData: InsertNote): Promise<Note | undefined> {
    // Verify trip ownership by organizationId
    const [trip] = await db
      .select({ id: trips.id, orgId: trips.organization_id })
      .from(trips)
      .where(eq(trips.id, noteData.tripId));

    if (!trip || trip.orgId !== organizationId) {
      console.error(`Attempt to create note for trip ${noteData.tripId} not in organization ${organizationId}`);
      return undefined;
    }

    // Transform camelCase frontend data to snake_case database format
    const dbData = {
      trip_id: noteData.tripId,
      content: noteData.content,
      organization_id: organizationId // Enforce organizationId from parameter
    };
    
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
        organization_id: invitation.organizationId,
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
        user_id: user.id,
        title: "Corporate Trip 1",
        city: "New York",
        country: "USA",
        organization_id: user.organization_id || 1,
        client_name: "Acme Corp",
        project_type: "Consulting",
        budget: 10000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        collaborators: [],
        completed: false,
        trip_type: "business",
        isPublic: false,
        sharingEnabled: false,
        sharePermission: "view"
      });

      this.createTrip({
        user_id: user.id,
        title: "Corporate Trip 2",
        city: "London",
        country: "UK",
        organization_id: user.organization_id || 1,
        client_name: "Beta Ltd",
        project_type: "Software Development",
        budget: 15000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  // Trip travelers operations
  async getTripTravelers(tripId: number): Promise<TripTraveler[]> {
    const results = await db
      .select()
      .from(tripTravelers)
      .where(eq(tripTravelers.trip_id, tripId))
      .orderBy(tripTravelers.is_trip_organizer, tripTravelers.created_at);
    return results;
  }

  async addTripTraveler(traveler: InsertTripTraveler): Promise<TripTraveler> {
    const [newTraveler] = await db
      .insert(tripTravelers)
      .values(traveler)
      .returning();
    return newTraveler;
  }

  async updateTripTraveler(travelerId: number, data: Partial<InsertTripTraveler>): Promise<TripTraveler | undefined> {
    const [updatedTraveler] = await db
      .update(tripTravelers)
      .set({ ...data, updated_at: new Date() })
      .where(eq(tripTravelers.id, travelerId))
      .returning();
    return updatedTraveler || undefined;
  }

  async removeTripTraveler(travelerId: number): Promise<boolean> {
    const result = await db
      .delete(tripTravelers)
      .where(eq(tripTravelers.id, travelerId));
    return (result.rowCount || 0) > 0;
  }

  // Corporate Card operations
  async createCorporateCard(card: any) {
    const [result] = await db.insert(corporateCards).values(card).returning();
    return result;
  }

  async getCorporateCard(id: number) {
    const [result] = await db
      .select()
      .from(corporateCards)
      .where(eq(corporateCards.id, id));
    return result;
  }

  async getCorporateCardByStripeId(stripeCardId: string) {
    const [result] = await db
      .select()
      .from(corporateCards)
      .where(eq(corporateCards.stripe_card_id, stripeCardId));
    return result;
  }

  async getCorporateCardsByOrganization(organizationId: number) {
    return await db
      .select({
        ...corporateCards,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
        }
      })
      .from(corporateCards)
      .leftJoin(users, eq(corporateCards.user_id, users.id))
      .where(eq(corporateCards.organization_id, organizationId))
      .orderBy(desc(corporateCards.created_at));
  }

  async getCorporateCardsByUser(userId: number) {
    return await db
      .select()
      .from(corporateCards)
      .where(eq(corporateCards.user_id, userId))
      .orderBy(desc(corporateCards.created_at));
  }

  async updateCorporateCard(id: number, updates: any) {
    const [result] = await db
      .update(corporateCards)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(corporateCards.id, id))
      .returning();
    return result;
  }

  async deleteCorporateCard(id: number): Promise<boolean> {
    const result = await db
      .delete(corporateCards)
      .where(eq(corporateCards.id, id))
      .returning({ id: corporateCards.id });
    return result.length > 0;
  }

  // Cardholder management
  async createCardholder(data: any) {
    const [result] = await db
      .insert(cardholders)
      .values(data)
      .returning();
    return result;
  }

  async getCardholder(id: number) {
    const [result] = await db
      .select()
      .from(cardholders)
      .where(eq(cardholders.id, id));
    return result;
  }

  // Corporate card transaction management
  async createCardTransaction(data: any) {
    const [result] = await db
      .insert(cardTransactions)
      .values(data)
      .returning();
    return result;
  }

  async getCardTransactions(cardId: number) {
    return await db
      .select()
      .from(cardTransactions)
      .where(eq(cardTransactions.card_id, cardId))
      .orderBy(desc(cardTransactions.created_at));
  }

  async getOrganizationCorporateCards(organizationId: number) {
    return await db
      .select({
        id: corporateCards.id,
        stripe_card_id: corporateCards.stripe_card_id,
        organization_id: corporateCards.organization_id,
        user_id: corporateCards.user_id,
        cardholder_name: corporateCards.cardholder_name,
        card_number_masked: corporateCards.card_number_masked,
        card_type: corporateCards.card_type,
        status: corporateCards.status,
        spending_limit: corporateCards.spending_limit,
        available_balance: corporateCards.available_balance,
        currency: corporateCards.currency,
        created_at: corporateCards.created_at,
        updated_at: corporateCards.updated_at
      })
      .from(corporateCards)
      .where(eq(corporateCards.organization_id, organizationId))
      .orderBy(desc(corporateCards.created_at));
  }

  async getUserCorporateCards(userId: number) {
    return await db
      .select()
      .from(corporateCards)
      .where(eq(corporateCards.user_id, userId))
      .orderBy(desc(corporateCards.created_at));
  }

  // Card Transaction operations
  async createCardTransaction(transaction: any) {
    const [result] = await db.insert(cardTransactions).values(transaction).returning();
    return result;
  }

  async upsertCardTransaction(transaction: any) {
    const existing = await db
      .select()
      .from(cardTransactions)
      .where(eq(cardTransactions.transaction_id, transaction.transaction_id));

    if (existing.length > 0) {
      const [result] = await db
        .update(cardTransactions)
        .set({ ...transaction, updated_at: new Date() })
        .where(eq(cardTransactions.transaction_id, transaction.transaction_id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(cardTransactions).values(transaction).returning();
      return result;
    }
  }

  async updateCardTransactionByStripeId(stripeTransactionId: string, updates: any) {
    const [result] = await db
      .update(cardTransactions)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(cardTransactions.transaction_id, stripeTransactionId))
      .returning();
    return result;
  }

  async getCardTransactions(cardId: number, limit: number = 50, offset: number = 0) {
    return await db
      .select({
        ...cardTransactions,
        card: {
          card_number_masked: corporateCards.card_number_masked,
          cardholder_name: corporateCards.cardholder_name,
        }
      })
      .from(cardTransactions)
      .leftJoin(corporateCards, eq(cardTransactions.card_id, corporateCards.id))
      .where(eq(cardTransactions.card_id, cardId))
      .orderBy(desc(cardTransactions.processed_at))
      .limit(limit)
      .offset(offset);
  }

  // Expense operations
  async createExpense(expense: any) {
    const [result] = await db.insert(expenses).values(expense).returning();
    return result;
  }

  async updateExpense(id: number, updates: any) {
    const [result] = await db
      .update(expenses)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return result;
  }

  async getExpenses(filters: any) {
    let query = db
      .select({
        id: expenses.id,
        organization_id: expenses.organization_id,
        user_id: expenses.user_id,
        card_id: expenses.card_id,
        transaction_id: expenses.transaction_id,
        amount: expenses.amount,
        currency: expenses.currency,
        merchant_name: expenses.merchant_name,
        merchant_category: expenses.merchant_category,
        expense_category: expenses.expense_category,
        description: expenses.description,
        receipt_url: expenses.receipt_url,
        status: expenses.status,
        approval_status: expenses.approval_status,
        approved_by: expenses.approved_by,
        approved_at: expenses.approved_at,
        transaction_date: expenses.transaction_date,
        created_at: expenses.created_at,
        updated_at: expenses.updated_at,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
        card: {
          id: corporateCards.id,
          card_number_masked: corporateCards.card_number_masked,
          cardholder_name: corporateCards.cardholder_name,
        }
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.user_id, users.id))
      .leftJoin(corporateCards, eq(expenses.card_id, corporateCards.id));

    const conditions = [];
    
    if (filters.organization_id) {
      conditions.push(eq(expenses.organization_id, filters.organization_id));
    }
    
    if (filters.user_id) {
      conditions.push(eq(expenses.user_id, filters.user_id));
    }
    
    if (filters.status) {
      conditions.push(eq(expenses.status, filters.status));
    }
    
    if (filters.category) {
      conditions.push(eq(expenses.expense_category, filters.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query
      .orderBy(desc(expenses.created_at))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
  }

  // Expense Approval operations
  async createExpenseApproval(approval: any) {
    const [result] = await db.insert(expenseApprovals).values(approval).returning();
    return result;
  }

  // Analytics operations
  async getSpendingAnalytics(filters: any) {
    const { organization_id, start_date, end_date } = filters;
    
    // Get total spending
    const totalSpendingQuery = db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(eq(expenses.organization_id, organization_id));

    if (start_date) {
      totalSpendingQuery.where(gte(expenses.transaction_date, start_date));
    }
    if (end_date) {
      totalSpendingQuery.where(lte(expenses.transaction_date, end_date));
    }

    const [totalSpending] = await totalSpendingQuery;

    // Get spending by category
    const categorySpending = await db
      .select({
        category: expenses.expense_category,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(eq(expenses.organization_id, organization_id))
      .groupBy(expenses.expense_category)
      .orderBy(desc(sql`SUM(${expenses.amount})`));

    // Get spending by user
    const userSpending = await db
      .select({
        user_id: expenses.user_id,
        username: users.username,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.user_id, users.id))
      .where(eq(expenses.organization_id, organization_id))
      .groupBy(expenses.user_id, users.username)
      .orderBy(desc(sql`SUM(${expenses.amount})`));

    return {
      total_spending: totalSpending,
      category_breakdown: categorySpending,
      user_breakdown: userSpending,
    };
  }

  // Superadmin operations implementation
  async getSuperadminOrganizations() {
    const orgsWithCounts = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        plan: organizations.plan,
        subscription_status: organizations.subscription_status,
        employee_count: organizations.employee_count,
        created_at: organizations.created_at,
      })
      .from(organizations)
      .orderBy(desc(organizations.created_at));

    // Add user counts, trip counts, and last activity for each organization
    const result = [];
    for (const org of orgsWithCounts) {
      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.organization_id, org.id));

      const tripCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(trips)
        .where(eq(trips.organization_id, org.id));

      const lastActivityResult = await db
        .select({ lastActivity: sql<string>`max(created_at)` })
        .from(trips)
        .where(eq(trips.organization_id, org.id));

      result.push({
        ...org,
        userCount: userCount[0]?.count || 0,
        tripCount: tripCount[0]?.count || 0,
        lastActivity: lastActivityResult[0]?.lastActivity || null
      });
    }

    return result;
  }

  async getSuperadminUsers() {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        organization_id: users.organization_id,
        created_at: users.created_at,
        organization_name: organizations.name,
        tripCount: sql<number>`(SELECT COUNT(*) FROM ${trips} WHERE user_id = ${users.id})`,
        lastLogin: sql<string>`(SELECT MAX(last_activity) FROM ${activeSessions} WHERE user_id = ${users.id})`
      })
      .from(users)
      .leftJoin(organizations, eq(users.organization_id, organizations.id))
      .orderBy(desc(users.created_at));
  }

  async deactivateUser(userId: number) {
    await db
      .update(users)
      .set({ role: 'deactivated' })
      .where(eq(users.id, userId));
  }

  async disableOrganization(orgId: number) {
    await db
      .update(organizations)
      .set({ subscription_status: 'disabled' })
      .where(eq(organizations.id, orgId));
  }

  async updateUserRole(userId: number, newRole: string) {
    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId));
  }

  async getSuperadminActivity() {
    return await db
      .select({
        id: superadminAuditLogs.id,
        action: superadminAuditLogs.action,
        target_type: superadminAuditLogs.target_type,
        target_id: superadminAuditLogs.target_id,
        details: superadminAuditLogs.details,
        created_at: superadminAuditLogs.created_at,
        superadmin_username: users.username,
        ip_address: superadminAuditLogs.ip_address
      })
      .from(superadminAuditLogs)
      .leftJoin(users, eq(superadminAuditLogs.superadmin_user_id, users.id))
      .orderBy(desc(superadminAuditLogs.created_at))
      .limit(100);
  }

  async getActiveSessions() {
    return await db
      .select({
        id: activeSessions.id,
        user_id: activeSessions.user_id,
        username: users.username,
        organization_name: organizations.name,
        ip_address: activeSessions.ip_address,
        last_activity: activeSessions.last_activity,
        expires_at: activeSessions.expires_at,
        created_at: activeSessions.created_at
      })
      .from(activeSessions)
      .leftJoin(users, eq(activeSessions.user_id, users.id))
      .leftJoin(organizations, eq(activeSessions.organization_id, organizations.id))
      .where(sql`${activeSessions.expires_at} > NOW()`)
      .orderBy(desc(activeSessions.last_activity));
  }

  async terminateSession(sessionId: string) {
    await db
      .delete(activeSessions)
      .where(eq(activeSessions.id, parseInt(sessionId)));
  }

  async getTripLogs() {
    return await db
      .select({
        id: trips.id,
        title: trips.title,
        user_id: trips.user_id,
        username: users.username,
        organization_name: organizations.name,
        created_at: trips.created_at,
        budget: trips.budget,
        trip_type: trips.trip_type,
        completed: trips.completed
      })
      .from(trips)
      .leftJoin(users, eq(trips.user_id, users.id))
      .leftJoin(organizations, eq(trips.organization_id, organizations.id))
      .orderBy(desc(trips.created_at))
      .limit(200);
  }

  async getAiUsage() {
    return await db
      .select({
        id: aiUsageLogs.id,
        user_id: aiUsageLogs.user_id,
        username: users.username,
        organization_name: organizations.name,
        feature: aiUsageLogs.feature,
        tokens_used: aiUsageLogs.tokens_used,
        cost_cents: aiUsageLogs.cost_cents,
        model: aiUsageLogs.model,
        success: aiUsageLogs.success,
        created_at: aiUsageLogs.created_at
      })
      .from(aiUsageLogs)
      .leftJoin(users, eq(aiUsageLogs.user_id, users.id))
      .leftJoin(organizations, eq(aiUsageLogs.organization_id, organizations.id))
      .orderBy(desc(aiUsageLogs.created_at))
      .limit(500);
  }

  async createImpersonationSession(superadminId: number, userId: number): Promise<string> {
    const token = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // In a real implementation, you'd store this token securely
    return token;
  }

  async getBillingOverview() {
    return await db
      .select({
        organization_id: organizations.id,
        organization_name: organizations.name,
        plan: organizations.plan,
        subscription_status: organizations.subscription_status,
        current_period_end: organizations.current_period_end,
        monthly_revenue: sql<number>`CASE 
          WHEN ${organizations.plan} = 'enterprise' THEN 99900
          WHEN ${organizations.plan} = 'team' THEN 2900
          WHEN ${organizations.plan} = 'pro' THEN 900
          ELSE 0
        END`,
        total_spending: sql<number>`(
          SELECT COALESCE(SUM(amount), 0) 
          FROM ${expenses} 
          WHERE organization_id = ${organizations.id}
        )`
      })
      .from(organizations)
      .orderBy(desc(sql`CASE 
        WHEN ${organizations.plan} = 'enterprise' THEN 99900
        WHEN ${organizations.plan} = 'team' THEN 2900
        WHEN ${organizations.plan} = 'pro' THEN 900
        ELSE 0
      END`));
  }

  async setBillingOverride(orgId: number, planOverride: string, credits: number) {
    await db
      .update(organizations)
      .set({ plan: planOverride })
      .where(eq(organizations.id, orgId));
  }

  async getInvoices() {
    return await db
      .select({
        id: billingEvents.id,
        organization_id: billingEvents.organization_id,
        organization_name: organizations.name,
        event_type: billingEvents.event_type,
        amount_cents: billingEvents.amount_cents,
        currency: billingEvents.currency,
        created_at: billingEvents.created_at
      })
      .from(billingEvents)
      .leftJoin(organizations, eq(billingEvents.organization_id, organizations.id))
      .orderBy(desc(billingEvents.created_at))
      .limit(100);
  }

  async getFeatureFlags() {
    return await db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.flag_name);
  }

  async setOrganizationFeatureFlag(orgId: number, flagName: string, enabled: boolean) {
    await db
      .insert(organizationFeatureFlags)
      .values({
        organization_id: orgId,
        flag_name: flagName,
        enabled
      })
      .onConflictDoUpdate({
        target: [organizationFeatureFlags.organization_id, organizationFeatureFlags.flag_name],
        set: { enabled }
      });
  }

  async getWhiteLabelData() {
    return await db
      .select({
        id: organizations.id,
        name: organizations.name,
        white_label_enabled: organizations.white_label_enabled,
        white_label_plan: organizations.white_label_plan,
        primary_color: organizations.primary_color,
        secondary_color: organizations.secondary_color,
        logo_url: organizations.logo_url,
        support_email: organizations.support_email
      })
      .from(organizations)
      .where(eq(organizations.white_label_enabled, true))
      .orderBy(organizations.name);
  }

  async setOrganizationTheme(orgId: number, theme: any) {
    await db
      .update(organizations)
      .set({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        logo_url: theme.logo_url
      })
      .where(eq(organizations.id, orgId));
  }

  async createExportJob(orgId: number, superadminId: number): Promise<number> {
    const [job] = await db
      .insert(backgroundJobs)
      .values({
        job_type: 'organization_export',
        status: 'pending',
        data: { organization_id: orgId, requested_by: superadminId }
      })
      .returning({ id: backgroundJobs.id });
    return job.id;
  }

  async deleteUserData(userId: number) {
    // In a real implementation, this would handle cascading deletes carefully
    await db.delete(users).where(eq(users.id, userId));
  }

  async getBackgroundJobs() {
    return await db
      .select()
      .from(backgroundJobs)
      .orderBy(desc(backgroundJobs.created_at))
      .limit(100);
  }

  async retryBackgroundJob(jobId: number) {
    await db
      .update(backgroundJobs)
      .set({
        status: 'pending',
        attempts: sql`${backgroundJobs.attempts} + 1`,
        error_message: null
      })
      .where(eq(backgroundJobs.id, jobId));
  }

  async testWebhook(url: string, payload: any) {
    // In a real implementation, this would make an HTTP request
    return { success: true, status: 200, response: 'OK' };
  }

  async createSuperadminAuditLog(log: any) {
    const [result] = await db
      .insert(superadminAuditLogs)
      .values(log)
      .returning();
    return result;
  }
}

// Create and export storage instance
export const storage = new ExtendedDatabaseStorage();