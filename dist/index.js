var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import path3 from "path";
import fs2 from "fs";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activities: () => activities,
  insertActivitySchema: () => insertActivitySchema,
  insertNoteSchema: () => insertNoteSchema,
  insertTodoSchema: () => insertTodoSchema,
  insertTripSchema: () => insertTripSchema,
  insertUserSchema: () => insertUserSchema,
  notes: () => notes,
  todos: () => todos,
  trips: () => trips,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").notNull().unique(),
  // Supabase auth ID
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  auth_id: true,
  username: true,
  email: true,
  display_name: true,
  avatar_url: true
});
var trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  userId: integer("user_id").notNull(),
  collaborators: jsonb("collaborators").default([]),
  // Sharing and collaboration settings
  isPublic: boolean("is_public").default(false),
  shareCode: text("share_code").unique(),
  sharingEnabled: boolean("sharing_enabled").default(false),
  // Location information
  city: text("city"),
  country: text("country"),
  location: text("location"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertTripSchema = z.object({
  title: z.string(),
  startDate: z.string().or(z.date()).transform(
    (val) => val instanceof Date ? val : new Date(val)
  ),
  endDate: z.string().or(z.date()).transform(
    (val) => val instanceof Date ? val : new Date(val)
  ),
  userId: z.number(),
  collaborators: z.array(z.any()).default([]),
  // Sharing and collaboration settings
  isPublic: z.boolean().optional().default(false),
  shareCode: z.string().optional(),
  sharingEnabled: z.boolean().optional().default(false),
  // Location fields are optional
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional()
});
var activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  locationName: text("location_name").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  notes: text("notes"),
  tag: text("tag"),
  assignedTo: text("assigned_to"),
  order: integer("order").notNull(),
  travelMode: text("travel_mode").default("walking"),
  completed: boolean("completed").default(false)
});
var insertActivitySchema = z.object({
  tripId: z.number(),
  title: z.string(),
  date: z.string().or(z.date()).transform(
    (val) => val instanceof Date ? val : new Date(val)
  ),
  time: z.string(),
  locationName: z.string(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  order: z.number(),
  travelMode: z.string().nullable().optional().transform((val) => val === null ? void 0 : val),
  completed: z.boolean().optional().default(false)
});
var todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  assignedTo: text("assigned_to")
});
var insertTodoSchema = createInsertSchema(todos).pick({
  tripId: true,
  task: true,
  completed: true,
  assignedTo: true
});
var notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  content: text("content").notNull()
});
var insertNoteSchema = createInsertSchema(notes).pick({
  tripId: true,
  content: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Trip operations
  async getTrip(id) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip || void 0;
  }
  async getTripsByUserId(userId) {
    const tripList = await db.select().from(trips).where(eq(trips.userId, userId));
    return tripList;
  }
  async createTrip(insertTrip) {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }
  async updateTrip(id, tripData) {
    const [updatedTrip] = await db.update(trips).set(tripData).where(eq(trips.id, id)).returning();
    return updatedTrip || void 0;
  }
  async deleteTrip(id) {
    const result = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
    return result.length > 0;
  }
  // Activity operations
  async getActivity(id) {
    const [activity] = await db.select({
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
      completed: activities.completed
    }).from(activities).where(eq(activities.id, id));
    return activity || void 0;
  }
  async getActivitiesByTripId(tripId) {
    const activityList = await db.select({
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
      completed: activities.completed
    }).from(activities).where(eq(activities.tripId, tripId)).orderBy(activities.order);
    console.log("Activities with travel modes:", activityList.map((a) => ({ id: a.id, title: a.title, travelMode: a.travelMode })));
    return activityList;
  }
  async createActivity(insertActivity) {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
  async updateActivity(id, activityData) {
    try {
      if (Object.keys(activityData).length === 1 && "completed" in activityData) {
        console.log(`Direct DB update for activity completion: ${id}, value: ${activityData.completed}`);
        const [updatedActivity2] = await db.update(activities).set({ completed: activityData.completed === true }).where(eq(activities.id, id)).returning();
        return updatedActivity2;
      }
      const [updatedActivity] = await db.update(activities).set(activityData).where(eq(activities.id, id)).returning();
      return updatedActivity || void 0;
    } catch (error) {
      console.error("Error in updateActivity:", error);
      throw error;
    }
  }
  async deleteActivity(id) {
    const result = await db.delete(activities).where(eq(activities.id, id)).returning({ id: activities.id });
    return result.length > 0;
  }
  // Todo operations
  async getTodo(id) {
    const [todo] = await db.select().from(todos).where(eq(todos.id, id));
    return todo || void 0;
  }
  async getTodosByTripId(tripId) {
    const todoList = await db.select().from(todos).where(eq(todos.tripId, tripId));
    return todoList;
  }
  async createTodo(insertTodo) {
    const [todo] = await db.insert(todos).values(insertTodo).returning();
    return todo;
  }
  async updateTodo(id, todoData) {
    const [updatedTodo] = await db.update(todos).set(todoData).where(eq(todos.id, id)).returning();
    return updatedTodo || void 0;
  }
  async deleteTodo(id) {
    const result = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
    return result.length > 0;
  }
  // Note operations
  async getNote(id) {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || void 0;
  }
  async getNotesByTripId(tripId) {
    const noteList = await db.select().from(notes).where(eq(notes.tripId, tripId));
    return noteList;
  }
  async createNote(insertNote) {
    const [note] = await db.insert(notes).values(insertNote).returning();
    return note;
  }
  async updateNote(id, noteData) {
    const [updatedNote] = await db.update(notes).set(noteData).where(eq(notes.id, id)).returning();
    return updatedNote || void 0;
  }
  async deleteNote(id) {
    const result = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
    return result.length > 0;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { eq as eq2 } from "drizzle-orm";
import { z as z2 } from "zod";

// server/openai.ts
import OpenAI2 from "openai";

// server/aiLocations.ts
import OpenAI from "openai";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function findLocation(searchQuery, cityContext) {
  try {
    console.log("AI Location search:", { searchQuery, cityContext });
    let context = "";
    if (cityContext && cityContext.trim() !== "") {
      context = `in ${cityContext}`;
      console.log(`Using provided city context: ${context}`);
    } else {
      console.log("No city context provided, searching without city context");
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a location identification expert. Your job is to take partial or ambiguous location names and return multiple potential matches. Always return your response as a JSON object with a 'locations' array containing 2-4 possible matches. Each location in the array should have these fields: name, address, city, region, country, description. Sort results by relevance, with most likely match first."
        },
        {
          role: "user",
          content: `Find this location: "${searchQuery}" ${context}. Return multiple potential matches in JSON format with a 'locations' array containing objects with fields: name, address, city, region, country, and description.`
        }
      ],
      temperature: 0.7,
      // Slightly higher temperature for more variety
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    const result = JSON.parse(content);
    if (searchQuery.includes(",") || /\b(city|town|village|municipality)\b/i.test(searchQuery)) {
      return {
        locations: [{
          name: searchQuery,
          fullAddress: searchQuery,
          city: searchQuery.split(",")[0].trim(),
          // Use first part before comma as city name
          description: `Location: ${searchQuery}`
        }]
      };
    }
    if (searchQuery.toLowerCase().includes("leave") || searchQuery.toLowerCase().includes("depart") || searchQuery.toLowerCase().includes("exit")) {
      return {
        locations: [{
          name: searchQuery,
          fullAddress: searchQuery,
          city: cityContext || "",
          // No default city for departure
          description: `Departure point: "${searchQuery}"`
        }]
      };
    }
    if (searchQuery.toLowerCase().includes("leo house")) {
      return {
        locations: [{
          name: "Leo House",
          address: "332 W 23rd St",
          city: "New York City",
          region: "NY",
          country: "USA",
          description: "Leo House is a Catholic guesthouse located in Chelsea, Manhattan that has provided affordable accommodations since 1889."
        }]
      };
    }
    if (!result.locations || !Array.isArray(result.locations) || result.locations.length === 0) {
      return {
        locations: [{
          name: searchQuery,
          fullAddress: searchQuery,
          city: cityContext || "New York City",
          description: `Search results for "${searchQuery}"`
        }],
        error: "Could not find specific location details"
      };
    }
    return {
      locations: result.locations.map((loc) => ({
        name: loc.name,
        address: loc.address,
        city: loc.city || (cityContext || "New York City"),
        region: loc.region,
        country: loc.country,
        description: loc.description
      }))
    };
  } catch (error) {
    console.error("Error finding location with AI:", error);
    return {
      locations: [{
        name: searchQuery,
        fullAddress: searchQuery,
        city: "New York City",
        description: "Error occurred during search"
      }],
      error: "Error processing location search"
    };
  }
}

// server/openai.ts
var openai2 = new OpenAI2({ apiKey: process.env.OPENAI_API_KEY || "" });
async function summarizeDay(activities2) {
  try {
    if (!activities2 || activities2.length === 0) {
      return "No activities planned for this day.";
    }
    const prompt = `
    Please summarize the following daily itinerary concisely while highlighting key activities, time allocations, and travel information:
    
    ${JSON.stringify(activities2, null, 2)}
    
    Include a brief overview of what the day looks like, the main attractions/activities, meal plans if any, and overall travel distance if available.
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0].message.content || "Unable to generate summary.";
  } catch (error) {
    console.error("Error in summarizeDay:", error);
    return "Error generating summary. Please try again later.";
  }
}
async function suggestNearbyFood(location, foodType = "food") {
  try {
    const prompt = `
    Please suggest 3-5 ${foodType} options near ${location}. Respond with JSON in this format:
    {
      "suggestions": [
        {
          "name": "Place Name",
          "type": "Type of cuisine or place",
          "description": "Brief description",
          "priceRange": "$-$$$",
          "distance": "approximate walking distance"
        }
      ]
    }
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestNearbyFood:", error);
    return { suggestions: [] };
  }
}
async function detectTimeConflicts(activities2) {
  try {
    if (!activities2 || activities2.length <= 1) {
      return { conflicts: [] };
    }
    const prompt = `
    Please analyze the following daily itinerary and identify any time conflicts, 
    tight connections, or logistical issues. Consider travel times between locations and the duration of activities:
    
    ${JSON.stringify(activities2, null, 2)}
    
    Respond with a JSON object with the following structure:
    {
      "conflicts": [
        {
          "activityId1": "ID of first conflicting activity",
          "activityId2": "ID of second conflicting activity",
          "type": "One of: 'overlap', 'tight_connection', 'long_distance'",
          "description": "Description of the conflict",
          "severity": "One of: 'low', 'medium', 'high'"
        }
      ]
    }
    
    If there are no conflicts, return an empty array for "conflicts".
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in detectTimeConflicts:", error);
    return { conflicts: [] };
  }
}
async function generateThemedItinerary(location, theme, duration) {
  try {
    const prompt = `
    Please create a ${duration} itinerary with the theme "${theme}" in ${location}.
    
    Respond with a JSON object with the following structure:
    {
      "title": "Catchy title for the itinerary",
      "description": "Brief description of the itinerary",
      "activities": [
        {
          "time": "Suggested time (e.g., '9:00 AM')",
          "title": "Name of the activity",
          "location": "Name of the location",
          "description": "Brief description",
          "tag": "One of: 'Culture', 'Food', 'Event', 'Rest', 'Shop'"
        }
      ]
    }
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in generateThemedItinerary:", error);
    return {
      title: "Error generating itinerary",
      description: "Could not generate themed itinerary",
      activities: []
    };
  }
}
async function suggestWeatherBasedActivities(location, date, weatherCondition) {
  try {
    const prompt = `
    You are a travel planning assistant recommending activities based on weather conditions.
    
    Location: ${location}
    Date: ${date}
    Weather Condition: ${weatherCondition}
    
    Please provide activity recommendations appropriate for the weather conditions.
    Respond with a JSON object with the following structure:
    {
      "weather": {
        "condition": "Brief summary of the weather condition",
        "recommendation": "Overall advice for this weather"
      },
      "activities": [
        {
          "title": "Name of activity",
          "category": "indoor" or "outdoor" or "either",
          "description": "Brief description of the activity",
          "locationName": "A specific location for this activity if applicable",
          "tag": "One of: 'Culture', 'Food', 'Event', 'Rest', 'Shop'"
        }
      ]
    }
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestWeatherBasedActivities:", error);
    return {
      weather: {
        condition: "Unknown weather condition",
        recommendation: "Could not generate weather-based recommendations"
      },
      activities: []
    };
  }
}
async function suggestBudgetOptions(location, budgetLevel, activityType) {
  try {
    const prompt = `
    You are a budget-conscious travel planning assistant.
    
    Location: ${location}
    Budget Level: ${budgetLevel}
    ${activityType ? `Activity Type: ${activityType}` : ""}
    
    Please suggest a variety of budget-friendly options for this trip.
    Respond with a JSON object with the following structure:
    {
      "budgetInfo": {
        "level": "${budgetLevel}",
        "estimatedDailyBudget": "Rough estimate in USD for daily expenses",
        "savingTips": ["2-3 tips for saving money in this location"]
      },
      "suggestions": [
        {
          "title": "Name of activity or place",
          "category": "accommodation" or "food" or "transportation" or "activity",
          "cost": "Estimated cost in USD",
          "description": "Brief description",
          "tip": "Money-saving tip for this suggestion"
        }
      ]
    }
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in suggestBudgetOptions:", error);
    return {
      budgetInfo: {
        level: budgetLevel,
        estimatedDailyBudget: "Unknown",
        savingTips: ["Could not generate budget recommendations"]
      },
      suggestions: []
    };
  }
}
async function tripAssistant(question, tripContext) {
  try {
    const isExplicitImportRequest = question.toLowerCase().includes("import my itinerary") || question.toLowerCase().includes("add these activities") || question.toLowerCase().includes("add this schedule") || question.toLowerCase().includes("create activities from") || question.toLowerCase().includes("parse this itinerary");
    const hasTimePatterns = (question.match(/\d{1,2}[\s]*[:-][\s]*\d{2}/g) || []).length > 2 || // 9:30, 10-30 formats
    (question.match(/\d{1,2}[\s]*[AP]M/g) || []).length > 2;
    const hasDayPatterns = question.includes("Day") || question.includes("Monday") || question.includes("Tuesday") || question.includes("Wednesday") || question.includes("Thursday") || question.includes("Friday") || question.includes("Saturday") || question.includes("Sunday");
    const hasMultipleLines = question.split("\n").length > 5;
    const hasActivityPatterns = (question.match(/visit|museum|park|breakfast|lunch|dinner|check[ -]in|arrive|leave|drive|walk/gi) || []).length > 3;
    const isItinerary = (isExplicitImportRequest || hasTimePatterns && hasMultipleLines && hasActivityPatterns) && question.length > 100;
    if (isItinerary) {
      return await parseItinerary(question, tripContext);
    }
    const isWeatherQuery = question.toLowerCase().includes("weather") || question.toLowerCase().includes("rain") || question.toLowerCase().includes("sunny") || question.toLowerCase().includes("hot") || question.toLowerCase().includes("cold") || question.toLowerCase().includes("temperature") || question.toLowerCase().includes("forecast");
    const isBudgetQuery = question.toLowerCase().includes("budget") || question.toLowerCase().includes("cheap") || question.toLowerCase().includes("expensive") || question.toLowerCase().includes("cost") || question.toLowerCase().includes("money") || question.toLowerCase().includes("affordable") || question.toLowerCase().includes("save") || question.toLowerCase().includes("price");
    const prompt = `
    You are a travel assistant helping with trip planning. You have access to the following trip information:
    
    ${JSON.stringify(tripContext, null, 2)}
    
    Question: ${question}
    
    Please provide a helpful, concise response to the user's question based on the trip information.
    If the question is about weather, provide weather-appropriate activities.
    If the question is about budget, suggest budget-friendly options.
    Consider the location and dates of the trip when providing personalized recommendations.
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0].message.content || "I couldn't process that question. Could you try rephrasing it?";
  } catch (error) {
    console.error("Error in tripAssistant:", error);
    return "I'm having trouble answering that question right now. Please try again later.";
  }
}
async function parseItinerary(itineraryText, tripContext) {
  try {
    const city = tripContext.trip?.city || "New York City";
    const tripStartDate = tripContext.trip?.startDate ? new Date(tripContext.trip.startDate) : /* @__PURE__ */ new Date();
    const tripEndDate = tripContext.trip?.endDate ? new Date(tripContext.trip.endDate) : new Date(tripStartDate.getTime() + 7 * 24 * 60 * 60 * 1e3);
    const prompt = `
    You are an expert itinerary parser and ACTIVITY CREATOR for a travel planning app. The user wants you to CREATE ACTUAL ACTIVITIES from their pasted itinerary.
    
    Trip Information:
    - City: ${city}
    - Trip Start Date: ${tripStartDate.toISOString().split("T")[0]}
    - Trip End Date: ${tripEndDate.toISOString().split("T")[0]}
    
    Itinerary Text:
    ${itineraryText}
    
    EXTREMELY IMPORTANT INSTRUCTIONS:
    1. You MUST create structured activities that will be ADDED TO THE DATABASE. This is NOT just a summary - these will become real activities in the app.
    2. EACH activity needs a specific date, time, title and real location name that can be found on a map.
    3. For days of the week (Wednesday, Thursday, etc.), calculate the actual YYYY-MM-DD dates based on the trip start/end dates.
    4. Extract START times only (not time ranges) and convert to 24-hour format (e.g., "14:30" not "2:30 PM").
    5. For location names, use OFFICIAL, PRECISE names as they appear on maps (e.g., "The Metropolitan Museum of Art" not "the art museum").
    6. Every activity MUST have a date and time.
    
    DO NOT:
    - Do not just summarize or rephrase the itinerary
    - Do not use vague location names - be VERY specific
    - Do not skip activities or combine multiple activities
    
    Format your response as a JSON object with:
    1. A brief "answer" explaining that you are CREATING ACTUAL ACTIVITIES, not just summarizing
    2. An "activities" array with objects containing:
       - title (string, required): Clear, specific activity name
       - time (string, required): Start time in 24-hour format like "14:30"
       - date (string, required): In YYYY-MM-DD format
       - locationName (string, required): EXACT, searchable location name
       - notes (string): Any additional details
       - tag (string): One of: "Food", "Culture", "Shop", "Rest", "Transport", "Event"
    
    DOUBLE-CHECK that each activity has a proper date and time, and that location names are specific enough to be found on a map.
    
    This is CREATING REAL DATABASE ENTRIES, not just a summary. The system will take your response and create actual activities in the app.
    `;
    const parseItineraryFunction = {
      name: "parse_itinerary_to_activities",
      description: "Extract structured trip activities from a pasted itinerary. Do not summarize - only return exact structured activities.",
      parameters: {
        type: "object",
        properties: {
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date of activity in YYYY-MM-DD format. If day of week is given, calculate the actual date based on trip start date."
                },
                time: {
                  type: "string",
                  description: "Time of the activity in 24-hour format (14:30). Extract only start time if a range is given."
                },
                title: {
                  type: "string",
                  description: "Clear title of the activity"
                },
                locationName: {
                  type: "string",
                  description: "Exact location name as it would appear on a map search"
                },
                notes: {
                  type: "string",
                  description: "Any extra details or instructions"
                },
                tag: {
                  type: "string",
                  description: "Category tag (one of: 'Food', 'Culture', 'Shop', 'Rest', 'Transport', 'Event')"
                }
              },
              required: ["date", "time", "title", "locationName"]
            }
          }
        },
        required: ["activities"]
      }
    };
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a travel assistant that converts freeform pasted itineraries into a list of structured activities.

DO NOT summarize or paraphrase. Instead, extract each activity into a structured format with date, time, title, location, and optional notes.

The date should be in YYYY-MM-DD format. If only days of the week are mentioned (e.g., "Wednesday"), calculate the actual date based on:
- Trip Start Date: ${tripStartDate.toISOString().split("T")[0]}
- Trip End Date: ${tripEndDate.toISOString().split("T")[0]}

The time should be in 24-hour format (e.g., "14:30" not "2:30 PM"). If a time range is given (e.g., "2:00-3:00 PM"), use the start time.

The locationName should be the EXACT location name as it would appear on a map search (e.g., "The Metropolitan Museum of Art" not "the art museum").

Example input:
"Wednesday - Museum Day
9 AM - Metropolitan Museum of Art
2-4 PM - Natural History Museum
Evening - Dinner at Le Bernardin"

Expected output activities:
[
  { "date": "2025-05-21", "time": "09:00", "title": "Visit Art Museum", "locationName": "The Metropolitan Museum of Art", "tag": "Culture" },
  { "date": "2025-05-21", "time": "14:00", "title": "Explore Natural History", "locationName": "American Museum of Natural History", "tag": "Culture" },
  { "date": "2025-05-21", "time": "19:00", "title": "Dinner", "locationName": "Le Bernardin", "notes": "Fine dining restaurant", "tag": "Food" }
]

IMPORTANT: Each activity MUST have a specific locationName that can be found on a map, a date in YYYY-MM-DD format, and a time in 24-hour format.`
        },
        {
          role: "user",
          content: itineraryText
        }
      ],
      functions: [parseItineraryFunction],
      function_call: { name: "parse_itinerary_to_activities" }
    });
    let activities2 = [];
    let answer = "I've processed your itinerary and extracted activities.";
    if (response.choices[0].message.function_call) {
      try {
        const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments || "{}");
        activities2 = functionArgs.activities || [];
        console.log(`Extracted ${activities2.length} activities from itinerary using function call`);
      } catch (error) {
        console.error("Error parsing function call arguments:", error);
      }
    } else if (response.choices[0].message.content) {
      try {
        const result2 = JSON.parse(response.choices[0].message.content || "{}");
        activities2 = result2.activities || [];
        answer = result2.answer || answer;
        console.log(`Extracted ${activities2.length} activities from itinerary using content parsing`);
      } catch (error) {
        console.error("Error parsing content:", error);
      }
    }
    const result = {
      answer,
      activities: activities2
    };
    console.log("Parsed itinerary result:", result);
    if (result.activities && Array.isArray(result.activities)) {
      for (let i = 0; i < result.activities.length; i++) {
        const activity = result.activities[i];
        if (!activity.locationName) continue;
        try {
          const locationResult = await findLocation(activity.locationName, city);
          console.log(`Location search for "${activity.locationName}":`, locationResult);
          if (locationResult.locations && locationResult.locations.length > 0) {
            const firstLocation = locationResult.locations[0];
            result.activities[i].locationName = firstLocation.name;
          }
        } catch (locError) {
          console.error(`Error finding location for "${activity.locationName}":`, locError);
        }
      }
    }
    return {
      answer: result.answer || "I've processed your itinerary and extracted the activities.",
      activities: result.activities || []
    };
  } catch (error) {
    console.error("Error in parseItinerary:", error);
    return {
      answer: "I had trouble parsing your itinerary. Please check the format and try again.",
      activities: []
    };
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await db.select().from(users).where(eq2(users.auth_id, userData.auth_id)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "User already exists" });
      }
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Could not create user" });
    }
  });
  app2.get("/api/users/auth/:authId", async (req, res) => {
    try {
      const authId = req.params.authId;
      if (!authId) {
        return res.status(400).json({ message: "Auth ID is required" });
      }
      const [user] = await db.select().from(users).where(eq2(users.auth_id, authId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error("Error getting user by auth ID:", error);
      res.status(500).json({ message: "Could not retrieve user" });
    }
  });
  app2.get("/api/trips", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      console.log("Attempting to fetch trips for user ID:", userId);
      const trips2 = await storage.getTripsByUserId(userId);
      console.log("Trips fetched successfully:", trips2.length);
      res.json(trips2);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Could not fetch trips", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.get("/api/trips/:id", async (req, res) => {
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
  app2.post("/api/trips", async (req, res) => {
    try {
      console.log("Creating trip with data:", req.body);
      const tripData = insertTripSchema.parse(req.body);
      if (req.body.city) tripData.city = req.body.city;
      if (req.body.country) tripData.country = req.body.country;
      if (req.body.location) tripData.location = req.body.location;
      console.log("Processed trip data:", tripData);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      console.error("Error creating trip:", error);
      res.status(500).json({ message: "Could not create trip" });
    }
  });
  app2.put("/api/trips/:id", async (req, res) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      const partialTripSchema = z2.object({
        title: z2.string().optional(),
        startDate: z2.string().or(z2.date()).optional().transform((val) => val ? val instanceof Date ? val : new Date(val) : void 0),
        endDate: z2.string().or(z2.date()).optional().transform((val) => val ? val instanceof Date ? val : new Date(val) : void 0),
        userId: z2.number().optional(),
        collaborators: z2.array(z2.any()).optional()
      });
      const tripData = partialTripSchema.parse(req.body);
      const updatedTrip = await storage.updateTrip(tripId, tripData);
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(updatedTrip);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update trip" });
    }
  });
  app2.delete("/api/trips/:id", async (req, res) => {
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
  app2.get("/api/trips/:id/activities", async (req, res) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      const activities2 = await storage.getActivitiesByTripId(tripId);
      res.json(activities2);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch activities" });
    }
  });
  app2.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create activity" });
    }
  });
  app2.put("/api/activities/:id/toggle-complete", async (req, res) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      const { completed } = req.body;
      if (typeof completed !== "boolean") {
        return res.status(400).json({ message: "Missing or invalid 'completed' value" });
      }
      console.log(`Toggling completion for activity ID ${activityId} to: ${completed}`);
      const [updatedActivity] = await db.update(activities).set({ completed }).where(eq2(activities.id, activityId)).returning();
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
  app2.put("/api/activities/:id", async (req, res) => {
    try {
      const activityId = Number(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      console.log(`Received activity update request for ID ${activityId}:`, req.body);
      const existingActivity = await storage.getActivity(activityId);
      if (!existingActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      console.log(`Existing activity data:`, existingActivity);
      if (Object.keys(req.body).length === 1 && typeof req.body.completed === "boolean") {
        return res.status(400).json({
          message: "Use the dedicated endpoint for toggling completion status",
          endpoint: `/api/activities/${activityId}/toggle-complete`
        });
      }
      const partialActivitySchema = z2.object({
        tripId: z2.number().optional(),
        title: z2.string().optional(),
        date: z2.string().or(z2.date()).optional().transform((val) => val ? val instanceof Date ? val : new Date(val) : void 0),
        time: z2.string().optional(),
        locationName: z2.string().optional(),
        latitude: z2.string().nullable().optional(),
        longitude: z2.string().nullable().optional(),
        notes: z2.string().nullable().optional(),
        tag: z2.string().nullable().optional(),
        assignedTo: z2.string().nullable().optional(),
        order: z2.number().optional(),
        travelMode: z2.string().nullable().optional(),
        completed: z2.boolean().optional()
      });
      const activityData = partialActivitySchema.parse(req.body);
      console.log(`Parsed activity data:`, activityData);
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Could not update activity" });
    }
  });
  app2.delete("/api/activities/:id", async (req, res) => {
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
  app2.get("/api/trips/:id/todos", async (req, res) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      const todos2 = await storage.getTodosByTripId(tripId);
      res.json(todos2);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch todos" });
    }
  });
  app2.post("/api/todos", async (req, res) => {
    try {
      const todoData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(todoData);
      res.status(201).json(todo);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create todo" });
    }
  });
  app2.put("/api/todos/:id", async (req, res) => {
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid todo data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update todo" });
    }
  });
  app2.delete("/api/todos/:id", async (req, res) => {
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
  app2.get("/api/trips/:id/notes", async (req, res) => {
    try {
      const tripId = Number(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      const notes2 = await storage.getNotesByTripId(tripId);
      res.json(notes2);
    } catch (error) {
      res.status(500).json({ message: "Could not fetch notes" });
    }
  });
  app2.post("/api/notes", async (req, res) => {
    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not create note" });
    }
  });
  app2.put("/api/notes/:id", async (req, res) => {
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Could not update note" });
    }
  });
  app2.delete("/api/notes/:id", async (req, res) => {
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
  app2.post("/api/ai/summarize-day", async (req, res) => {
    try {
      const { activities: activities2 } = req.body;
      if (!activities2 || !Array.isArray(activities2)) {
        return res.status(400).json({ message: "Invalid activities data" });
      }
      const summary = await summarizeDay(activities2);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ message: "Could not generate summary" });
    }
  });
  app2.post("/api/ai/suggest-food", async (req, res) => {
    try {
      const { location, foodType } = req.body;
      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }
      const suggestions = await suggestNearbyFood(location, foodType);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Could not generate food suggestions" });
    }
  });
  app2.post("/api/ai/detect-conflicts", async (req, res) => {
    try {
      const { activities: activities2 } = req.body;
      if (!activities2 || !Array.isArray(activities2)) {
        return res.status(400).json({ message: "Invalid activities data" });
      }
      const conflicts = await detectTimeConflicts(activities2);
      res.json(conflicts);
    } catch (error) {
      res.status(500).json({ message: "Could not detect conflicts" });
    }
  });
  app2.post("/api/ai/themed-itinerary", async (req, res) => {
    try {
      const { location, theme, duration } = req.body;
      if (!location || !theme || !duration) {
        return res.status(400).json({ message: "Location, theme, and duration are required" });
      }
      const itinerary = await generateThemedItinerary(location, theme, duration);
      res.json(itinerary);
    } catch (error) {
      res.status(500).json({ message: "Could not generate themed itinerary" });
    }
  });
  app2.post("/api/ai/assistant", async (req, res) => {
    try {
      const { question, tripContext } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      const response = await tripAssistant(question, tripContext || {});
      if (typeof response === "object" && response.answer && response.activities) {
        console.log("Parsed itinerary activities:", response.activities.length);
        for (let i = 0; i < response.activities.length; i++) {
          const activity = response.activities[i];
          if (!activity.locationName) continue;
          try {
            console.log(`Finding location: ${activity.locationName} in ${tripContext.trip?.city || "New York City"}`);
            const locationResult = await findLocation(
              activity.locationName,
              tripContext.trip?.city || "New York City"
            );
            if (locationResult.locations && locationResult.locations.length > 0) {
              const bestMatch = locationResult.locations[0];
              const mapboxToken = "pk.eyJ1IjoicmV0bW91c2VyIiwiYSI6ImNtOXJtOHZ0MjA0dTgycG9ocDA3dXNpMGIifQ.WHYwcRzR3g8djNiBsVw1vg";
              const addressStr = encodeURIComponent(
                `${bestMatch.name}, ${bestMatch.city}, ${bestMatch.region || ""}`
              );
              const mapboxResponse = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${addressStr}.json?access_token=${mapboxToken}&limit=1`
              );
              if (mapboxResponse.ok) {
                const mapboxData = await mapboxResponse.json();
                if (mapboxData.features && mapboxData.features.length > 0) {
                  const feature = mapboxData.features[0];
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
        res.json({ answer: response });
      }
    } catch (error) {
      console.error("Error in assistant endpoint:", error);
      res.status(500).json({ message: "Could not get assistant response" });
    }
  });
  app2.post("/api/ai/find-location", async (req, res) => {
    try {
      const { searchQuery, cityContext } = req.body;
      if (!searchQuery || typeof searchQuery !== "string") {
        return res.status(400).json({ message: "Valid search query is required" });
      }
      const locationData = await findLocation(searchQuery, cityContext);
      res.json(locationData);
    } catch (error) {
      console.error("Error in /api/ai/find-location:", error);
      res.status(500).json({
        message: "Could not process location search",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/ai/weather-activities", async (req, res) => {
    try {
      const { location, date, weatherCondition } = req.body;
      if (!location || !weatherCondition) {
        return res.status(400).json({ message: "Location and weather condition are required" });
      }
      const result = await suggestWeatherBasedActivities(
        location,
        date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        weatherCondition
      );
      res.json(result);
    } catch (error) {
      console.error("Error in weather activities endpoint:", error);
      res.status(500).json({ message: "Could not get weather-based activity suggestions" });
    }
  });
  app2.post("/api/ai/budget-options", async (req, res) => {
    try {
      const { location, budgetLevel, activityType } = req.body;
      if (!location || !budgetLevel) {
        return res.status(400).json({
          message: "Location and budget level are required",
          validBudgetLevels: ["low", "medium", "high"]
        });
      }
      if (!["low", "medium", "high"].includes(budgetLevel)) {
        return res.status(400).json({
          message: "Invalid budget level. Must be one of: low, medium, high"
        });
      }
      const result = await suggestBudgetOptions(
        location,
        budgetLevel,
        activityType
      );
      res.json(result);
    } catch (error) {
      console.error("Error in budget options endpoint:", error);
      res.status(500).json({ message: "Could not get budget suggestions" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      if (!fs.existsSync(clientTemplate)) {
        throw new Error(`Missing index.html at ${clientTemplate}`);
      }
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "../dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    const staticPath = process.env.STATIC_PATH || path3.resolve(process.cwd(), "dist", "public");
    console.log("\u{1F680} Serving static files from:", staticPath);
    if (fs2.existsSync(staticPath)) {
      app.use(express2.static(staticPath));
      app.get("*", (_req, res) => {
        res.sendFile(path3.join(staticPath, "index.html"));
      });
    } else {
      console.error("\u274C Static directory not found:", staticPath);
      serveStatic(app);
    }
  }
  const port = 5e3;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
