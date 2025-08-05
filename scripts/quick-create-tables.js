require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

async function createTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set!');
    process.exit(1);
  }

  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient);

  try {
    console.log('Creating superadmin tables...');

    // Create superadmin_background_jobs
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
    console.log('✅ Created superadmin_background_jobs');

    // Create active_sessions
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
    console.log('✅ Created active_sessions');

    // Create superadmin_audit_logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
        id SERIAL PRIMARY KEY,
        superadmin_user_id INTEGER NOT NULL,
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        risk_level VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created superadmin_audit_logs');

    console.log('✨ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables();