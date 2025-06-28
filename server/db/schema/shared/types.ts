import type { z } from 'zod';

/**
 * JSON value type for database columns
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | { [key: string]: JsonValue | undefined } 
  | JsonValue[];

/**
 * Base table types that are extended by other tables
 */
export interface BaseTable {
  /** Unique identifier for the record */
  id: string;
  /** When the record was created */
  createdAt: Date;
  /** When the record was last updated */
  updatedAt: Date;
  /** When the record was soft-deleted, if applicable */
  deletedAt?: Date | null;
}

/**
 * Timestamp fields that can be included in other interfaces
 */
export interface WithTimestamps {
  /** When the record was created */
  createdAt: Date;
  /** When the record was last updated */
  updatedAt: Date;
}

/**
 * Soft delete fields
 */
export interface SoftDelete {
  /** When the record was soft-deleted */
  deletedAt: Date | null;
  /** Who deleted the record */
  deletedBy?: string | null;
}

/**
 * Metadata type for JSONB columns
 */
export type Metadata = {
  /** Who created the record */
  createdBy?: string;
  /** Who last updated the record */
  updatedBy?: string;
  /** Additional dynamic metadata properties */
  [key: string]: JsonValue | undefined;
}

/**
 * User preferences type for user settings
 */
export interface UserPreferences {
  /** UI theme preference */
  theme?: 'light' | 'dark' | 'system';
  /** User's preferred language */
  language?: string;
  /** User's timezone */
  timezone?: string;
  /** Preferred date format */
  dateFormat?: string;
  /** Preferred time format */
  timeFormat?: string;
  /** Notification preferences */
  notifications?: {
    /** Email notifications */
    email?: boolean;
    /** Push notifications */
    push?: boolean;
    /** SMS notifications */
    sms?: boolean;
  };
  /** Privacy settings */
  privacy?: {
    /** Whether to show email */
    showEmail?: boolean;
    /** Whether to show full name */
    showFullName?: boolean;
    /** Whether to show last active time */
    showLastActive?: boolean;
  };
}

/**
 * Type helper for creating schema types
 */
export type InferInsert<T> = T extends { insert: z.ZodType<infer U> } ? U : never;
export type InferSelect<T> = T extends { select: z.ZodType<infer U> } ? U : never;
