import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { db, pool } from "../db-connection";
import fs from 'fs';
import { logger } from '../utils/logger';

async function migrateMissingTables() {
  try {
    logger.info('Running migration to add missing tables and columns...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-missing-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Execute the SQL
    await db.execute(sql);
    
    logger.info('Migration completed successfully!');
    logger.info('Added:');
    logger.info('- risk_level column to organizations table');
    logger.info('- revenue_metrics table');
    logger.info('- superadmin_background_jobs table');
    logger.info('- deployments table');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateMissingTables().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});