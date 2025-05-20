import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTripSchema, 
  insertActivitySchema, 
  insertTodoSchema, 
  insertNoteSchema,
  insertUserSchema
} from "@shared/schema";
import { z } from "zod";
import * as openai from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Users routes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create user" });
    }
  });

  // Trips routes
  app.get("/api/trips", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const trips = await storage.getTripsByUserId(userId);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch trips" });
    }
  });

  app.get("/api/trips/:id", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch trip" });
    }
  });

  app.post("/api/trips", async (req: Request, res: Response) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create trip" });
    }
  });

  app.put("/api/trips/:id", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      // Create a partial schema with the same date transformation
      const partialTripSchema = z.object({
        title: z.string().optional(),
        startDate: z.string().or(z.date()).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
        endDate: z.string().or(z.date()).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
        userId: z.number().optional(),
        collaborators: z.array(z.any()).optional(),
      });
      
      const tripData = partialTripSchema.parse(req.body);
      const updatedTrip = await storage.updateTrip(tripId, tripData);
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.json(updatedTrip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update trip" });
    }
  });

  app.delete("/api/trips/:id", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      const deleted = await storage.deleteTrip(tripId);
      if (!deleted) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Could not delete trip" });
    }
  });

  // Activities routes
  app.get("/api/trips/:id/activities", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch activities" });
    }
  });

  app.post("/api/activities", async (req: Request, res: Response) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create activity" });
    }
  });

  app.put("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      
      // Create a partial schema with the same date transformation
      const partialActivitySchema = z.object({
        tripId: z.number().optional(),
        title: z.string().optional(),
        date: z.string().or(z.date()).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
        time: z.string().optional(),
        locationName: z.string().optional(),
        latitude: z.string().nullable().optional(),
        longitude: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        tag: z.string().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
        order: z.number().optional(),
      });
      
      const activityData = partialActivitySchema.parse(req.body);
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update activity" });
    }
  });

  app.delete("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      
      const deleted = await storage.deleteActivity(activityId);
      if (!deleted) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Could not delete activity" });
    }
  });

  // Todos routes
  app.get("/api/trips/:id/todos", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      const todos = await storage.getTodosByTripId(tripId);
      res.json(todos);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch todos" });
    }
  });

  app.post("/api/todos", async (req: Request, res: Response) => {
    try {
      const todoData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(todoData);
      res.status(201).json(todo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create todo" });
    }
  });

  app.put("/api/todos/:id", async (req: Request, res: Response) => {
    try {
      const todoId = Number(req.params.id);
      if (isNaN(todoId)) {
        return res.status(400).json({ message: "Invalid todo ID" });
      }
      
      const todoData = insertTodoSchema.partial().parse(req.body);
      const updatedTodo = await storage.updateTodo(todoId, todoData);
      
      if (!updatedTodo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      res.json(updatedTodo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update todo" });
    }
  });

  app.delete("/api/todos/:id", async (req: Request, res: Response) => {
    try {
      const todoId = Number(req.params.id);
      if (isNaN(todoId)) {
        return res.status(400).json({ message: "Invalid todo ID" });
      }
      
      const deleted = await storage.deleteTodo(todoId);
      if (!deleted) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Could not delete todo" });
    }
  });

  // Notes routes
  app.get("/api/trips/:id/notes", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      
      const notes = await storage.getNotesByTripId(tripId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch notes" });
    }
  });

  app.post("/api/notes", async (req: Request, res: Response) => {
    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create note" });
    }
  });

  app.put("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const noteId = Number(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const noteData = insertNoteSchema.partial().parse(req.body);
      const updatedNote = await storage.updateNote(noteId, noteData);
      
      if (!updatedNote) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(updatedNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update note" });
    }
  });

  app.delete("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const noteId = Number(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const deleted = await storage.deleteNote(noteId);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Could not delete note" });
    }
  });

  // OpenAI routes
  app.post("/api/ai/summarize-day", async (req: Request, res: Response) => {
    try {
      const { activities } = req.body;
      if (!activities || !Array.isArray(activities)) {
        return res.status(400).json({ message: "Invalid activities data" });
      }
      
      const summary = await openai.summarizeDay(activities);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ message: "Could not generate summary" });
    }
  });

  app.post("/api/ai/suggest-food", async (req: Request, res: Response) => {
    try {
      const { location, foodType } = req.body;
      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }
      
      const suggestions = await openai.suggestNearbyFood(location, foodType);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Could not generate food suggestions" });
    }
  });

  app.post("/api/ai/detect-conflicts", async (req: Request, res: Response) => {
    try {
      const { activities } = req.body;
      if (!activities || !Array.isArray(activities)) {
        return res.status(400).json({ message: "Invalid activities data" });
      }
      
      const conflicts = await openai.detectTimeConflicts(activities);
      res.json(conflicts);
    } catch (error) {
      res.status(500).json({ message: "Could not detect conflicts" });
    }
  });

  app.post("/api/ai/themed-itinerary", async (req: Request, res: Response) => {
    try {
      const { location, theme, duration } = req.body;
      if (!location || !theme || !duration) {
        return res.status(400).json({ message: "Location, theme, and duration are required" });
      }
      
      const itinerary = await openai.generateThemedItinerary(location, theme, duration);
      res.json(itinerary);
    } catch (error) {
      res.status(500).json({ message: "Could not generate themed itinerary" });
    }
  });

  app.post("/api/ai/assistant", async (req: Request, res: Response) => {
    try {
      const { question, tripContext } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      const response = await openai.tripAssistant(question, tripContext || {});
      res.json({ answer: response });
    } catch (error) {
      res.status(500).json({ message: "Could not get assistant response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
