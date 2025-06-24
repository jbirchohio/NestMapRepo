#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class DatabaseSetup {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres', // Connect to default postgres DB first
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    this.databaseName = process.env.DB_NAME || 'nestmap';
  }

  async run() {
    console.log('🚀 Starting database setup...');
    
    try {
      // 1. Create database if it doesn't exist
      await this.createDatabaseIfNotExists();
      
      // 2. Connect to the new database
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: this.databaseName,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      // 3. Run migrations
      await this.runMigrations();
      
      console.log('✅ Database setup completed successfully!');
    } catch (error) {
      console.error('❌ Error setting up database:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async createDatabaseIfNotExists() {
    console.log('🔍 Checking if database exists...');
    const client = await this.pool.connect();
    
    try {
      // Check if database exists
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1', 
        [this.databaseName]
      );
      
      if (result.rows.length === 0) {
        console.log(`🆕 Creating database: ${this.databaseName}`);
        // Must connect to template1 to create a new database
        await client.query(`CREATE DATABASE ${this.databaseName}`);
        console.log('✅ Database created');
      } else {
        console.log('✅ Database already exists');
      }
    } catch (error) {
      console.error('Error creating database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    console.log('🔄 Running migrations...');
    const client = await this.pool.connect();
    
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          run_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      
      // Get list of migration files
      const migrationsDir = path.join(__dirname, '../migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Run each migration that hasn't been run yet
      for (const file of migrationFiles) {
        const migrationName = path.basename(file, '.sql');
        
        // Check if migration has already been run
        const result = await client.query(
          'SELECT 1 FROM _migrations WHERE name = $1',
          [migrationName]
        );
        
        if (result.rows.length === 0) {
          console.log(`  ➡️  Running migration: ${file}`);
          
          // Read and execute migration SQL
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await client.query('BEGIN');
          
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO _migrations (name) VALUES ($1)',
              [migrationName]
            );
            await client.query('COMMIT');
            console.log(`  ✅ Applied migration: ${file}`);
          } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to apply migration ${file}:`, error);
            throw error;
          }
        } else {
          console.log(`  ⏭️  Already applied: ${file}`);
        }
      }
      
      console.log('✅ All migrations applied');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run().catch(console.error);
}

module.exports = DatabaseSetup;
