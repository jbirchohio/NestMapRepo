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
    // Get trips where user is owner or collaborator
    const ownTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.user_id, userId))
      .orderBy(desc(trips.start_date));

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
      .orderBy(desc(trips.start_date));

    const allTrips = [...ownTrips, ...collaboratingTrips.map((t) => t.trips)];
    return allTrips.sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    );
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
      .orderBy(activities.date, activities.order);
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
      .orderBy(desc(templates.created_at));
  }

  async getPublishedTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.status, "published"))
      .orderBy(desc(templates.created_at));
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
    console.log(`Checking if user ${userId} purchased template ${templateId}`);
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

    console.log(
      `Purchase check - User: ${userId}, Template: ${templateId}, Found: ${purchases.length > 0}`,
    );
    if (purchases.length > 0) {
      console.log("Found existing purchase:", purchases[0]);
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
}

// Export a single storage instance
export const storage = new ConsumerDatabaseStorage();
