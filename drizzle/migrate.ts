import { db } from '../server/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Starting database migration...');

  try {
    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        auth_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        user_id INTEGER NOT NULL,
        collaborators JSONB DEFAULT '[]',
        city TEXT,
        country TEXT,
        location TEXT
      );

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
        completed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL,
        task TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        assigned_to TEXT
      );

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL,
        content TEXT NOT NULL
      );
    `);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error performing database migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);