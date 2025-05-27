import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTripSchema, 
  insertActivitySchema, 
  insertTodoSchema, 
  insertNoteSchema,
  insertUserSchema,
  activities,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as openai from "./openai";
import * as aiLocations from "./aiLocations";

export async function registerRoutes(app: Express): Promise<Server> {
  // Users routes for Supabase integration
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists by auth_id
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.auth_id, userData.auth_id))
        .limit(1);
        
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Could not create user" });
    }
  });
  
  // Get user by auth_id - used with Supabase
  app.get("/api/users/auth/:authId", async (req: Request, res: Response) => {
    try {
      const authId = req.params.authId;
      
      if (!authId) {
        return res.status(400).json({ message: "Auth ID is required" });
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.auth_id, authId));
        
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error("Error getting user by auth ID:", error);
      res.status(500).json({ message: "Could not retrieve user" });
    }
  });

  // Trips routes
  app.get("/api/trips", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log("Attempting to fetch trips for user ID:", userId);
      const trips = await storage.getTripsByUserId(userId);
      console.log("Trips fetched successfully:", trips.length);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Could not fetch trips", error: error instanceof Error ? error.message : "Unknown error" });
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
      // Log the incoming data to help with debugging
      console.log("Creating trip with data:", req.body);
      
      const tripData = insertTripSchema.parse(req.body);
      
      // Ensure the location fields are properly included
      if (req.body.city) tripData.city = req.body.city;
      if (req.body.country) tripData.country = req.body.country;
      if (req.body.location) tripData.location = req.body.location;
      
      console.log("Processed trip data:", tripData);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      console.error("Error creating trip:", error);
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
        // Sharing and collaboration settings
        isPublic: z.boolean().optional(),
        shareCode: z.string().nullable().optional(),
        sharingEnabled: z.boolean().optional(),
        sharePermission: z.enum(["read-only", "edit"]).optional(),
        // Location information
        city: z.string().optional(),
        country: z.string().optional(),
        location: z.string().optional(),
        cityLatitude: z.string().optional(),
        cityLongitude: z.string().optional(),
        hotel: z.string().optional(),
        hotelLatitude: z.string().optional(),
        hotelLongitude: z.string().optional(),
      });
      
      console.log("Raw request body:", req.body);
      const tripData = partialTripSchema.parse(req.body);
      console.log("Parsed trip data:", tripData);
      // Convert null values to undefined for storage compatibility
      const cleanedTripData = Object.fromEntries(
        Object.entries(tripData).map(([key, value]) => [key, value === null ? undefined : value])
      );
      const updatedTrip = await storage.updateTrip(tripId, cleanedTripData);
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.json(updatedTrip);
    } catch (error) {
      console.error("Error updating trip:", error);
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
      
      // Check if this is guest mode (negative tripId indicates guest trip)
      if (tripId < 0) {
        console.log("Guest mode activities fetch detected for tripId:", tripId);
        // For guest mode, return empty array since activities are stored in localStorage
        return res.json([]);
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch activities" });
    }
  });

  app.post("/api/activities", async (req: Request, res: Response) => {
    try {
      console.log("Creating activity with request body:", req.body);
      const activityData = insertActivitySchema.parse(req.body);
      console.log("Parsed activity data:", activityData);
      
      // Check if this is guest mode (negative tripId indicates guest trip)
      if (activityData.tripId < 0) {
        console.log("Guest mode activity creation detected");
        // For guest mode, return the activity data with a generated ID
        const guestActivity = {
          ...activityData,
          id: Date.now(), // Use timestamp as unique ID for guest activities
          date: activityData.date.toISOString(),
        };
        console.log("Created guest activity:", guestActivity);
        return res.status(201).json(guestActivity);
      }
      
      // For authenticated users, use database storage
      const activity = await storage.createActivity(activityData);
      console.log("Created database activity successfully:", activity);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Full error creating activity:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create activity" });
    }
  });

  // Dedicated endpoint for toggling activity completion
  app.put("/api/activities/:id/toggle-complete", async (req: Request, res: Response) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      
      // Extract completion value from request body
      const { completed } = req.body;
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: "Missing or invalid 'completed' value" });
      }
      
      console.log(`Toggling completion for activity ID ${activityId} to: ${completed}`);
      
      // Direct SQL query approach to update completion status
      const [updatedActivity] = await db
        .update(activities)
        .set({ completed })
        .where(eq(activities.id, activityId))
        .returning();
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      console.log("Successfully updated completion status:", updatedActivity);
      return res.json(updatedActivity);
    } catch (error) {
      console.error("Error toggling activity completion:", error);
      return res.status(500).json({ message: "Failed to toggle completion status" });
    }
  });
  
  // Regular activity update endpoint
  app.put("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      
      // Log the raw request body for debugging
      console.log(`Received activity update request for ID ${activityId}:`, req.body);
      
      // Get the existing activity first
      const existingActivity = await storage.getActivity(activityId);
      if (!existingActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      console.log(`Existing activity data:`, existingActivity);
      
      // Handle completed status updates through the dedicated endpoint
      if (Object.keys(req.body).length === 1 && typeof req.body.completed === 'boolean') {
        // Redirect to the dedicated endpoint
        return res.status(400).json({ 
          message: "Use the dedicated endpoint for toggling completion status",
          endpoint: `/api/activities/${activityId}/toggle-complete`
        });
      }
      
      // For other updates, proceed with schema validation
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
        travelMode: z.string().nullable().optional(), 
        completed: z.boolean().optional(),
      });
      
      // Parse and validate the rest of the data
      const activityData = partialActivitySchema.parse(req.body);
      console.log(`Parsed activity data:`, activityData);
      
      // No need for special handling since our schema transform will handle null to undefined conversion
      
      // Update the activity with all fields
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      res.json(updatedActivity);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      console.error("Error updating activity:", error);
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
      
      // Check if the response includes activities (from a parsed itinerary)
      if (typeof response === 'object' && response.answer && response.activities) {
        // This is a parsed itinerary with activities to add
        console.log("Parsed itinerary activities:", response.activities.length);
        
        // For each activity, try to get coordinates using our location search
        for (let i = 0; i < response.activities.length; i++) {
          const activity = response.activities[i];
          
          if (!activity.locationName) continue;
          
          try {
            // Search for the location to get coordinates
            console.log(`Finding location: ${activity.locationName} in ${tripContext.trip?.city || 'New York City'}`);
            const locationResult = await aiLocations.findLocation(
              activity.locationName, 
              tripContext.trip?.city || 'New York City'
            );
            
            // If we found coordinates, add them to the activity
            if (locationResult.locations && locationResult.locations.length > 0) {
              const bestMatch = locationResult.locations[0];
              
              // Get coordinates using Mapbox
              const mapboxToken = "pk.eyJ1IjoicmV0bW91c2VyIiwiYSI6ImNtOXJtOHZ0MjA0dTgycG9ocDA3dXNpMGIifQ.WHYwcRzR3g8djNiBsVw1vg";
              const addressStr = encodeURIComponent(
                `${bestMatch.name}, ${bestMatch.city}, ${bestMatch.region || ''}`
              );
              
              const mapboxResponse = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${addressStr}.json?access_token=${mapboxToken}&limit=1`
              );
              
              if (mapboxResponse.ok) {
                const mapboxData = await mapboxResponse.json();
                
                if (mapboxData.features && mapboxData.features.length > 0) {
                  const feature = mapboxData.features[0];
                  
                  // Add coordinates to the activity
                  response.activities[i].latitude = feature.center[1].toString();
                  response.activities[i].longitude = feature.center[0].toString();
                  
                  console.log(`Found coordinates for ${activity.locationName}: [${feature.center[1]}, ${feature.center[0]}]`);
                }
              }
            }
          } catch (error) {
            console.error(`Error finding location for activity ${activity.title}:`, error);
          }
        }
        
        res.json(response);
      } else {
        // Regular text response
        res.json({ answer: response });
      }
    } catch (error) {
      console.error("Error in assistant endpoint:", error);
      res.status(500).json({ message: "Could not get assistant response" });
    }
  });
  
  // AI-powered location search endpoint
  app.post("/api/ai/find-location", async (req: Request, res: Response) => {
    try {
      const { searchQuery, cityContext } = req.body;
      if (!searchQuery || typeof searchQuery !== 'string') {
        return res.status(400).json({ message: "Valid search query is required" });
      }
      
      const locationData = await aiLocations.findLocation(searchQuery, cityContext);
      res.json(locationData);
    } catch (error) {
      console.error("Error in /api/ai/find-location:", error);
      res.status(500).json({ 
        message: "Could not process location search",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Weather-based activity suggestions endpoint
  app.post("/api/ai/weather-activities", async (req: Request, res: Response) => {
    try {
      const { location, date, weatherCondition } = req.body;
      
      if (!location || !weatherCondition) {
        return res.status(400).json({ message: "Location and weather condition are required" });
      }
      
      const result = await openai.suggestWeatherBasedActivities(
        location,
        date || new Date().toISOString().split('T')[0],
        weatherCondition
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error in weather activities endpoint:", error);
      res.status(500).json({ message: "Could not get weather-based activity suggestions" });
    }
  });
  
  // Budget suggestions endpoint
  app.post("/api/ai/budget-options", async (req: Request, res: Response) => {
    try {
      const { location, budgetLevel, activityType } = req.body;
      
      if (!location || !budgetLevel) {
        return res.status(400).json({ 
          message: "Location and budget level are required",
          validBudgetLevels: ["low", "medium", "high"]
        });
      }
      
      // Validate budget level
      if (!["low", "medium", "high"].includes(budgetLevel)) {
        return res.status(400).json({ 
          message: "Invalid budget level. Must be one of: low, medium, high"
        });
      }
      
      const result = await openai.suggestBudgetOptions(
        location,
        budgetLevel as "low" | "medium" | "high",
        activityType
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error in budget options endpoint:", error);
      res.status(500).json({ message: "Could not get budget suggestions" });
    }
  });

  app.post("/api/weather/forecast", async (req: Request, res: Response) => {
    try {
      const { location, dates } = req.body;
      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }
      
      const { getWeatherForecast, getCurrentWeather } = await import("./weather");
      
      if (dates && dates.length > 0) {
        const forecast = await getWeatherForecast(location, dates);
        res.json({ forecast });
      } else {
        const currentWeather = await getCurrentWeather(location);
        res.json({ current: currentWeather });
      }
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ message: "Could not fetch weather data" });
    }
  });

  // Shared trip route
  app.get("/api/share/:shareCode", async (req: Request, res: Response) => {
    const { shareCode } = req.params;
    
    try {
      // Find trip by share code
      const trip = await storage.getTripByShareCode(shareCode);
      
      if (!trip || !trip.sharingEnabled) {
        return res.status(404).json({ message: "Shared trip not found or sharing is disabled" });
      }

      // Get trip activities, notes, and todos
      const [activities, notes, todos] = await Promise.all([
        storage.getActivitiesByTripId(trip.id),
        storage.getNotesByTripId(trip.id),
        storage.getTodosByTripId(trip.id)
      ]);

      const sharedTripData = {
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        city: trip.city,
        sharePermission: trip.sharePermission || "read-only",
        activities: activities || [],
        notes: notes || [],
        todos: todos || []
      };

      res.json(sharedTripData);
    } catch (error) {
      console.error("Error fetching shared trip:", error);
      res.status(500).json({ message: "Failed to fetch shared trip" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
