import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, organizations } from "./schema";

// Superadmin audit logs for tracking all administrative actions
export const superadminAuditLogs = pgTable("superadmin_audit_logs", {
  id: serial("id").primaryKey(),
  admin_user_id: integer("admin_user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // CREATE_ORG, UPDATE_USER, RESET_PASSWORD, etc.
  entity_type: text("entity_type").notNull(), // organization, user, system
  entity_id: integer("entity_id"),
  target_user_id: integer("target_user_id").references(() => users.id),
  target_organization_id: integer("target_organization_id").references(() => organizations.id),
  details: jsonb("details").$type<Record<string, any>>(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  severity: text("severity").default("info").notNull(), // info, warning, critical
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Active user sessions for security monitoring
export const activeSessions = pgTable("active_sessions", {
  id: text("id").primaryKey(), // session ID
  user_id: integer("user_id").references(() => users.id).notNull(),
  username: text("username").notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  location: text("location"),
  device_info: jsonb("device_info").$type<Record<string, any>>(),
  last_activity: timestamp("last_activity").defaultNow().notNull(),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// AI usage tracking for cost monitoring
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  organization_id: integer("organization_id").references(() => organizations.id),
  endpoint: text("endpoint").notNull(),
  prompt_tokens: integer("prompt_tokens").default(0).notNull(),
  completion_tokens: integer("completion_tokens").default(0).notNull(),
  total_tokens: integer("total_tokens").default(0).notNull(),
  cost_cents: integer("cost_cents").notNull(),
  model: text("model").notNull(),
  success: boolean("success").default(true).notNull(),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Feature flags for system control
export const superadminFeatureFlags = pgTable("superadmin_feature_flags", {
  id: serial("id").primaryKey(),
  flag_name: text("flag_name").notNull().unique(),
  description: text("description"),
  default_value: boolean("default_value").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Organization-specific feature overrides
export const organizationFeatureFlags = pgTable("organization_feature_flags", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  flag_name: text("flag_name").notNull(),
  enabled: boolean("enabled").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Background jobs tracking
export const superadminBackgroundJobs = pgTable("superadmin_background_jobs", {
  id: serial("id").primaryKey(),
  job_type: text("job_type").notNull(), // export_data, send_email, cleanup_logs, etc.
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  data: jsonb("data").$type<Record<string, any>>(),
  result: jsonb("result").$type<Record<string, any>>(),
  error_message: text("error_message"),
  progress: integer("progress").default(0).notNull(),
  total: integer("total").default(100).notNull(),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Billing events for revenue tracking
export const billingEvents = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").references(() => organizations.id).notNull(),
  event_type: text("event_type").notNull(), // subscription_created, payment_succeeded, etc.
  stripe_event_id: text("stripe_event_id"),
  amount_cents: integer("amount_cents"),
  currency: text("currency").default("usd"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// System activity summary for dashboard
export const systemActivitySummary = pgTable("system_activity_summary", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  total_users: integer("total_users").default(0).notNull(),
  active_users: integer("active_users").default(0).notNull(),
  total_organizations: integer("total_organizations").default(0).notNull(),
  active_organizations: integer("active_organizations").default(0).notNull(),
  total_revenue_cents: integer("total_revenue_cents").default(0).notNull(),
  new_signups: integer("new_signups").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertSuperadminAuditLogSchema = createInsertSchema(superadminAuditLogs).omit({
  id: true,
  created_at: true,
});

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  created_at: true,
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  created_at: true,
});

export const insertSuperadminFeatureFlagSchema = createInsertSchema(superadminFeatureFlags).omit({
  id: true,
  created_at: true,
});

export const insertOrganizationFeatureFlagSchema = createInsertSchema(organizationFeatureFlags).omit({
  id: true,
  created_at: true,
});

export const insertSuperadminBackgroundJobSchema = createInsertSchema(superadminBackgroundJobs).omit({
  id: true,
  created_at: true,
});

export const insertBillingEventSchema = createInsertSchema(billingEvents).omit({
  id: true,
  created_at: true,
});

// Types
export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect;
export type InsertSuperadminAuditLog = z.infer<typeof insertSuperadminAuditLogSchema>;

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;

export type SuperadminFeatureFlag = typeof superadminFeatureFlags.$inferSelect;
export type InsertSuperadminFeatureFlag = z.infer<typeof insertSuperadminFeatureFlagSchema>;

export type OrganizationFeatureFlag = typeof organizationFeatureFlags.$inferSelect;
export type InsertOrganizationFeatureFlag = z.infer<typeof insertOrganizationFeatureFlagSchema>;

export type SuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferSelect;
export type InsertSuperadminBackgroundJob = z.infer<typeof insertSuperadminBackgroundJobSchema>;

export type BillingEvent = typeof billingEvents.$inferSelect;
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;

export type SystemActivitySummary = typeof systemActivitySummary.$inferSelect;