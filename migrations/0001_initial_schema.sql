-- Initial schema migration for NestMap
-- This migration creates the core database structure with proper indexing

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  plan TEXT DEFAULT 'free',
  white_label_enabled BOOLEAN DEFAULT false,
  white_label_plan TEXT DEFAULT 'none',
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  logo_url TEXT,
  support_email TEXT,
  employee_count INTEGER,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on domain for organization lookup
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  role_type TEXT DEFAULT 'corporate',
  organization_id INTEGER REFERENCES organizations(id),
  company TEXT,
  job_title TEXT,
  team_size TEXT,
  use_case TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Trips table with organization isolation
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  collaborators JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  sharing_enabled BOOLEAN DEFAULT false,
  share_permission TEXT DEFAULT 'read-only',
  city TEXT,
  country TEXT,
  location TEXT,
  city_latitude TEXT,
  city_longitude TEXT,
  hotel TEXT,
  hotel_latitude TEXT,
  hotel_longitude TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  trip_type TEXT DEFAULT 'personal',
  client_name TEXT,
  project_type TEXT,
  budget TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Critical indexes for multi-tenant performance
CREATE INDEX IF NOT EXISTS idx_trips_organization_id ON trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code);

-- Activities table with organization isolation
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id INTEGER NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  title TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  time TEXT NOT NULL,
  location_name TEXT NOT NULL,
  latitude TEXT,
  longitude TEXT,
  notes TEXT,
  tag TEXT,
  assigned_to TEXT,
  "order" INTEGER NOT NULL,
  travel_mode TEXT DEFAULT 'walking',
  completed BOOLEAN DEFAULT false
);

-- Indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);

-- Todos table with organization isolation
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id INTEGER NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  assigned_to TEXT
);

-- Indexes for todo queries
CREATE INDEX IF NOT EXISTS idx_todos_trip_id ON todos(trip_id);
CREATE INDEX IF NOT EXISTS idx_todos_organization_id ON todos(organization_id);

-- Notes table with organization isolation
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id INTEGER NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  content TEXT NOT NULL
);

-- Indexes for note queries
CREATE INDEX IF NOT EXISTS idx_notes_trip_id ON notes(trip_id);
CREATE INDEX IF NOT EXISTS idx_notes_organization_id ON notes(organization_id);

-- Team invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  invited_by INTEGER REFERENCES users(id) NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP
);

-- Index for invitation lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);

-- Trip collaborators table
CREATE TABLE IF NOT EXISTS trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  invited_by INTEGER,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  status TEXT DEFAULT 'pending'
);

-- Index for collaborator lookups
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);