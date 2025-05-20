import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Trip schema
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  userId: integer("user_id").notNull(),
  collaborators: jsonb("collaborators").default([]),
});

export const insertTripSchema = createInsertSchema(trips)
  .pick({
    title: true,
    startDate: true,
    endDate: true,
    userId: true,
    collaborators: true,
  })
  .transform((data) => {
    return {
      ...data,
      startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
      endDate: data.endDate instanceof Date ? data.endDate : new Date(data.endDate),
    };
  });

// Activity schema
export const activities = pgTable("activities", {
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
});

export const insertActivitySchema = createInsertSchema(activities)
  .pick({
    tripId: true,
    title: true,
    date: true,
    time: true,
    locationName: true,
    latitude: true,
    longitude: true,
    notes: true,
    tag: true,
    assignedTo: true,
    order: true,
  })
  .transform((data) => {
    return {
      ...data,
      date: data.date instanceof Date ? data.date : new Date(data.date),
    };
  });

// Todo schema
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  assignedTo: text("assigned_to"),
});

export const insertTodoSchema = createInsertSchema(todos).pick({
  tripId: true,
  task: true,
  completed: true,
  assignedTo: true,
});

// Notes schema
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  content: text("content").notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  tripId: true,
  content: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
