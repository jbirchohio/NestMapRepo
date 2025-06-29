import { pgTable, uuid, text, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { withBaseColumns } from '../base.js';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying';
type JobPriority = 'low' | 'normal' | 'high' | 'critical';

// Schema for background jobs
export const superadminBackgroundJobs = pgTable('superadmin_background_jobs', {
  ...withBaseColumns,
  
  // Job identification
  name: text('name').notNull(),
  queue: text('queue').default('default').notNull(),
  
  // Job status and timing
  status: text('status').$type<JobStatus>().default('pending').notNull(),
  priority: text('priority').$type<JobPriority>().default('normal').notNull(),
  
  // Execution details
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  
  // Progress tracking
  progress: integer('progress'), // 0-100
  progressMessage: text('progress_message'),
  
  // Retry information
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  retryAfter: timestamp('retry_after', { withTimezone: true }),
  
  // Input/output data
  input: jsonb('input').$type<Record<string, unknown>>(),
  output: jsonb('output').$type<Record<string, unknown>>(),
  
  // Error information
  error: jsonb('error').$type<{
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
    details?: unknown;
  }>(),
  
  // Metadata and timing
  timeout: integer('timeout'), // in milliseconds
  duration: integer('duration'), // in milliseconds
  
  // Parent/child relationships
  parentId: uuid('parent_id'),
  
  // Additional metadata
  tags: text('tags').array(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Indexes for common query patterns
  nameIdx: index('superadmin_bg_jobs_name_idx').on(table.name),
  queueIdx: index('superadmin_bg_jobs_queue_idx').on(table.queue),
  statusIdx: index('superadmin_bg_jobs_status_idx').on(table.status),
  priorityIdx: index('superadmin_bg_jobs_priority_idx').on(table.priority),
  createdAtIdx: index('superadmin_bg_jobs_created_at_idx').on(table.createdAt),
  startedAtIdx: index('superadmin_bg_jobs_started_at_idx').on(table.startedAt),
  parentIdIdx: index('superadmin_bg_jobs_parent_id_idx').on(table.parentId),
  
  // Composite indexes for common query patterns
  queueStatusIdx: index('superadmin_bg_jobs_queue_status_idx').on(
    table.queue,
    table.status
  ),
  statusPriorityIdx: index('superadmin_bg_jobs_status_priority_idx').on(
    table.status,
    table.priority
  ),
}));

// Schema for job dependencies
export const jobDependencies = pgTable('job_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => superadminBackgroundJobs.id, { onDelete: 'cascade' }),
  dependsOnJobId: uuid('depends_on_job_id')
    .notNull()
    .references(() => superadminBackgroundJobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate dependencies
  jobDependencyIdx: unique('job_dependencies_unique_idx').on(table.jobId, table.dependsOnJobId),
  // Indexes for common query patterns
  jobIdIdx: index('job_dependencies_job_id_idx').on(table.jobId),
  dependsOnJobIdIdx: index('job_dependencies_depends_on_job_id_idx').on(table.dependsOnJobId),
}));

// Schema for creating/updating a background job
export const insertSuperadminBackgroundJobSchema = createInsertSchema(superadminBackgroundJobs, {
  name: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).name.min(1).max(100),
  queue: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).queue.min(1).max(50),
  status: (schema) => z.enum([
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'
  ]).default('pending'),
  priority: (schema) => z.enum([
    'low', 'normal', 'high', 'critical'
  ]).default('normal'),
  progress: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).progress.min(0).max(100).optional(),
  progressMessage: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).progressMessage.optional(),
  retryCount: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).retryCount.min(0).optional(),
  maxRetries: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).maxRetries.min(0).optional(),
  timeout: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).timeout.min(0).optional(),
  duration: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).duration.min(0).optional(),
  tags: (schema) => z.array(z.string()).optional(),
  metadata: (schema) => (schema as typeof superadminBackgroundJobs.$inferInsert).metadata.optional(),
});

// Schema for creating a job dependency
export const insertJobDependencySchema = createInsertSchema(jobDependencies, {
  jobId: (schema) => (schema as typeof jobDependencies.$inferInsert).jobId.uuid(),
  dependsOnJobId: (schema) => (schema as typeof jobDependencies.$inferInsert).dependsOnJobId.uuid(),
});

// Schema for selecting background jobs
export const selectSuperadminBackgroundJobSchema = createSelectSchema(superadminBackgroundJobs);
export const selectJobDependencySchema = createSelectSchema(jobDependencies);

// TypeScript types
export type SuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferSelect;
export type NewSuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferInsert;

export type JobDependency = typeof jobDependencies.$inferSelect;
export type NewJobDependency = typeof jobDependencies.$inferInsert;

// Export the schemas with types
export const superadminBackgroundJobSchema = {
  insert: insertSuperadminBackgroundJobSchema,
  select: selectSuperadminBackgroundJobSchema,
} as const;

export const jobDependencySchema = {
  insert: insertJobDependencySchema,
  select: selectJobDependencySchema,
} as const;
