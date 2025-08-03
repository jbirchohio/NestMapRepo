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
  superadminAuditLogs,
  adminAuditLog,
  activityLog,
  aiUsageLogs,
  activeSessions,
  billingEvents,
  featureFlags,
  organizationFeatureFlags,
  backgroundJobs,
  transformTripToFrontend, transformActivityToFrontend
} from "@shared/schema";

import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { logger } from './utils/logger';

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
      logger.error("Error fetching trip by share code", { shareCode, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    // Transform camelCase frontend data to snake_case database format
    const dbData: any = {
      title: insertTrip.title,
      start_date: insertTrip.start_date ? new Date(insertTrip.start_date) : undefined,
      end_date: insertTrip.end_date ? new Date(insertTrip.end_date) : undefined,
      user_id: insertTrip.user_id,
      organization_id: insertTrip.organization_id || null,
      is_public: insertTrip.isPublic || false,
      sharing_enabled: insertTrip.sharingEnabled || false,
      share_permission: insertTrip.sharePermission || 'read-only',
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

  async updateTrip(id: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    // Transform camelCase frontend data to snake_case database format  
    const dbData: any = {};
    if (tripData.title !== undefined) dbData.title = tripData.title;
    if (tripData.start_date !== undefined) dbData.start_date = tripData.start_date;
    if (tripData.end_date !== undefined) dbData.end_date = tripData.end_date;
    if (tripData.isPublic !== undefined) dbData.is_public = tripData.isPublic;
    if (tripData.budget !== undefined) dbData.budget = tripData.budget;
    
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
    try {
      const activityList = await db.select().from(activities).where(eq(activities.trip_id, tripId));
      
      // Handle empty results gracefully
      if (activityList.length === 0) {
        return [];
      }
      
      // Sort in memory
      const sorted = activityList.sort((a, b) => (a.order || 0) - (b.order || 0));
      return sorted;
    } catch (error) {
      logger.error(`Database error fetching activities for trip ${tripId}`, {
        tripId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  async getActivities(tripId: number): Promise<Activity[]> {
    return this.getActivitiesByTripId(tripId);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    // Transform camelCase frontend data to snake_case database format
    const dbData = {
      trip_id: insertActivity.tripId,
      title: insertActivity.title,
      date: insertActivity.date,
      time: insertActivity.time,
      location_name: insertActivity.locationName,
      order: insertActivity.order || 0,
      completed: insertActivity.completed || false,
      organization_id: insertActivity.organizationId || null
    };
    
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
      logger.error("Error in updateActivity", { activityId: id, error: error instanceof Error ? error.message : 'Unknown error' });
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
    const dbData = {
      trip_id: insertTodo.tripId,
      task: insertTodo.task,
      completed: insertTodo.completed || false,
      organization_id: insertTodo.organizationId || null
    };
    
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
    const dbData = {
      trip_id: insertNote.tripId,
      content: insertNote.content,
      organization_id: insertNote.organizationId || null
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
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    
    return organization || null;
  }

  async updateOrganization(id: number, data: any): Promise<any> {
    const [updated] = await db
      .update(organizations)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(organizations.id, id))
      .returning();
    
    return updated || null;
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

  // These methods are implemented in ExtendedDatabaseStorage
  async getTripTravelers(tripId: number): Promise<TripTraveler[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async addTripTraveler(traveler: InsertTripTraveler): Promise<TripTraveler> { throw new Error('Use ExtendedDatabaseStorage'); }
  async updateTripTraveler(travelerId: number, data: Partial<InsertTripTraveler>): Promise<TripTraveler | undefined> { throw new Error('Use ExtendedDatabaseStorage'); }
  async removeTripTraveler(travelerId: number): Promise<boolean> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createCorporateCard(card: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getCorporateCard(id: number): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getCorporateCardByStripeId(stripeCardId: string): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getCorporateCardsByOrganization(organizationId: number): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getCorporateCardsByUser(userId: number): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async updateCorporateCard(id: number, updates: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async deleteCorporateCard(id: number): Promise<boolean> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createCardTransaction(transaction: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async upsertCardTransaction(transaction: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async updateCardTransactionByStripeId(stripeTransactionId: string, updates: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getCardTransactions(cardId: number, limit: number, offset: number): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createExpense(expense: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async updateExpense(id: number, updates: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getExpenses(filters: any): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createExpenseApproval(approval: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getSpendingAnalytics(filters: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getSuperadminOrganizations(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getSuperadminUsers(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async deactivateUser(userId: number): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async disableOrganization(orgId: number): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async updateUserRole(userId: number, newRole: string): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getSuperadminActivity(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getActiveSessions(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async terminateSession(sessionId: string): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getTripLogs(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getAiUsage(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createImpersonationSession(superadminId: number, userId: number): Promise<string> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getBillingOverview(): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async setBillingOverride(orgId: number, planOverride: string, credits: number): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getInvoices(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getFeatureFlags(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async setOrganizationFeatureFlag(orgId: number, flagName: string, enabled: boolean): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getWhiteLabelData(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async setOrganizationTheme(orgId: number, theme: any): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createExportJob(orgId: number, superadminId: number): Promise<number> { throw new Error('Use ExtendedDatabaseStorage'); }
  async deleteUserData(userId: number): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async getBackgroundJobs(): Promise<any[]> { throw new Error('Use ExtendedDatabaseStorage'); }
  async retryBackgroundJob(jobId: number): Promise<void> { throw new Error('Use ExtendedDatabaseStorage'); }
  async testWebhook(url: string, payload: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
  async createSuperadminAuditLog(log: any): Promise<any> { throw new Error('Use ExtendedDatabaseStorage'); }
}



// Extend DatabaseStorage class
export class ExtendedDatabaseStorage extends DatabaseStorage {
  // Method to get trips by organization ID
  async getTripsByOrganizationId(organizationId: number): Promise<Trip[]> {
    try {
      const results = await this.db
        .select()
        .from(trips)
        .where(eq(trips.organization_id, organizationId));

      return results;
    } catch (error) {
      logger.error('Error fetching trips by organization ID', { organizationId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('Failed to fetch organization trips');
    }
  }

  private db = db;


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
    const results = await db
      .select()
      .from(corporateCards)
      .leftJoin(users, eq(corporateCards.user_id, users.id))
      .where(eq(corporateCards.organization_id, organizationId))
      .orderBy(desc(corporateCards.created_at));
    
    return results.map(row => ({
      ...row.corporate_cards,
      user: row.users ? {
        id: row.users.id,
        username: row.users.username,
        email: row.users.email
      } : null
    }));
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

  // Cardholder management - removed as cardholders table doesn't exist

  // Corporate card transaction management methods removed - duplicate implementations below

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
      .where(eq(cardTransactions.stripe_transaction_id, transaction.stripe_transaction_id));

    if (existing.length > 0) {
      const [result] = await db
        .update(cardTransactions)
        .set({ ...transaction, updated_at: new Date() })
        .where(eq(cardTransactions.stripe_transaction_id, transaction.stripe_transaction_id))
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
      .where(eq(cardTransactions.stripe_transaction_id, stripeTransactionId))
      .returning();
    return result;
  }

  async getCardTransactions(cardId: number, limit: number = 50, offset: number = 0) {
    return await db
      .select({
        id: cardTransactions.id,
        card_id: cardTransactions.card_id,
        amount: cardTransactions.amount,
        currency: cardTransactions.currency,
        merchant_name: cardTransactions.merchant_name,
        merchant_category: cardTransactions.merchant_category,
        merchant_mcc: cardTransactions.merchant_mcc,
        transaction_type: cardTransactions.transaction_type,
        status: cardTransactions.status,
        stripe_transaction_id: cardTransactions.stripe_transaction_id,
        authorization_code: cardTransactions.authorization_code,
        network_transaction_id: cardTransactions.network_transaction_id,
        settled_at: cardTransactions.settled_at,
        created_at: cardTransactions.created_at,
        updated_at: cardTransactions.updated_at,
        card: {
          card_number_masked: corporateCards.card_number_masked,
          cardholder_name: corporateCards.cardholder_name,
        }
      })
      .from(cardTransactions)
      .leftJoin(corporateCards, eq(cardTransactions.card_id, corporateCards.id))
      .where(eq(cardTransactions.card_id, cardId))
      .orderBy(desc(cardTransactions.created_at))
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

    const baseQuery = db
      .select()
      .from(expenses)
      .leftJoin(users, eq(expenses.user_id, users.id))
      .leftJoin(corporateCards, eq(expenses.card_id, corporateCards.id));
      
    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await query
      .orderBy(desc(expenses.created_at))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return results.map(row => ({
      ...row.expenses,
      user: row.users ? {
        id: row.users.id,
        username: row.users.username,
        email: row.users.email
      } : null,
      card: row.corporate_cards ? {
        id: row.corporate_cards.id,
        card_number_masked: row.corporate_cards.card_number_masked,
        cardholder_name: row.corporate_cards.cardholder_name
      } : null
    }));
  }

  // Expense Approval operations
  async createExpenseApproval(approval: any) {
    const [result] = await db.insert(expenseApprovals).values(approval).returning();
    return result;
  }

  // Analytics operations
  async getSpendingAnalytics(filters: any) {
    const { organization_id, start_date, end_date } = filters;
    
    // Build conditions for total spending
    const totalConditions = [eq(expenses.organization_id, organization_id)];
    if (start_date) {
      totalConditions.push(gte(expenses.transaction_date, start_date));
    }
    if (end_date) {
      totalConditions.push(lte(expenses.transaction_date, end_date));
    }

    // Get total spending
    const totalSpendingQuery = db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(and(...totalConditions));

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