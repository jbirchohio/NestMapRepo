-- NestMap Database Schema
-- This file can be executed directly in your PostgreSQL database to set up the schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL,
  collaborators JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT FALSE,
  share_code TEXT UNIQUE,
  sharing_enabled BOOLEAN DEFAULT FALSE,
  city TEXT,
  country TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL,
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
  completed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Todos Table
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  assigned_to TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Create Indexes for Better Performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_todos_trip_id ON todos(trip_id);
CREATE INDEX IF NOT EXISTS idx_notes_trip_id ON notes(trip_id);

-- Sample Data (Optional - comment out if not needed)
-- INSERT INTO users (auth_id, username, email, display_name) 
-- VALUES ('sample-auth-id', 'demo_user', 'demo@example.com', 'Demo User');

-- INSERT INTO trips (title, start_date, end_date, user_id, city, country) 
-- VALUES ('NYC Trip', '2025-05-20', '2025-05-25', 1, 'New York City', 'USA');

-- INSERT INTO activities (trip_id, title, date, time, location_name, latitude, longitude, tag, "order") 
-- VALUES (1, 'Visit Central Park', '2025-05-21', '10:00', 'Central Park', '40.7812', '-73.9665', 'Culture', 1);