-- Add missing column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_template_revenue DECIMAL(10, 2) DEFAULT 0;

-- Add destinations table if it doesn't exist
CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  title TEXT,
  meta_description TEXT,
  hero_description TEXT,
  overview TEXT,
  best_time_to_visit TEXT,
  top_attractions JSONB DEFAULT '[]'::jsonb,
  local_tips JSONB DEFAULT '[]'::jsonb,
  getting_around TEXT,
  where_to_stay TEXT,
  food_and_drink TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  seasonal_weather JSONB,
  cover_image TEXT,
  thumbnail_image TEXT,
  image_attribution TEXT,
  status TEXT DEFAULT 'draft',
  ai_generated BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  template_count INTEGER DEFAULT 0,
  popularity_score DECIMAL(5, 2) DEFAULT 0,
  last_regenerated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_branding table if needed (deprecated but for compatibility)
CREATE TABLE IF NOT EXISTS admin_branding (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create other deprecated tables for compatibility
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  last_four TEXT,
  brand TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spend_controls (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL,
  approver_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);