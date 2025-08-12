import { db } from "./db-connection-optimized";
import {
  users,
  trips,
  activities,
  notes,
  todos,
  bookings,
  tripCollaborators,
  invitations,
  waitlist,
  templates,
  templatePurchases,
  creatorBalances,
  templateReviews,
  templateShares,
  creatorProfiles,
  viatorCommissions,
  templateCollections,
  groupExpenses,
  insertTripSchema,
  insertActivitySchema,
  insertNoteSchema,
  insertTodoSchema,
  insertBookingSchema,
  registerUserSchema,
  User,
  Trip,
  Activity,
  Note,
  Todo,
  Booking,
  Template,
  TemplatePurchase,
  CreatorBalance,
  TemplateReview,
  TemplateShare,
  CreatorProfile,
  ViatorCommission,
  TemplateCollection,
} from "../shared/schema";
import {
  eq,
  and,
  desc,
  asc,
  inArray,
  sql,
  or,
  gte,
  lte,
  ilike,
  SQL,
} from "drizzle-orm";
import { hashPassword } from "./auth";
import { nanoid } from "nanoid";
import { logger } from "./utils/logger";
import { QUERY_LIMITS, applyLimit } from "./config/queryLimits";

// Simple storage interface for consumer app
export interface IStorage {
  // User management
  createUser(userData: any): Promise<User>;
  getUser(id: number): Promise<User | undefined>; // Alias for getUserById
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Trip management
  createTrip(tripData: any): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>; // Alias for getTripById
  getTripById(id: number): Promise<Trip | undefined>;
  getTripsByUserId(
    userId: number,
    organizationId?: number | null,
  ): Promise<Trip[]>;
  getTripsByUserIdPaginated(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Trip[]>;
  getTripsCountByUserId(userId: number): Promise<number>;
  getTripsByOrganizationId(organizationId: number): Promise<Trip[]>;
  updateTrip(id: number, updates: any): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  getPublicTrips(): Promise<Trip[]>;
  getTripByShareCode(shareCode: string): Promise<Trip | undefined>;

  // Activity management
  createActivity(activityData: any): Promise<Activity>;
  getActivitiesByTripId(tripId: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  updateActivity(id: number, updates: any): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;

  // Notes & Todos
  createNote(noteData: any): Promise<Note>;
  getNotesByTripId(tripId: number): Promise<Note[]>;
  createTodo(todoData: any): Promise<Todo>;
  getTodosByTripId(tripId: number): Promise<Todo[]>;
  updateTodo(id: number, updates: any): Promise<Todo | undefined>;
  deleteTodo(id: number): Promise<boolean>;

  // Bookings
  createBooking(bookingData: any): Promise<Booking>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  updateBooking(id: number, updates: any): Promise<Booking | undefined>;

  // Collaboration
  addTripCollaborator(
    tripId: number,
    userId: number,
    role: string,
  ): Promise<any>;
  getTripCollaborators(tripId: number): Promise<any[]>;
  removeTripCollaborator(tripId: number, userId: number): Promise<boolean>;

  // Waitlist
  addToWaitlist(email: string, referralSource?: string): Promise<any>;

  // Template management
  createTemplate(templateData: any): Promise<Template>;
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplateBySlug(slug: string): Promise<Template | undefined>;
  getTemplatesByUserId(userId: number): Promise<Template[]>;
  getPublishedTemplates(): Promise<Template[]>;
  searchTemplates(params: {
    search?: string;
    tag?: string;
    minPrice?: number;
    maxPrice?: number;
    duration?: number;
    destination?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ templates: Template[]; total: number; page: number; totalPages: number }>;
  updateTemplate(id: number, updates: any): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  incrementTemplateViews(id: number): Promise<void>;

  // Template purchases
  createTemplatePurchase(purchaseData: any): Promise<TemplatePurchase>;
  getTemplatePurchases(templateId: number): Promise<TemplatePurchase[]>;
  getUserPurchases(userId: number): Promise<TemplatePurchase[]>;
  hasUserPurchasedTemplate(
    userId: number,
    templateId: number,
  ): Promise<boolean>;

  // Creator profiles
  getOrCreateCreatorProfile(userId: number): Promise<CreatorProfile>;
  updateCreatorProfile(
    userId: number,
    updates: any,
  ): Promise<CreatorProfile | undefined>;
  getCreatorProfile(userId: number): Promise<CreatorProfile | undefined>;

  // Creator balances
  getOrCreateCreatorBalance(userId: number): Promise<CreatorBalance>;
  updateCreatorBalance(
    userId: number,
    amount: number,
    type: "add" | "subtract",
  ): Promise<CreatorBalance>;
  getCreatorBalance(userId: number): Promise<CreatorBalance | undefined>;

  // Template reviews
  createTemplateReview(reviewData: any): Promise<TemplateReview>;
  getTemplateReviews(templateId: number): Promise<TemplateReview[]>;
  getUserReview(
    userId: number,
    templateId: number,
  ): Promise<TemplateReview | undefined>;
  updateTemplateRating(templateId: number): Promise<void>;

  // Template sharing
  trackTemplateShare(shareData: any): Promise<TemplateShare>;
  incrementShareClicks(shareCode: string): Promise<void>;
  trackShareConversion(shareCode: string): Promise<void>;
  getTemplateByShareCode(shareCode: string): Promise<Template | undefined>;

  // Budget management
  updateTripBudget(tripId: number, budgetData: any): Promise<Trip | undefined>;
  getTripBudgetSummary(tripId: number): Promise<any>;
  updateActivityCost(activityId: number, costData: any): Promise<Activity | undefined>;
  
  // Group expenses
  createGroupExpense(expenseData: any): Promise<any>;
  getGroupExpensesByTripId(tripId: number): Promise<any[]>;
  updateGroupExpense(id: number, updates: any): Promise<any | undefined>;
  deleteGroupExpense(id: number): Promise<boolean>;
  settleGroupExpense(id: number): Promise<any | undefined>;
  getTripExpenseSummary(tripId: number): Promise<any>;
}

// Consumer-focused database storage implementation
export class ConsumerDatabaseStorage implements IStorage {
  // User management
  async createUser(userData: any): Promise<User> {
    const validatedData = registerUserSchema.parse(userData);
    const hashedPassword = hashPassword(validatedData.password);

    const [newUser] = await db
      .insert(users)
      .values({
        auth_id: `local_${validatedData.username}_${Date.now()}`, // Generate auth_id for local auth
        username: validatedData.username,
        email: validatedData.email,
        password_hash: hashedPassword,
        display_name: validatedData.display_name,
        role: "user", // Always regular user for consumers
        role_type: "consumer",
        organization_id: null, // No organizations in consumer app
      })
      .returning();

    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Trip management
  async createTrip(tripData: any): Promise<Trip> {
    const insertTrip = insertTripSchema.parse(tripData);
    const shareCode = nanoid(8);

    const [newTrip] = await db
      .insert(trips)
      .values({
        title: insertTrip.title,
        start_date: insertTrip.start_date,
        end_date: insertTrip.end_date,
        user_id: insertTrip.user_id,
        organizationId: null, // Always null for consumers
        share_code: shareCode,
        sharing_enabled: insertTrip.sharingEnabled || false,
        share_permission: insertTrip.sharePermission || "read-only",
        is_public: insertTrip.isPublic || false,
        city: insertTrip.city,
        country: insertTrip.country,
        location: insertTrip.location,
        city_latitude: insertTrip.city_latitude,
        city_longitude: insertTrip.city_longitude,
        hotel: insertTrip.hotel,
        hotel_latitude: insertTrip.hotel_latitude,
        hotel_longitude: insertTrip.hotel_longitude,
        trip_type: "personal", // Always personal for consumers
        budget: insertTrip.budget,
        collaborators: [],
      })
      .returning();

    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    return this.getTripById(id);
  }

  async getTripById(id: number): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);
    return trip;
  }

  async getTripsByUserId(
    userId: number,
    organizationId?: number | null,
  ): Promise<Trip[]> {
    // Get trips where user is owner or collaborator (with limit)
    const ownTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.user_id, userId))
      .orderBy(desc(trips.start_date))
      .limit(QUERY_LIMITS.TRIPS.MAX);

    const collaboratingTrips = await db
      .select()
      .from(trips)
      .innerJoin(tripCollaborators, eq(trips.id, tripCollaborators.trip_id))
      .where(
        and(
          eq(tripCollaborators.user_id, userId),
          eq(tripCollaborators.status, "accepted"),
        ),
      )
      .orderBy(desc(trips.start_date))
      .limit(QUERY_LIMITS.TRIPS.MAX);

    const allTrips = [...ownTrips, ...collaboratingTrips.map((t) => t.trips)];
    return allTrips.sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    );
  }

  async getTripsByUserIdPaginated(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Trip[]> {
    const ownTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.user_id, userId))
      .orderBy(desc(trips.start_date))
      .limit(limit)
      .offset(offset);

    return ownTrips;
  }

  async getTripsCountByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(eq(trips.user_id, userId));

    return result[0]?.count || 0;
  }

  async getTripsByOrganizationId(organizationId: number): Promise<Trip[]> {
    // Consumer app doesn't use organizations, return empty array
    return [];
  }

  async updateTrip(id: number, updates: any): Promise<Trip | undefined> {
    const [updated] = await db
      .update(trips)
      .set(updates)
      .where(eq(trips.id, id))
      .returning();
    return updated;
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = await db
      .delete(trips)
      .where(eq(trips.id, id))
      .returning({ id: trips.id });
    return result.length > 0;
  }

  async getPublicTrips(): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.is_public, true))
      .orderBy(desc(trips.created_at))
      .limit(50);
  }

  async getTripByShareCode(shareCode: string): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(
        and(eq(trips.share_code, shareCode), eq(trips.sharing_enabled, true)),
      )
      .limit(1);
    return trip;
  }

  // Activity management
  async createActivity(activityData: any): Promise<Activity> {
    const insertActivity = insertActivitySchema.parse(activityData);

    const [newActivity] = await db
      .insert(activities)
      .values({
        trip_id: insertActivity.trip_id,
        organizationId: null, // Always null for consumers
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
      })
      .returning();

    return newActivity;
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);
    return activity;
  }

  async getActivitiesByTripId(tripId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.trip_id, tripId))
      .orderBy(activities.date, activities.order)
      .limit(QUERY_LIMITS.ACTIVITIES.MAX);
  }

  async updateActivity(
    id: number,
    updates: any,
  ): Promise<Activity | undefined> {
    const [updated] = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, id))
      .returning();
    return updated;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning({ id: activities.id });
    return result.length > 0;
  }

  // Notes & Todos
  async createNote(noteData: any): Promise<Note> {
    const insertNote = insertNoteSchema.parse(noteData);

    const [newNote] = await db
      .insert(notes)
      .values({
        trip_id: insertNote.trip_id,
        content: insertNote.content,
        created_by: insertNote.created_by,
      })
      .returning();

    return newNote;
  }

  async getNotesByTripId(tripId: number): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.trip_id, tripId))
      .orderBy(desc(notes.created_at));
  }

  async createTodo(todoData: any): Promise<Todo> {
    const insertTodo = insertTodoSchema.parse(todoData);

    const [newTodo] = await db
      .insert(todos)
      .values({
        trip_id: insertTodo.trip_id,
        content: insertTodo.content,
        is_completed: insertTodo.is_completed || false,
        assigned_to: insertTodo.assigned_to,
      })
      .returning();

    return newTodo;
  }

  async getTodosByTripId(tripId: number): Promise<Todo[]> {
    return await db
      .select()
      .from(todos)
      .where(eq(todos.trip_id, tripId))
      .orderBy(todos.created_at);
  }

  async updateTodo(id: number, updates: any): Promise<Todo | undefined> {
    const [updated] = await db
      .update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning();
    return updated;
  }

  async deleteTodo(id: number): Promise<boolean> {
    const result = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning({ id: todos.id });
    return result.length > 0;
  }

  // Bookings
  async createBooking(bookingData: any): Promise<Booking> {
    const insertBooking = insertBookingSchema.parse(bookingData);

    const [newBooking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return newBooking;
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.user_id, userId))
      .orderBy(desc(bookings.created_at));
  }

  async updateBooking(id: number, updates: any): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  // Collaboration
  async addTripCollaborator(
    tripId: number,
    userId: number,
    role: string,
  ): Promise<any> {
    const [collaborator] = await db
      .insert(tripCollaborators)
      .values({
        trip_id: tripId,
        user_id: userId,
        role: role,
        status: "pending",
      })
      .returning();

    return collaborator;
  }

  async getTripCollaborators(tripId: number): Promise<any[]> {
    return await db
      .select({
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

  async removeTripCollaborator(
    tripId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await db
      .delete(tripCollaborators)
      .where(
        and(
          eq(tripCollaborators.trip_id, tripId),
          eq(tripCollaborators.user_id, userId),
        ),
      )
      .returning({ id: tripCollaborators.id });
    return result.length > 0;
  }

  // Waitlist
  async addToWaitlist(email: string, referralSource?: string): Promise<any> {
    const [entry] = await db
      .insert(waitlist)
      .values({
        email,
        referral_source: referralSource,
      })
      .returning();

    return entry;
  }

  // Template management
  async createTemplate(templateData: any): Promise<Template> {
    const slug = await this.generateUniqueSlug(templateData.title);

    const [newTemplate] = await db
      .insert(templates)
      .values({
        ...templateData,
        slug,
        status: templateData.status || "draft",
        sales_count: 0,
        view_count: 0,
        review_count: 0,
      })
      .returning();

    // Update creator profile template count
    await this.incrementCreatorTemplateCount(templateData.user_id);

    return newTemplate;
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    return template;
  }

  async getTemplateBySlug(slug: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.slug, slug))
      .limit(1);
    return template;
  }

  async getTemplatesByUserId(userId: number): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.user_id, userId))
      .orderBy(desc(templates.created_at))
      .limit(QUERY_LIMITS.TEMPLATES.MAX);
  }

  async getPublishedTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.status, "published"))
      .orderBy(desc(templates.created_at))
      .limit(QUERY_LIMITS.TEMPLATES.MAX);
  }

  async searchTemplates(params: {
    search?: string;
    tag?: string;
    minPrice?: number;
    maxPrice?: number;
    duration?: number;
    destination?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ templates: Template[]; total: number; page: number; totalPages: number }> {
    // No sanitization needed - Drizzle ORM handles parameterization
    const { search, tag, destination, sort } = params;
    const { minPrice, maxPrice, duration } = params;

    // Pagination parameters with defaults
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20)); // Cap at 100 items
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(templates.status, "published")];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(templates.title, pattern),
          ilike(templates.description, pattern),
        )!,
      );
    }

    if (tag) {
      // Use parameterized query to prevent SQL injection
      conditions.push(sql`${templates.tags} @> ARRAY[${tag}]::text[]`);
    }

    if (destination) {
      // Use parameterized query to prevent SQL injection
      conditions.push(sql`${templates.destinations} @> ARRAY[${destination}]::text[]`);
    }

    if (minPrice !== undefined) {
      conditions.push(gte(templates.price, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(templates.price, maxPrice.toString()));
    }

    if (duration !== undefined) {
      conditions.push(eq(templates.duration, duration));
    }

    let orderBy: SQL = desc(templates.sales_count);
    switch (sort) {
      case "newest":
        orderBy = desc(templates.created_at);
        break;
      case "price-low":
        orderBy = asc(templates.price);
        break;
      case "price-high":
        orderBy = desc(templates.price);
        break;
      case "popular":
      default:
        orderBy = desc(templates.sales_count);
        break;
    }

    const where = and(...conditions);

    // Get total count for pagination
    const [countResult] = await db.select({ count: sql`count(*)::integer` })
      .from(templates)
      .where(where!);

    const total = Number(countResult?.count) || 0;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const templateResults = await db.select()
      .from(templates)
      .where(where!)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      templates: templateResults,
      total,
      page,
      totalPages
    };
  }

  async updateTemplate(
    id: number,
    updates: any,
  ): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning({ id: templates.id });
    return result.length > 0;
  }

  async incrementTemplateViews(id: number): Promise<void> {
    await db
      .update(templates)
      .set({ view_count: sql`${templates.view_count} + 1` })
      .where(eq(templates.id, id));
  }

  // Template purchases
  async createTemplatePurchase(purchaseData: any): Promise<TemplatePurchase> {
    const [purchase] = await db
      .insert(templatePurchases)
      .values(purchaseData)
      .returning();

    // Update template sales count
    await db
      .update(templates)
      .set({ sales_count: sql`${templates.sales_count} + 1` })
      .where(eq(templates.id, purchaseData.template_id));

    // Update creator balance
    await this.updateCreatorBalance(
      purchaseData.seller_id,
      purchaseData.seller_earnings,
      "add",
    );

    return purchase;
  }

  async getTemplatePurchases(templateId: number): Promise<TemplatePurchase[]> {
    return await db
      .select()
      .from(templatePurchases)
      .where(eq(templatePurchases.template_id, templateId))
      .orderBy(desc(templatePurchases.purchased_at));
  }

  async getUserPurchases(userId: number): Promise<TemplatePurchase[]> {
    return await db
      .select()
      .from(templatePurchases)
      .where(eq(templatePurchases.buyer_id, userId))
      .orderBy(desc(templatePurchases.purchased_at));
  }

  async hasUserPurchasedTemplate(
    userId: number,
    templateId: number,
  ): Promise<boolean> {
    const purchases = await db
      .select()
      .from(templatePurchases)
      .where(
        and(
          eq(templatePurchases.buyer_id, userId),
          eq(templatePurchases.template_id, templateId),
          eq(templatePurchases.status, "completed"),
          // Ensure not refunded or disputed
          sql`(refunded_at IS NULL AND disputed_at IS NULL)`
        ),
      )
      .limit(1);

    if (purchases.length > 0) {
      // Double-check status for security
      const purchase = purchases[0];
      if (purchase.status !== 'completed' || purchase.refunded_at || purchase.disputed_at) {
        logger.warn(`Access denied: Purchase ${purchase.id} is ${purchase.status} or has been refunded/disputed`);
        return false;
      }
    }

    return purchases.length > 0;
  }

  // Creator profiles
  async getOrCreateCreatorProfile(userId: number): Promise<CreatorProfile> {
    let [profile] = await db
      .select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      [profile] = await db
        .insert(creatorProfiles)
        .values({
          user_id: userId,
          bio: "",
          specialties: [],
          verified: false,
          featured: false,
          follower_count: 0,
          total_templates: 0,
          total_sales: 0,
        })
        .returning();
    }

    return profile;
  }

  async updateCreatorProfile(
    userId: number,
    updates: any,
  ): Promise<CreatorProfile | undefined> {
    const [updated] = await db
      .update(creatorProfiles)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(creatorProfiles.user_id, userId))
      .returning();
    return updated;
  }

  async getCreatorProfile(userId: number): Promise<CreatorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.user_id, userId))
      .limit(1);
    return profile;
  }

  // Creator balances
  async getOrCreateCreatorBalance(userId: number): Promise<CreatorBalance> {
    let [balance] = await db
      .select()
      .from(creatorBalances)
      .where(eq(creatorBalances.user_id, userId))
      .limit(1);

    if (!balance) {
      [balance] = await db
        .insert(creatorBalances)
        .values({
          user_id: userId,
          available_balance: "0",
          pending_balance: "0",
          lifetime_earnings: "0",
          lifetime_payouts: "0",
          total_sales: 0,
        })
        .returning();
    }

    return balance;
  }

  async updateCreatorBalance(
    userId: number,
    amount: number,
    type: "add" | "subtract",
  ): Promise<CreatorBalance> {
    const operator = type === "add" ? "+" : "-";

    const [updated] = await db
      .update(creatorBalances)
      .set({
        available_balance: sql`${creatorBalances.available_balance} ${sql.raw(operator)} ${amount}`,
        lifetime_earnings:
          type === "add"
            ? sql`${creatorBalances.lifetime_earnings} + ${amount}`
            : creatorBalances.lifetime_earnings,
        total_sales:
          type === "add"
            ? sql`${creatorBalances.total_sales} + 1`
            : creatorBalances.total_sales,
        updated_at: new Date(),
      })
      .where(eq(creatorBalances.user_id, userId))
      .returning();

    if (!updated) {
      // Create balance if it doesn't exist
      await this.getOrCreateCreatorBalance(userId);
      return await this.updateCreatorBalance(userId, amount, type);
    }

    return updated;
  }

  async getCreatorBalance(userId: number): Promise<CreatorBalance | undefined> {
    const [balance] = await db
      .select()
      .from(creatorBalances)
      .where(eq(creatorBalances.user_id, userId))
      .limit(1);
    return balance;
  }

  // Template reviews
  async createTemplateReview(reviewData: any): Promise<TemplateReview> {
    const [review] = await db
      .insert(templateReviews)
      .values(reviewData)
      .returning();

    // Update template rating
    await this.updateTemplateRating(reviewData.template_id);

    return review;
  }

  async getTemplateReviews(templateId: number): Promise<TemplateReview[]> {
    return await db
      .select()
      .from(templateReviews)
      .where(eq(templateReviews.template_id, templateId))
      .orderBy(desc(templateReviews.created_at));
  }

  async getUserReview(
    userId: number,
    templateId: number,
  ): Promise<TemplateReview | undefined> {
    const [review] = await db
      .select()
      .from(templateReviews)
      .where(
        and(
          eq(templateReviews.user_id, userId),
          eq(templateReviews.template_id, templateId),
        ),
      )
      .limit(1);
    return review;
  }

  async updateTemplateRating(templateId: number): Promise<void> {
    const reviews = await this.getTemplateReviews(templateId);
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = count > 0 ? (sum / count).toFixed(2) : null;

    await db
      .update(templates)
      .set({
        rating: average,
        review_count: count,
      })
      .where(eq(templates.id, templateId));
  }

  // Template sharing
  async trackTemplateShare(shareData: any): Promise<TemplateShare> {
    const shareCode = nanoid(10);
    const [share] = await db
      .insert(templateShares)
      .values({
        ...shareData,
        share_code: shareCode,
        clicks: 0,
        conversions: 0,
        revenue_generated: "0",
      })
      .returning();

    return share;
  }

  async incrementShareClicks(shareCode: string): Promise<void> {
    await db
      .update(templateShares)
      .set({ clicks: sql`${templateShares.clicks} + 1` })
      .where(eq(templateShares.share_code, shareCode));
  }

  async trackShareConversion(shareCode: string): Promise<void> {
    await db
      .update(templateShares)
      .set({ conversions: sql`${templateShares.conversions} + 1` })
      .where(eq(templateShares.share_code, shareCode));
  }

  async getTemplateByShareCode(
    shareCode: string,
  ): Promise<Template | undefined> {
    // First try to get the share record
    const [share] = await db
      .select()
      .from(templateShares)
      .where(eq(templateShares.share_code, shareCode))
      .limit(1);

    if (!share) {
      // No share record found - this might be a direct link
      // Don't track clicks for non-existent shares
      return undefined;
    }

    // Increment click count for valid shares
    await this.incrementShareClicks(shareCode);

    // Get the template
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, share.template_id))
      .limit(1);

    return template;
  }

  // Helper methods
  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (await this.getTemplateBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async incrementCreatorTemplateCount(userId: number): Promise<void> {
    const profile = await this.getOrCreateCreatorProfile(userId);
    await db
      .update(creatorProfiles)
      .set({ total_templates: sql`${creatorProfiles.total_templates} + 1` })
      .where(eq(creatorProfiles.user_id, userId));
  }

  // Budget management methods
  async updateTripBudget(tripId: number, budgetData: any): Promise<Trip | undefined> {
    const [updated] = await db
      .update(trips)
      .set({
        budget: budgetData.budget,
        currency: budgetData.currency || "USD",
        budget_categories: budgetData.budget_categories,
        budget_alert_threshold: budgetData.budget_alert_threshold || 80,
        updated_at: new Date(),
      })
      .where(eq(trips.id, tripId))
      .returning();
    return updated;
  }

  async getTripBudgetSummary(tripId: number): Promise<any> {
    // Get trip with budget info
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);
    
    if (!trip) return null;

    // Get all activities with costs
    const activityList = await db
      .select()
      .from(activities)
      .where(eq(activities.trip_id, tripId));

    // Calculate spending by category
    const spendingByCategory: Record<string, number> = {};
    let totalSpent = 0;

    for (const activity of activityList) {
      if (activity.is_paid) {
        const cost = Number(activity.actual_cost || activity.price || 0);
        const perPersonCost = cost / (activity.split_between || 1);
        totalSpent += perPersonCost;
        
        const category = activity.cost_category || 'uncategorized';
        spendingByCategory[category] = (spendingByCategory[category] || 0) + perPersonCost;
      }
    }

    // Get group expenses
    const groupExpensesList = await db
      .select()
      .from(groupExpenses)
      .where(eq(groupExpenses.trip_id, tripId));

    return {
      tripId,
      budget: Number(trip.budget || 0),
      currency: trip.currency || "USD",
      totalSpent,
      remaining: Number(trip.budget || 0) - totalSpent,
      percentUsed: trip.budget ? (totalSpent / Number(trip.budget)) * 100 : 0,
      spendingByCategory,
      budgetCategories: trip.budget_categories || {},
      alertThreshold: trip.budget_alert_threshold || 80,
      groupExpensesCount: groupExpensesList.length,
      startDate: trip.start_date,
      endDate: trip.end_date,
    };
  }

  async updateActivityCost(activityId: number, costData: any): Promise<Activity | undefined> {
    const [updated] = await db
      .update(activities)
      .set({
        price: costData.estimated_cost,
        actual_cost: costData.actual_cost,
        cost_category: costData.category,
        split_between: costData.split_between || 1,
        is_paid: costData.is_paid || false,
        paid_by: costData.paid_by,
        currency: costData.currency || "USD",
        updated_at: new Date(),
      })
      .where(eq(activities.id, activityId))
      .returning();
    return updated;
  }

  // Group expense methods
  async createGroupExpense(expenseData: any): Promise<any> {
    const [expense] = await db
      .insert(groupExpenses)
      .values({
        trip_id: expenseData.trip_id,
        activity_id: expenseData.activity_id,
        description: expenseData.description,
        total_amount: expenseData.total_amount,
        currency: expenseData.currency || "USD",
        paid_by: expenseData.paid_by,
        split_type: expenseData.split_type || "equal",
        split_details: expenseData.split_details,
        category: expenseData.category,
        receipt_url: expenseData.receipt_url,
        notes: expenseData.notes,
      })
      .returning();
    return expense;
  }

  async getGroupExpensesByTripId(tripId: number): Promise<any[]> {
    const expenses = await db
      .select({
        expense: groupExpenses,
        paidByUser: users,
      })
      .from(groupExpenses)
      .leftJoin(users, eq(groupExpenses.paid_by, users.id))
      .where(eq(groupExpenses.trip_id, tripId))
      .orderBy(desc(groupExpenses.created_at));
    
    return expenses.map(e => ({
      ...e.expense,
      paid_by_user: e.paidByUser ? {
        id: e.paidByUser.id,
        username: e.paidByUser.username,
        display_name: e.paidByUser.display_name,
      } : null,
    }));
  }

  async updateGroupExpense(id: number, updates: any): Promise<any | undefined> {
    const [updated] = await db
      .update(groupExpenses)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(groupExpenses.id, id))
      .returning();
    return updated;
  }

  async deleteGroupExpense(id: number): Promise<boolean> {
    const result = await db
      .delete(groupExpenses)
      .where(eq(groupExpenses.id, id));
    return result.rowCount > 0;
  }

  async settleGroupExpense(id: number): Promise<any | undefined> {
    const [updated] = await db
      .update(groupExpenses)
      .set({
        is_settled: true,
        settled_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(groupExpenses.id, id))
      .returning();
    return updated;
  }

  async getTripExpenseSummary(tripId: number): Promise<any> {
    const expenses = await this.getGroupExpensesByTripId(tripId);
    
    // Calculate who owes whom
    const balances: Record<number, number> = {};
    const transactions: Array<{ from: number; to: number; amount: number }> = [];

    for (const expense of expenses) {
      if (!expense.is_settled) {
        // Add what the payer is owed
        balances[expense.paid_by] = (balances[expense.paid_by] || 0) + Number(expense.total_amount);
        
        // Subtract what each person owes
        for (const split of expense.split_details) {
          balances[split.user_id] = (balances[split.user_id] || 0) - Number(split.amount);
        }
      }
    }

    // Calculate simplified transactions
    const creditors = Object.entries(balances)
      .filter(([_, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
    
    const debtors = Object.entries(balances)
      .filter(([_, amount]) => amount < 0)
      .sort((a, b) => a[1] - b[1]);

    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditorId = Number(creditors[i][0]);
      const debtorId = Number(debtors[j][0]);
      const creditAmount = creditors[i][1];
      const debtAmount = Math.abs(debtors[j][1]);
      
      const settleAmount = Math.min(creditAmount, debtAmount);
      
      if (settleAmount > 0.01) { // Ignore tiny amounts
        transactions.push({
          from: debtorId,
          to: creditorId,
          amount: settleAmount,
        });
      }
      
      creditors[i][1] -= settleAmount;
      debtors[j][1] += settleAmount;
      
      if (creditors[i][1] < 0.01) i++;
      if (Math.abs(debtors[j][1]) < 0.01) j++;
    }

    return {
      tripId,
      totalExpenses: expenses.length,
      unsettledExpenses: expenses.filter(e => !e.is_settled).length,
      totalAmount: expenses.reduce((sum, e) => sum + Number(e.total_amount), 0),
      balances,
      suggestedTransactions: transactions,
    };
  }
}

// Export a single storage instance
export const storage = new ConsumerDatabaseStorage();
