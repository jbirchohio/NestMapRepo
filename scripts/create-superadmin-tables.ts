#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
config({ path: path.resolve(__dirname, '../.env') });

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function createSuperadminTables() {
  try {
    console.log('🔨 Creating missing superadmin tables...');
    
    // Create superadmin_background_jobs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS superadmin_background_jobs (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error TEXT,
        result JSONB
      )
    `);
    
    console.log('✅ Created superadmin_background_jobs table');
    
    // Add missing risk_level column to audit logs if needed
    await db.execute(sql`
      ALTER TABLE superadmin_audit_logs 
      ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low'
    `);
    
    console.log('✅ Added risk_level column to audit logs');
    
    // Create active_sessions table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    
    console.log('✅ Created active_sessions table');
    
    // Create system_activity_summary table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_activity_summary (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL,
        total_users INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        new_trips INTEGER DEFAULT 0,
        total_bookings INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Created system_activity_summary table');
    
    console.log('✨ All superadmin tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
  
  process.exit(0);
}

createSuperadminTables();