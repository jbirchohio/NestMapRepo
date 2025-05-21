#!/usr/bin/env node

/**
 * Database migration script
 * 
 * This script uses Drizzle ORM to push the schema to the database.
 * Run this script with: node scripts/migrate-db.js
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../server/db.js";

console.log("Starting database migration...");

async function main() {
  try {
    // Manually push schema changes to database (simplified approach for MVP)
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();