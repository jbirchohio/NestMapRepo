#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { format } = require('date-fns');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  backup: {
    directory: process.env.BACKUP_DIR || path.join(__dirname, '../../backups'),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    compress: process.env.BACKUP_COMPRESS !== 'false',
  },
};

class DatabaseBackup {
  constructor() {
    this.pool = new Pool({
      ...config.db,
      max: 1, // Limit connections for backup operations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Ensure backup directory exists
    if (!fs.existsSync(config.backup.directory)) {
      fs.mkdirSync(config.backup.directory, { recursive: true });
    }
  }

  async run() {
    try {
      console.log('Starting database backup...');
      
      // 1. Create backup
      const backupFile = await this.createBackup();
      
      // 2. Clean up old backups
      await this.cleanupOldBackups();
      
      console.log(`Backup completed successfully: ${backupFile}`);
      return { success: true, file: backupFile };
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async createBackup() {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const baseName = `backup_${config.db.database}_${timestamp}.sql`;
    const fileName = config.backup.compress ? `${baseName}.gz` : baseName;
    const filePath = path.join(config.backup.directory, fileName);

    const pgDumpCmd = [
      'pg_dump',
      `--host=${config.db.host}`,
      `--port=${config.db.port}`,
      `--username=${config.db.user}`,
      `--dbname=${config.db.database}`,
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      '--no-tablespaces',
      '--clean',
      '--if-exists',
      '--exclude-table-data=public.schema_migrations',
    ];

    // Add compression if enabled
    const cmd = config.backup.compress
      ? `${pgDumpCmd.join(' ')} | gzip > "${filePath}"`
      : `${pgDumpCmd.join(' ')} > "${filePath}"`;

    // Set PGPASSWORD in environment for pg_dump
    process.env.PGPASSWORD = config.db.password;
    
    try {
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
      return filePath;
    } catch (error) {
      // Clean up partial backup file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    if (config.backup.retentionDays <= 0) return;

    const now = new Date();
    const files = fs.readdirSync(config.backup.directory)
      .filter(file => file.match(/^backup_.+\.sql(\.gz)?$/))
      .map(file => ({
        name: file,
        path: path.join(config.backup.directory, file),
        time: fs.statSync(path.join(config.backup.directory, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    const cutoff = now.setDate(now.getDate() - config.backup.retentionDays);
    
    for (const file of files) {
      if (file.time < cutoff) {
        console.log(`Removing old backup: ${file.name}`);
        fs.unlinkSync(file.path);
      }
    }
  }

  // Add restore functionality for completeness
  async restore(backupFile) {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const isCompressed = backupFile.endsWith('.gz');
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      
      // Drop all objects in the database
      await this.dropAllObjects(client);
      
      // Restore the backup
      const psqlCmd = [
        'psql',
        `--host=${config.db.host}`,
        `--port=${config.db.port}`,
        `--username=${config.db.user}`,
        `--dbname=${config.db.database}`,
        '--single-transaction',
        '--set=ON_ERROR_STOP=on',
        isCompressed ? `--file=<(gunzip -c "${backupFile}")` : `--file="${backupFile}"`
      ];

      process.env.PGPASSWORD = config.db.password;
      await execAsync(psqlCmd.join(' '), { shell: '/bin/bash' });
      
      await client.query('COMMIT');
      console.log(`Successfully restored database from ${backupFile}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Restore failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async dropAllObjects(client) {
    // Drop all objects in the database
    const query = `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        -- Drop all views
        FOR r IN (SELECT 'DROP VIEW IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(viewname) || ' CASCADE;' AS q
                  FROM pg_views 
                  WHERE schemaname = 'public') 
        LOOP
          EXECUTE r.q;
        END LOOP;
        
        -- Drop all tables
        FOR r IN (SELECT 'DROP TABLE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' CASCADE;' AS q
                  FROM pg_tables 
                  WHERE schemaname = 'public') 
        LOOP
          EXECUTE r.q;
        END LOOP;
        
        -- Drop all sequences
        FOR r IN (SELECT 'DROP SEQUENCE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(sequencename) || ' CASCADE;' AS q
                  FROM pg_sequences 
                  WHERE schemaname = 'public') 
        LOOP
          EXECUTE r.q;
        END LOOP;
        
        -- Drop all types
        FOR r IN (SELECT 'DROP TYPE IF EXISTS ' || quote_ident(typname) || ' CASCADE;' AS q
                  FROM pg_type t
                  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                  WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
                  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
                  AND n.nspname = 'public')
        LOOP
          EXECUTE r.q;
        END LOOP;
      END
      $$;
    `;
    
    await client.query(query);
  }
}

// Run backup if this file is executed directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.run().catch(console.error);
}

module.exports = DatabaseBackup;
