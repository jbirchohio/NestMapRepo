#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SchemaSynchronizer {
  constructor() {
    // Get database URL from environment or use defaults
    const dbUrl = process.env.DATABASE_URL || 
                 `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'postgres'}`;
    
    const config = process.env.DATABASE_URL 
      ? {
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false } 
            : false
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'postgres',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          ssl: process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false } 
            : false
        };

    this.pool = new Pool(config);
    
    this.migrationsDir = path.join(__dirname, '../../migrations');
    this.ensureMigrationsDir();
  }

  ensureMigrationsDir() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
  }

  async sync() {
    try {
      console.log('Starting schema synchronization...');
      
      // 1. Generate migration from ORM models
      await this.generateMigration();
      
      // 2. Apply pending migrations
      await this.runMigrations();
      
      // 3. Validate schema
      await this.validateSchema();
      
      console.log('Schema synchronization completed successfully');
    } catch (error) {
      console.error('Error during schema synchronization:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async generateMigration() {
    console.log('Generating migration...');
    
    // This is a simplified example. In a real app, you would use your ORM's migration generator.
    // For example, with TypeORM: typeorm migration:generate -n SchemaSync
    // Or with Knex: knex migrate:make schema_sync
    
    // For this example, we'll create a timestamped migration file
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const migrationName = `schema_sync_${timestamp}`;
    const migrationPath = path.join(this.migrationsDir, `${migrationName}.js`);
    
    const migrationContent = `// Migration generated at ${new Date().toISOString()}
'use strict';

/** @type {import('db-migrate').Migration} */
module.exports = {
  up: async function(db) {
    // This migration will be generated based on ORM models
    // Example:
    // await db.createTable('new_table', {
    //   id: { type: 'uuid', primaryKey: true, notNull: true, defaultValue: new String('gen_random_uuid()') },
    //   created_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') },
    //   // ... other columns
    // });
    
    console.log('Running migration: ${migrationName}');
  },

  down: async function(db) {
    // Example rollback:
    // await db.dropTable('new_table');
  }
};
`;

    fs.writeFileSync(migrationPath, migrationContent);
    console.log(`Created migration: ${migrationPath}`);
    
    return migrationPath;
  }

  async runMigrations() {
    console.log('Running migrations...');
    
    try {
      // Using db-migrate to run migrations
      const { stdout, stderr } = await exec('npx db-migrate up', {
        cwd: path.join(__dirname, '../..'),
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  async validateSchema() {
    console.log('Validating schema...');
    
    // 1. Check for pending migrations
    try {
      const { stdout } = await exec('npx db-migrate status', {
        cwd: path.join(__dirname, '../..'),
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
      });
      
      if (stdout.includes('NO_MIGRATIONS_PENDING') || !stdout.includes('pending')) {
        console.log('✅ No pending migrations');
      } else {
        console.warn('⚠️  Pending migrations found. Run `npx db-migrate up` to apply them.');
        console.log(stdout);
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      throw error;
    }
    
    // 2. Run schema validation
    const SchemaDriftDetector = require('./drift-detector.cjs');
    const detector = new SchemaDriftDetector();
    const report = await detector.detectDrift();
    
    // 3. Check for critical issues
    const hasErrors = report.summary.by_severity.error > 0;
    if (hasErrors) {
      console.error('❌ Critical schema issues found. Please review the report above.');
      process.exit(1);
    } else {
      console.log('✅ Schema validation passed');
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Run the synchronizer if this file is executed directly
if (require.main === module) {
  const synchronizer = new SchemaSynchronizer();
  
  synchronizer.sync()
    .then(() => console.log('Done'))
    .catch(err => {
      console.error('Schema synchronization failed:', err);
      process.exit(1);
    });
}

module.exports = SchemaSynchronizer;
