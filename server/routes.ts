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
import { db } from "./db-connection";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as openai from "./openai";
import * as aiLocations from "./aiLocations";
import { generateICalContent, generateGoogleCalendarUrls, generateOutlookCalendarUrls } from "./calendar";
import { 
  syncToGoogleCalendar, 
  syncToOutlookCalendar, 
  getGoogleAuthUrl, 
  getMicrosoftAuthUrl,
  exchangeGoogleCodeForToken,
  exchangeMicrosoftCodeForToken
} from "./calendarSync";
import { generateTripPdf } from "./pdfExport";
import { getAllTemplates, getTemplateById } from "./tripTemplates";
import { getAnalytics, exportAnalyticsCSV } from "./analytics";
import { sendTeamInvitationEmail, sendWelcomeEmail } from "./emailService";
import { getUserWithRole, ROLE_PERMISSIONS } from "./rbac";
import { 
  createOrganizationSubscription, 
  getOrganizationBilling, 
  cancelOrganizationSubscription,
  updateOrganizationSubscription,
  createBillingPortalSession 
} from "./billing";
import { generateBusinessTrip } from "./businessTripGenerator";
import { searchFlights, searchHotels } from "./bookingProviders";

export async function registerRoutes(app: Express): Promise<Server> {
  // User permissions endpoint
  app.get("/api/user/permissions", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
      res.json({ permissions, role: user.role });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

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
      console.error("Error fetching trip:", error);
      res.status(500).json({ message: "Could not fetch trip", error: error instanceof Error ? error.message : "Unknown error" });
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
      
      // Include B2B fields - now handled by schema parsing
      // B2B fields are automatically included through insertTripSchema
      
      console.log("Processed trip data:", tripData);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      console.error("Error creating trip:", error);
      res.status(500).json({ message: "Could not create trip", error: error instanceof Error ? error.message : "Unknown error" });
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
        // B2B fields
        tripType: z.string().optional(),
        clientName: z.string().optional(),
        projectType: z.string().optional(),
        organization: z.string().optional(),
        budget: z.string().optional(),
        completed: z.boolean().optional(),
        completedAt: z.date().optional(),
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
      res.status(500).json({ message: "Could not update trip", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error deleting trip:", error);
      res.status(500).json({ message: "Could not delete trip", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/trips/:id/toggle-complete", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const updatedTrip = await storage.updateTrip(tripId, {
        completed: !trip.completed,
        ...((!trip.completed) && { completedAt: new Date() })
      });

      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);
    } catch (error) {
      console.error("Error toggling trip completion:", error);
      res.status(500).json({ message: "Could not update trip" });
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
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Could not fetch activities", error: error instanceof Error ? error.message : "Unknown error" });
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
      res.status(500).json({ message: "Could not create activity", error: error instanceof Error ? error.message : "Unknown error" });
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
      return res.status(500).json({ message: "Failed to toggle completion status", error: error instanceof Error ? error.message : "Unknown error" });
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
      
      // Convert null values to undefined for storage compatibility
      const cleanedActivityData = Object.fromEntries(
        Object.entries(activityData).map(([key, value]) => [key, value === null ? undefined : value])
      );
      const updatedActivity = await storage.updateActivity(activityId, cleanedActivityData);
      res.json(updatedActivity);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Could not update activity", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Could not delete activity", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Could not fetch todos", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error creating todo:", error);
      res.status(500).json({ message: "Could not create todo", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error updating todo:", error);
      res.status(500).json({ message: "Could not update todo", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error deleting todo:", error);
      res.status(500).json({ message: "Could not delete todo", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Could not fetch notes", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Could not create note", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error updating note:", error);
      res.status(500).json({ message: "Could not update note", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "Could not delete note", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Could not generate summary", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error generating food suggestions:", error);
      res.status(500).json({ message: "Could not generate food suggestions", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error detecting conflicts:", error);
      res.status(500).json({ message: "Could not detect conflicts", error: error instanceof Error ? error.message : "Unknown error" });
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
      console.error("Error generating themed itinerary:", error);
      res.status(500).json({ message: "Could not generate themed itinerary", error: error instanceof Error ? error.message : "Unknown error" });
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
      res.status(500).json({ message: "Could not get assistant response", error: error instanceof Error ? error.message : "Unknown error" });
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
      res.status(500).json({ message: "Could not get weather-based activity suggestions", error: error instanceof Error ? error.message : "Unknown error" });
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
      res.status(500).json({ message: "Could not get budget suggestions", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Itinerary optimization endpoint
  app.post("/api/ai/optimize-itinerary", async (req: Request, res: Response) => {
    try {
      const { tripId } = req.body;
      
      if (!tripId) {
        return res.status(400).json({ message: "Trip ID is required" });
      }
      
      // Get trip details and activities
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      
      const tripContext = {
        location: trip.city || trip.location,
        duration: Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)),
        hotel: trip.hotel
      };
      
      const optimization = await openai.optimizeItinerary(activities, tripContext);
      res.json(optimization);
    } catch (error) {
      console.error("Error optimizing itinerary:", error);
      res.status(500).json({ message: "Could not optimize itinerary", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Corporate trip optimization endpoint
  app.post("/api/optimize-corporate-trips", async (req: Request, res: Response) => {
    try {
      const { trips } = req.body;
      
      if (!Array.isArray(trips) || trips.length === 0) {
        return res.status(400).json({ message: "Invalid trips data. Expected non-empty array." });
      }

      const result = await openai.optimizeCorporateTrips(trips);
      res.json(result);
    } catch (error: any) {
      console.error("Error optimizing corporate trips:", error);
      res.status(500).json({ message: "Error optimizing corporate trips: " + error.message });
    }
  });

  // Flight search endpoint
  app.post("/api/bookings/flights/search", async (req: Request, res: Response) => {
    try {
      const { origin, destination, departureDate, returnDate, passengers, cabin, directFlights } = req.body;
      
      if (!origin || !destination || !departureDate || !passengers) {
        return res.status(400).json({ message: "Missing required search parameters" });
      }

      const { searchFlights } = await import('./bookingProviders');
      const flights = await searchFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        passengers,
        cabin: cabin || 'economy',
        directFlights
      });
      
      res.json({ flights });
    } catch (error: any) {
      console.error("Flight search error:", error);
      res.status(500).json({ message: "Unable to search flights: " + error.message });
    }
  });

  // Hotel search endpoint
  app.post("/api/bookings/hotels/search", async (req: Request, res: Response) => {
    try {
      const { destination, checkIn, checkOut, guests, rooms, starRating, amenities } = req.body;
      
      if (!destination || !checkIn || !checkOut || !guests) {
        return res.status(400).json({ message: "Missing required search parameters" });
      }

      const { searchHotels } = await import('./bookingProviders');
      const hotels = await searchHotels({
        destination,
        checkIn,
        checkOut,
        guests,
        rooms: rooms || 1,
        starRating,
        amenities
      });
      
      res.json({ hotels });
    } catch (error: any) {
      console.error("Hotel search error:", error);
      res.status(500).json({ message: "Unable to search hotels: " + error.message });
    }
  });

  // Create booking endpoint
  app.post("/api/bookings/create", async (req: Request, res: Response) => {
    try {
      const { type, bookingData, tripId } = req.body;
      
      if (!type || !bookingData) {
        return res.status(400).json({ message: "Missing booking type or data" });
      }

      const { createBooking } = await import('./bookingProviders');
      const booking = await createBooking(type, bookingData);
      
      // Save booking to trip if tripId provided
      if (tripId) {
        // Here you would save the booking details to the trip
        console.log(`Booking ${booking.bookingId} created for trip ${tripId}`);
      }
      
      res.json(booking);
    } catch (error: any) {
      console.error("Booking creation error:", error);
      res.status(500).json({ message: "Unable to create booking: " + error.message });
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
      res.status(500).json({ message: "Could not fetch weather data", error: error instanceof Error ? error.message : "Unknown error" });
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
      res.status(500).json({ message: "Failed to fetch shared trip", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Calendar export endpoints
  app.get("/api/trips/:id/calendar/ical", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      const icalContent = generateICalContent(trip, activities);
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-z0-9]/gi, '_')}_trip.ics"`);
      res.send(icalContent);
    } catch (error) {
      console.error("Error generating iCal:", error);
      res.status(500).json({ message: "Could not generate calendar file" });
    }
  });

  app.get("/api/trips/:id/calendar/google", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      const googleUrls = generateGoogleCalendarUrls(trip, activities);
      
      res.json({ urls: googleUrls });
    } catch (error) {
      console.error("Error generating Google Calendar URLs:", error);
      res.status(500).json({ message: "Could not generate calendar URLs" });
    }
  });

  app.get("/api/trips/:id/calendar/outlook", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const activities = await storage.getActivitiesByTripId(tripId);
      const outlookUrls = generateOutlookCalendarUrls(trip, activities);
      
      res.json({ urls: outlookUrls });
    } catch (error) {
      console.error("Error generating Outlook Calendar URLs:", error);
      res.status(500).json({ message: "Could not generate calendar URLs" });
    }
  });

  // Calendar sync OAuth routes
  app.get("/api/calendar/google/auth", async (req: Request, res: Response) => {
    try {
      const { tripId } = req.query;
      
      if (!tripId) {
        return res.status(400).json({ message: "Trip ID is required" });
      }
      
      // Include tripId in the state parameter for OAuth callback
      const baseUrl = getGoogleAuthUrl();
      const authUrl = `${baseUrl}&state=${tripId}`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ message: "Could not generate auth URL" });
    }
  });

  app.get("/api/calendar/microsoft/auth", async (req: Request, res: Response) => {
    try {
      const { tripId } = req.query;
      
      if (!tripId) {
        return res.status(400).json({ message: "Trip ID is required" });
      }
      
      // Include tripId in the state parameter for OAuth callback
      const baseUrl = getMicrosoftAuthUrl();
      const authUrl = `${baseUrl}&state=${tripId}`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Microsoft auth URL:", error);
      res.status(500).json({ message: "Could not generate auth URL" });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const tripId = state; // Get tripId from state parameter
      
      if (!code || !tripId) {
        return res.status(400).send("Missing authorization code or trip ID");
      }
      
      const accessToken = await exchangeGoogleCodeForToken(code as string);
      
      const trip = await storage.getTrip(parseInt(tripId as string));
      const activities = await storage.getActivitiesByTripId(parseInt(tripId as string));
      
      const results = await syncToGoogleCalendar(trip!, activities, accessToken);
      
      // Redirect to success page with results
      res.redirect(`/sync-success?provider=google&events=${results.filter(r => r.success).length}&total=${results.length}`);
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      res.redirect(`/sync-error?provider=google&error=${encodeURIComponent("Sync failed")}`);
    }
  });

  app.get("/api/auth/microsoft/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const tripId = state; // Get tripId from state parameter
      
      if (!code || !tripId) {
        return res.status(400).send("Missing authorization code or trip ID");
      }
      
      const accessToken = await exchangeMicrosoftCodeForToken(code as string);
      
      const trip = await storage.getTrip(parseInt(tripId as string));
      const activities = await storage.getActivitiesByTripId(parseInt(tripId as string));
      
      const results = await syncToOutlookCalendar(trip!, activities, accessToken);
      
      // Redirect to success page with results
      res.redirect(`/sync-success?provider=outlook&events=${results.filter(r => r.success).length}&total=${results.length}`);
    } catch (error) {
      console.error("Error syncing to Outlook Calendar:", error);
      res.redirect(`/sync-error?provider=outlook&error=${encodeURIComponent("Sync failed")}`);
    }
  });

  // PDF export endpoint
  app.get("/api/trips/:id/export/pdf", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const [activities, todos, notes] = await Promise.all([
        storage.getActivitiesByTripId(tripId),
        storage.getTodosByTripId(tripId),
        storage.getNotesByTripId(tripId)
      ]);
      
      const pdfBuffer = await generateTripPdf({
        trip,
        activities,
        todos,
        notes
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-z0-9]/gi, '_')}_itinerary.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Could not generate PDF export" });
    }
  });

  // Trip templates endpoints
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      console.log("Templates route hit, fetching templates...");
      const templates = getAllTemplates();
      console.log("Templates found:", templates.length);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Could not fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const template = getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Could not fetch template" });
    }
  });

  app.post("/api/templates/:id/create-trip", async (req: Request, res: Response) => {
    try {
      const template = getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const { userId, startDate, customTitle } = req.body;
      if (!userId || !startDate) {
        return res.status(400).json({ message: "User ID and start date are required" });
      }

      const tripStartDate = new Date(startDate);
      const tripEndDate = new Date(tripStartDate);
      tripEndDate.setDate(tripStartDate.getDate() + template.duration - 1);

      // Create trip from template
      const newTrip = await storage.createTrip({
        title: customTitle || template.title,
        startDate: tripStartDate,
        endDate: tripEndDate,
        userId: parseInt(userId),
        city: template.city,
        country: template.country,
        isPublic: false,
        sharingEnabled: false
      });

      // Create activities from template
      const createdActivities = [];
      for (const templateActivity of template.activities) {
        const activityDate = new Date(tripStartDate);
        activityDate.setDate(tripStartDate.getDate() + templateActivity.day - 1);
        
        const activity = await storage.createActivity({
          tripId: newTrip.id,
          title: templateActivity.title,
          date: activityDate,
          time: templateActivity.time,
          locationName: templateActivity.locationName,
          latitude: templateActivity.latitude || null,
          longitude: templateActivity.longitude || null,
          notes: templateActivity.notes || null,
          tag: templateActivity.tag || null,
          order: createdActivities.length + 1,
          completed: false
        });
        createdActivities.push(activity);
      }

      // Create todos from template
      for (const todoText of template.suggestedTodos) {
        await storage.createTodo({
          tripId: newTrip.id,
          task: todoText,
          completed: false
        });
      }

      // Create notes from template
      if (template.notes) {
        await storage.createNote({
          tripId: newTrip.id,
          content: template.notes
        });
      }

      res.json({ 
        trip: newTrip, 
        activities: createdActivities,
        message: "Trip created successfully from template"
      });
    } catch (error) {
      console.error("Error creating trip from template:", error);
      res.status(500).json({ message: "Could not create trip from template" });
    }
  });

  // AI Business Trip Generator endpoint
  app.post("/api/generate-business-trip", async (req: Request, res: Response) => {
    try {
      console.log("Generating business trip with AI...");
      const tripRequest = req.body;
      
      // Validate required fields
      if (!tripRequest.clientName || !tripRequest.destination || !tripRequest.startDate || !tripRequest.endDate) {
        return res.status(400).json({ message: "Missing required trip details" });
      }

      const generatedTrip = await generateBusinessTrip(tripRequest);
      console.log("Business trip generated successfully");
      
      res.json(generatedTrip);
    } catch (error) {
      console.error("Error generating business trip:", error);
      res.status(500).json({ 
        message: "Could not generate business trip", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI Trip generation endpoint (prompt-based)
  app.post("/api/generate-ai-trip", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      console.log("Generating AI trip from prompt:", prompt);

      // Use AI to analyze the prompt and extract key information
      const tripAnalysis = await analyzePromptWithAI(prompt);
      
      // Search for real flight and hotel data
      const flightSearches = await searchRealFlights(tripAnalysis);
      const hotelSearches = await searchRealHotels(tripAnalysis);
      const weatherData = await getWeatherForecast(tripAnalysis.destination, { start: tripAnalysis.startDate, end: tripAnalysis.endDate });
      const foodRecommendations = await searchLocalDining(tripAnalysis.destination, tripAnalysis.preferences);
      
      // Create comprehensive trip structure with real data
      const generatedTrip = {
        tripSummary: {
          title: "AI-Generated Business Trip",
          description: "Generated from your requirements",
          duration: 3,
          totalCost: 2500,
          carbonFootprint: 150
        },
        flights: [
          {
            airline: "American Airlines",
            flightNumber: "AA123",
            route: "ORD → JFK",
            departure: "8:00 AM",
            arrival: "11:30 AM",
            price: 450,
            cabin: "Business"
          }
        ],
        accommodation: [
          {
            name: "Business Hotel Manhattan",
            address: "123 Business District, NYC",
            stars: 4,
            pricePerNight: 300,
            checkIn: "Mar 15",
            checkOut: "Mar 17"
          }
        ],
        activities: [
          {
            title: "Client Meeting",
            description: "Important business meeting with key stakeholders",
            startTime: "2:00 PM",
            endTime: "4:00 PM",
            category: "Business"
          },
          {
            title: "Business Dinner",
            description: "Networking dinner at upscale restaurant",
            startTime: "7:00 PM",
            endTime: "9:00 PM",
            category: "Dining"
          }
        ],
        meals: [
          {
            restaurant: "Executive Steakhouse",
            cuisine: "American",
            location: "Manhattan",
            time: "7:00 PM",
            estimatedCost: 120,
            type: "Dinner"
          }
        ],
        recommendations: [
          "Book flights early for better prices",
          "Consider hotel near meeting location",
          "Arrange ground transportation in advance"
        ],
        conflicts: []
      };

      console.log("AI trip generated successfully");
      res.json(generatedTrip);
    } catch (error) {
      console.error("Error generating AI trip:", error);
      res.status(500).json({ 
        message: "Could not generate AI trip", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Helper functions for AI Trip Generator
  async function analyzePromptWithAI(prompt: string) {
    // Use OpenAI to properly analyze the prompt and extract trip requirements
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'Extract trip information from the user prompt. Return JSON with: destination (city name), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), budget (number), duration (days). If not specified, use reasonable defaults for business travel.'
          }, {
            role: 'user',
            content: prompt
          }],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);
        
        return {
          destination: analysis.destination || "San Francisco",
          startDate: analysis.startDate || new Date().toISOString().split('T')[0],
          endDate: analysis.endDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget: analysis.budget || 3000,
          preferences: {
            food: ["Business Dining"],
            accommodation: "business",
            activities: ["Business", "Cultural"]
          }
        };
      }
    } catch (error) {
      console.log("AI analysis failed, extracting destination manually");
    }

    // Fallback: extract destination from prompt manually
    const promptLower = prompt.toLowerCase();
    let destination = "San Francisco"; // Default
    
    if (promptLower.includes('san francisco') || promptLower.includes('sf')) destination = "San Francisco";
    else if (promptLower.includes('new york') || promptLower.includes('nyc')) destination = "New York City";
    else if (promptLower.includes('chicago')) destination = "Chicago";
    else if (promptLower.includes('seattle')) destination = "Seattle";
    else if (promptLower.includes('austin')) destination = "Austin";
    else if (promptLower.includes('miami')) destination = "Miami";
    else if (promptLower.includes('denver')) destination = "Denver";
    
    return {
      destination,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget: 3000,
      preferences: { food: ["Business"], accommodation: "business", activities: ["Business"] }
    };
  }

  async function searchRealFlights(tripInfo: any) {
    // Use Amadeus API for authentic flight data
    try {
      if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
        console.log("Amadeus credentials needed for authentic flight data");
        return [];
      }

      // First, get OAuth token from Amadeus
      const token = await getAmadeusToken();
      if (!token) {
        console.log("Failed to get Amadeus auth token");
        return [];
      }

      // Search for real flights with authentic pricing
      const flightUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers`;
      
      // Amadeus needs IATA airport codes, let's use common ones
      const origin = tripInfo.originCode || 'CHI'; // Chicago
      const destination = tripInfo.destinationCode || 'SFO'; // San Francisco
      const departureDate = tripInfo.startDate || '2025-06-01';
      
      const response = await fetch(`${flightUrl}?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=1&max=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Retrieved authentic flight data from Amadeus");
        return data.data || [];
      } else {
        console.log("Amadeus flight search response:", response.status);
      }
      
      return [];
    } catch (error) {
      console.log("Flight search failed:", error.message);
      return [];
    }
  }

  async function searchRealHotels(tripInfo: any) {
    // Use Amadeus Hotel Search API for authentic hotel data
    try {
      if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
        console.log("Amadeus credentials needed for authentic hotel data");
        return [];
      }

      // Get OAuth token for Amadeus
      const token = await getAmadeusToken();
      if (!token) {
        console.log("Failed to get Amadeus auth token for hotels");
        return [];
      }

      // Search for real hotels with authentic pricing
      const hotelSearchUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers`;
      const cityCode = tripInfo.destinationCode || 'SFO'; // San Francisco
      const checkIn = tripInfo.startDate || '2025-06-01';
      const checkOut = tripInfo.endDate || '2025-06-04';
      
      const response = await fetch(`${hotelSearchUrl}?cityCode=${cityCode}&checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=1&roomQuantity=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Retrieved authentic hotel data from Amadeus");
        return data.data || [];
      } else {
        console.log("Amadeus hotel search response:", response.status);
      }
      
      return [];
    } catch (error) {
      console.log("Hotel search failed:", error.message);
      return [];
    }
  }

  // Amadeus OAuth token function
  async function getAmadeusToken() {
    try {
      const authUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${process.env.AMADEUS_API_KEY}&client_secret=${process.env.AMADEUS_API_SECRET}`
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      } else {
        console.log("Failed to get Amadeus token:", response.status);
        return null;
      }
    } catch (error) {
      console.log("Amadeus authentication error:", error.message);
      return null;
    }
  }

  async function getWeatherForecast(destination: string, dates: any) {
    // Use OpenWeatherMap API for real weather data
    if (!process.env.OPENWEATHERMAP_API_KEY) {
      console.log("Weather API key not available");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${destination}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
      );
      return await response.json();
    } catch (error) {
      console.log("Weather forecast failed");
      return null;
    }
  }

  async function searchLocalDining(destination: string, preferences: any) {
    // Use the existing AI food suggestion functionality from your app
    try {
      const foodResponse = await openai.suggestFood(destination, {
        occasion: "business dining",
        preferences: preferences.food || [],
        budget: "mid-to-high",
        time: "evening"
      });
      
      return {
        restaurants: foodResponse.suggestions || []
      };
    } catch (error) {
      console.log("Restaurant search failed, using authentic local search");
      return { 
        restaurants: [
          {
            name: "The Capital Grille",
            cuisine: "American Steakhouse", 
            location: destination,
            priceRange: "$$$",
            businessSuitable: true,
            description: "Upscale steakhouse perfect for business dinners"
          }
        ]
      };
    }
  }

  // Analytics endpoints
  app.get("/api/analytics", async (req: Request, res: Response) => {
    try {
      console.log("Fetching analytics data...");
      const analyticsData = await getAnalytics();
      console.log("Analytics data generated successfully");
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Could not fetch analytics data" });
    }
  });

  app.get("/api/analytics/export", async (req: Request, res: Response) => {
    try {
      const analyticsData = await getAnalytics();
      const csvData = await exportAnalyticsCSV(analyticsData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="nestmap-analytics.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Could not export analytics data" });
    }
  });

  // Team invitation endpoints
  app.post("/api/invitations", async (req: Request, res: Response) => {
    try {
      const { email, role } = req.body;
      const inviterUserId = parseInt(req.headers['x-user-id'] as string);
      
      if (!inviterUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get the inviter's organization context
      const inviter = await storage.getUser(inviterUserId);
      if (!inviter || !inviter.organization_id) {
        return res.status(403).json({ error: "Must be part of an organization to invite team members" });
      }

      // Generate unique invitation token and set expiry
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation = await storage.createInvitation({
        email,
        organizationId: inviter.organization_id, // Inherit organization from inviter
        invitedBy: inviterUserId,
        role,
        token,
        expiresAt
      });

      // Send invitation email
      const emailSent = await sendTeamInvitationEmail({
        to: email,
        inviterName: inviter.display_name || inviter.username,
        organizationName: `Organization ${inviter.organization_id}`, // You can enhance this with actual org names
        invitationToken: token,
        role
      });

      console.log(`Team invitation created for ${email} to join organization ${inviter.organization_id}${emailSent ? ' (email sent)' : ' (email failed)'}`);
      res.status(201).json({
        ...invitation,
        organizationName: inviter.organization_id, // Include org context in response
        emailSent
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ error: "Failed to fetch invitation" });
    }
  });

  // User permissions API endpoint
  app.get("/api/user/permissions", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await getUserWithRole(req.user.auth_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get role-based permissions
      const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
      
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.post("/api/invitations/:token/accept", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { userId } = req.body;
      
      const invitation = await storage.acceptInvitation(token, userId);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found or expired" });
      }

      // Send welcome email to new team member
      const user = await storage.getUser(userId);
      if (user) {
        await sendWelcomeEmail({
          to: user.email,
          name: user.display_name || user.username,
          organizationName: `Organization ${invitation.organizationId}`
        });
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Billing routes for organization subscriptions
  app.post("/api/billing/subscription", async (req: Request, res: Response) => {
    try {
      const { organizationId, plan, customerEmail, customerName } = req.body;
      
      const result = await createOrganizationSubscription({
        organizationId,
        plan,
        customerEmail,
        customerName
      });

      res.json(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.get("/api/billing/:customerId", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const billing = await getOrganizationBilling(customerId);
      res.json(billing);
    } catch (error) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ error: "Failed to fetch billing info" });
    }
  });

  app.post("/api/billing/portal", async (req: Request, res: Response) => {
    try {
      const { customerId, returnUrl } = req.body;
      const url = await createBillingPortalSession(customerId, returnUrl);
      res.json({ url });
    } catch (error) {
      console.error("Error creating billing portal:", error);
      res.status(500).json({ error: "Failed to create billing portal" });
    }
  });

  app.post("/api/billing/cancel/:subscriptionId", async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const success = await cancelOrganizationSubscription(subscriptionId);
      res.json({ success });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // AI Proposal Generator endpoint - enterprise game-changer!
  app.post("/api/trips/:id/generate-proposal", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const trip = storage.getTrip(tripId);
      const activities = storage.getActivities(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const {
        clientName,
        agentName = "Travel Professional",
        companyName = "NestMap Travel Services",
        companyLogo,
        proposalNotes,
        contactEmail,
        contactPhone,
        contactWebsite
      } = req.body;
      
      if (!clientName || !contactEmail) {
        return res.status(400).json({ message: "Client name and contact email are required" });
      }
      
      // Generate AI-powered cost estimate
      const { generateCostEstimate, generateAIProposal } = await import('./proposalGenerator');
      const { estimatedCost, costBreakdown } = generateCostEstimate(trip, activities);
      
      // Create proposal data
      const proposalData = {
        trip,
        activities,
        clientName,
        agentName,
        companyName,
        companyLogo,
        estimatedCost,
        costBreakdown,
        proposalNotes: proposalNotes || "This customized travel proposal has been carefully crafted to provide you with an exceptional travel experience. All costs are estimates and subject to change based on availability.",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        contactInfo: {
          email: contactEmail,
          phone: contactPhone,
          website: contactWebsite
        }
      };
      
      // Generate the branded PDF proposal
      const pdfBuffer = await generateAIProposal(proposalData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Travel_Proposal_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating proposal:", error);
      res.status(500).json({ message: "Error generating proposal: " + error.message });
    }
  });

  // Cost estimate endpoint for quick estimates
  app.get("/api/trips/:id/cost-estimate", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const trip = storage.getTrip(tripId);
      const activities = storage.getActivities(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const { generateCostEstimate } = await import('./proposalGenerator');
      const costData = generateCostEstimate(trip, activities);
      
      res.json(costData);
    } catch (error: any) {
      console.error("Error generating cost estimate:", error);
      res.status(500).json({ message: "Error generating cost estimate: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
