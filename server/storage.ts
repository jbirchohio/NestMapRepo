import { 
  users, type User, type InsertUser,
  trips, type Trip, type InsertTrip,
  activities, type Activity, type InsertActivity,
  todos, type Todo, type InsertTodo,
  notes, type Note, type InsertNote
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByTripId(tripId: number): Promise<Activity[]>;
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
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private activities: Map<number, Activity>;
  private todos: Map<number, Todo>;
  private notes: Map<number, Note>;
  
  private userIdCounter: number;
  private tripIdCounter: number;
  private activityIdCounter: number;
  private todoIdCounter: number;
  private noteIdCounter: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.activities = new Map();
    this.todos = new Map();
    this.notes = new Map();
    
    this.userIdCounter = 1;
    this.tripIdCounter = 1;
    this.activityIdCounter = 1;
    this.todoIdCounter = 1;
    this.noteIdCounter = 1;
    
    // Add sample user for testing
    this.createUser({
      username: "testuser",
      password: "password",
      email: "test@example.com"
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.userId === userId
    );
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.tripIdCounter++;
    const trip: Trip = { ...insertTrip, id };
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
      .filter((activity) => activity.tripId === tripId)
      .sort((a, b) => a.order - b.order);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const activity: Activity = { ...insertActivity, id };
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
      (todo) => todo.tripId === tripId
    );
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    const id = this.todoIdCounter++;
    const todo: Todo = { ...insertTodo, id };
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
      (note) => note.tripId === tripId
    );
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const note: Note = { ...insertNote, id };
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
}

// Database storage implementation
import { db } from "./db";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async getTripsByUserId(userId: number): Promise<Trip[]> {
    const tripList = await db.select().from(trips).where(eq(trips.userId, userId));
    return tripList;
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(insertTrip)
      .returning();
    return trip;
  }

  async updateTrip(id: number, tripData: Partial<InsertTrip>): Promise<Trip | undefined> {
    try {
      console.log("Database updateTrip called with:", tripData);
      const [updatedTrip] = await db
        .update(trips)
        .set(tripData)
        .where(eq(trips.id, id))
        .returning();
      console.log("Database update result:", updatedTrip);
      return updatedTrip || undefined;
    } catch (error) {
      console.error("Database update error:", error);
      throw error;
    }
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
    const [activity] = await db
      .select({
        id: activities.id,
        tripId: activities.tripId,
        title: activities.title,
        date: activities.date,
        time: activities.time,
        locationName: activities.locationName,
        latitude: activities.latitude,
        longitude: activities.longitude,
        notes: activities.notes,
        tag: activities.tag,
        assignedTo: activities.assignedTo,
        order: activities.order,
        travelMode: activities.travelMode,
        completed: activities.completed,
      })
      .from(activities)
      .where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivitiesByTripId(tripId: number): Promise<Activity[]> {
    const activityList = await db
      .select({
        id: activities.id,
        tripId: activities.tripId,
        title: activities.title,
        date: activities.date,
        time: activities.time,
        locationName: activities.locationName,
        latitude: activities.latitude,
        longitude: activities.longitude,
        notes: activities.notes,
        tag: activities.tag,
        assignedTo: activities.assignedTo,
        order: activities.order,
        travelMode: activities.travelMode,
        completed: activities.completed,
      })
      .from(activities)
      .where(eq(activities.tripId, tripId))
      .orderBy(activities.order);
    
    // Debug log to see what's being retrieved from the database
    console.log("Activities with travel modes:", activityList.map(a => ({id: a.id, title: a.title, travelMode: a.travelMode})));
    
    return activityList;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    try {
      console.log("Creating activity with data:", insertActivity);
      
      // Ensure required fields are present and properly formatted
      const activityData = {
        tripId: insertActivity.tripId,
        title: insertActivity.title,
        date: insertActivity.date,
        time: insertActivity.time,
        locationName: insertActivity.locationName,
        latitude: insertActivity.latitude || null,
        longitude: insertActivity.longitude || null,
        notes: insertActivity.notes || null,
        tag: insertActivity.tag || null,
        assignedTo: insertActivity.assignedTo || null,
        order: insertActivity.order,
        travelMode: insertActivity.travelMode || "walking",
        completed: insertActivity.completed || false,
      };
      
      console.log("Formatted activity data:", activityData);
      
      const [activity] = await db
        .insert(activities)
        .values(activityData)
        .returning();
      
      console.log("Successfully created activity:", activity);
      return activity;
    } catch (error) {
      console.error("Database error creating activity:", error);
      throw error;
    }
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
    const todoList = await db.select().from(todos).where(eq(todos.tripId, tripId));
    return todoList;
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    const [todo] = await db
      .insert(todos)
      .values(insertTodo)
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
    const noteList = await db.select().from(notes).where(eq(notes.tripId, tripId));
    return noteList;
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values(insertNote)
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
}

// Create and export storage instance
export const storage = new DatabaseStorage();
