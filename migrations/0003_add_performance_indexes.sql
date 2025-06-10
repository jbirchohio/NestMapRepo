-- Migration: Add performance indexes for users and refresh_tokens tables
-- Created: 2025-06-08

-- Add indexes to users table
CREATE INDEX IF NOT EXISTS users_locked_until_idx ON auth.users(locked_until);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON auth.users(is_active);

-- Composite index for common user queries
CREATE INDEX IF NOT EXISTS users_active_composite_idx ON auth.users(is_active, locked_until, email_verified);

-- Index for organization-based user lookups
CREATE INDEX IF NOT EXISTS users_org_composite_idx ON auth.users(organization_id, is_active, role);

-- Add indexes to refresh_tokens table
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON auth.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS refresh_tokens_revoked_idx ON auth.refresh_tokens(revoked);

-- Composite index for token validation (most common query)
CREATE INDEX IF NOT EXISTS refresh_tokens_validation_idx ON auth.refresh_tokens(token, revoked, expires_at);

-- Composite index for user token management
CREATE INDEX IF NOT EXISTS refresh_tokens_user_tokens_idx ON auth.refresh_tokens(user_id, revoked, expires_at);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS refresh_tokens_cleanup_idx ON auth.refresh_tokens(expires_at, revoked);

-- Add comment to track migration
COMMENT ON TABLE public.schema_migrations IS 'Added performance indexes for users and refresh_tokens tables';
