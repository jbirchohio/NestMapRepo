import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

// Schema for superadmin feature flags (global flags)
export const superadminFeatureFlags = pgTable('superadmin_feature_flags', {
  ...withBaseColumns,
  name: text('name').notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  // When true, the flag can be overridden at the organization level
  allowOrganizationOverride: boolean('allow_organization_override').default(false).notNull(),
  // Default value for organizations that don't override
  defaultValue: boolean('default_value').default(false).notNull(),
  // Additional metadata for the flag (e.g., rollout percentage)
  metadata: jsonb('metadata').$type<{
    rolloutPercentage?: number;
    enabledFor?: string[];
    disabledFor?: string[];
  }>().default({}),
  // When the flag was last modified
  updatedBy: text('updated_by'),
}, (table) => ({
  // Indexes for common query patterns
  nameIdx: index('superadmin_feature_flags_name_idx').on(table.name),
  isEnabledIdx: index('superadmin_feature_flags_is_enabled_idx').on(table.isEnabled),
}));

// Schema for organization-specific feature flag overrides
export const organizationFeatureFlags = pgTable('organization_feature_flags', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  featureFlagId: uuid('feature_flag_id')
    .notNull()
    .references(() => superadminFeatureFlags.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull(),
  // When the override was last modified
  updatedBy: text('updated_by'),
  // Additional metadata for this override
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Unique constraint on organization + feature flag
  orgFeatureFlagIdx: unique('organization_feature_flags_unique_idx').on(table.organizationId, table.featureFlagId),
  // Indexes for common query patterns
  orgIdx: index('organization_feature_flags_org_idx').on(table.organizationId),
  featureFlagIdx: index('organization_feature_flags_feature_flag_idx').on(table.featureFlagId),
  isEnabledIdx: index('organization_feature_flags_is_enabled_idx').on(table.isEnabled),
}));

// Schema for creating/updating a superadmin feature flag
export const insertSuperadminFeatureFlagSchema = createInsertSchema(superadminFeatureFlags, {
  name: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).name.min(1).max(100).regex(/^[a-z0-9_]+$/),
  description: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).description.optional(),
  isEnabled: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).isEnabled.optional(),
  allowOrganizationOverride: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).allowOrganizationOverride.optional(),
  defaultValue: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).defaultValue.optional(),
  metadata: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).metadata.optional(),
  updatedBy: (schema) => (schema as typeof superadminFeatureFlags.$inferInsert).updatedBy.email().optional(),
});

// Schema for creating/updating an organization feature flag override
export const insertOrganizationFeatureFlagSchema = createInsertSchema(organizationFeatureFlags, {
  isEnabled: (schema) => (schema as typeof organizationFeatureFlags.$inferInsert).isEnabled,
  metadata: (schema) => (schema as typeof organizationFeatureFlags.$inferInsert).metadata.optional(),
  updatedBy: (schema) => (schema as typeof organizationFeatureFlags.$inferInsert).updatedBy.email().optional(),
});

// Schema for selecting feature flags
export const selectSuperadminFeatureFlagSchema = createSelectSchema(superadminFeatureFlags);
export const selectOrganizationFeatureFlagSchema = createSelectSchema(organizationFeatureFlags);

// TypeScript types
export type SuperadminFeatureFlag = typeof superadminFeatureFlags.$inferSelect;
export type NewSuperadminFeatureFlag = typeof superadminFeatureFlags.$inferInsert;

export type OrganizationFeatureFlag = typeof organizationFeatureFlags.$inferSelect;
export type NewOrganizationFeatureFlag = typeof organizationFeatureFlags.$inferInsert;

// Export the schemas with types
export const superadminFeatureFlagSchema = {
  insert: insertSuperadminFeatureFlagSchema,
  select: selectSuperadminFeatureFlagSchema,
} as const;

export const organizationFeatureFlagSchema = {
  insert: insertOrganizationFeatureFlagSchema,
  select: selectOrganizationFeatureFlagSchema,
} as const;
