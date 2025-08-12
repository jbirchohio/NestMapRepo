import { pgTable, serial, text, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";

// Admin-specific tables for consumer app management

// Audit logs for admin actions
export const superadminAuditLogs = pgTable("superadmin_audit_logs", {
  id: serial("id").primaryKey(),
  admin_id: integer("admin_id").notNull(),
  action: text("action").notNull(),
  resource_type: text("resource_type"),
  resource_id: text("resource_id"),
  details: jsonb("details"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  risk_level: text("risk_level").default("low"),
  created_at: timestamp("created_at").defaultNow(),
});

// Background jobs for admin tasks
export const superadminBackgroundJobs = pgTable("superadmin_background_jobs", {
  id: serial("id").primaryKey(),
  job_type: text("job_type").notNull(),
  status: text("status").default("pending"),
  progress: integer("progress").default(0),
  total: integer("total"),
  data: jsonb("data"),
  result: jsonb("result"),
  error: text("error"),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Admin dashboard stats cache
export const superadminStatsCache = pgTable("superadmin_stats_cache", {
  id: serial("id").primaryKey(),
  stat_type: text("stat_type").notNull().unique(),
  value: jsonb("value").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Feature flags for gradual rollouts
export const superadminFeatureFlags = pgTable("superadmin_feature_flags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").default(false),
  rollout_percentage: integer("rollout_percentage").default(0),
  user_whitelist: jsonb("user_whitelist").$type<number[]>().default([]),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Content moderation queue
export const superadminModerationQueue = pgTable("superadmin_moderation_queue", {
  id: serial("id").primaryKey(),
  content_type: text("content_type").notNull(), // template, review, comment, etc
  content_id: integer("content_id").notNull(),
  reporter_id: integer("reporter_id"),
  reason: text("reason"),
  status: text("status").default("pending"), // pending, approved, rejected
  moderator_id: integer("moderator_id"),
  moderator_notes: text("moderator_notes"),
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

// Export types
export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect;
export type SuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferSelect;
export type SuperadminStatsCache = typeof superadminStatsCache.$inferSelect;
export type SuperadminFeatureFlag = typeof superadminFeatureFlags.$inferSelect;
export type SuperadminModerationQueue = typeof superadminModerationQueue.$inferSelect;