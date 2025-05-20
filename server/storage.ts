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

// Create and export storage instance
export const storage = new MemStorage();
