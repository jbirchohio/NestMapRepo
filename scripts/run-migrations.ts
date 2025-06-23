#!/usr/bin/env tsx
/**
 * Database migration runner for NestMap
 * Replaces the push-only system with proper migration management
 */
import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
interface Migration {
    id: string;
    filename: string;
    executed_at?: Date;
}
async function createMigrationTable() {
    await db.execute(sql `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
async function getExecutedMigrations(): Promise<string[]> {
    const result = await db.execute(sql `
    SELECT filename FROM _migrations ORDER BY id;
  `);
    return result.map((row: any) => row.filename);
}
async function executeMigration(filename: string, content: string) {
    console.log(`Executing migration: ${filename}`);
    // Split migration file by statements (simple approach)
    const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
        try {
            await db.execute(sql.raw(statement));
        }
        catch (error) {
            console.error(`Error in statement: ${statement}`);
            throw error;
        }
    }
    // Record migration as executed
    await db.execute(sql `
    INSERT INTO _migrations (filename) VALUES (${filename});
  `);
    console.log(`✅ Migration ${filename} completed successfully`);
}
async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    await createMigrationTable();
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const executedMigrations = await getExecutedMigrations();
    if (!fs.existsSync(migrationsDir)) {
        console.log('No migrations directory found, creating it...');
        fs.mkdirSync(migrationsDir, { recursive: true });
        return;
    }
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    let executedCount = 0;
    for (const filename of migrationFiles) {
        if (executedMigrations.includes(filename)) {
            console.log(`⏭️  Skipping ${filename} (already executed)`);
            continue;
        }
        const filePath = path.join(migrationsDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            await executeMigration(filename, content);
            executedCount++;
        }
        catch (error) {
            console.error(`❌ Migration ${filename} failed:`, error);
            process.exit(1);
        }
    }
    if (executedCount === 0) {
        console.log('✨ Database is up to date - no migrations to run');
    }
    else {
        console.log(`✅ Successfully executed ${executedCount} migration(s)`);
    }
}
async function rollbackLastMigration() {
    console.log('🔄 Rolling back last migration...');
    const result = await db.execute(sql `
    SELECT filename FROM _migrations ORDER BY id DESC LIMIT 1;
  `);
    if (result.length === 0) {
        console.log('No migrations to rollback');
        return;
    }
    const lastMigration = (result[0] as any).filename;
    // Check for rollback file
    const rollbackFile = path.join(process.cwd(), 'migrations', 'rollbacks', lastMigration.replace('.sql', '_rollback.sql'));
    if (fs.existsSync(rollbackFile)) {
        const content = fs.readFileSync(rollbackFile, 'utf-8');
        const statements = content
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        for (const statement of statements) {
            await db.execute(sql.raw(statement));
        }
        // Remove from migrations table
        await db.execute(sql `
      DELETE FROM _migrations WHERE filename = ${lastMigration};
    `);
        console.log(`✅ Rolled back migration: ${lastMigration}`);
    }
    else {
        console.error(`❌ No rollback file found for ${lastMigration}`);
        console.error('Manual rollback required');
    }
}
async function showMigrationStatus() {
    console.log('📊 Migration Status:');
    const executed = await getExecutedMigrations();
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.log('No migrations directory found');
        return;
    }
    const allMigrations = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    for (const migration of allMigrations) {
        const status = executed.includes(migration) ? '✅' : '⏳';
        console.log(`${status} ${migration}`);
    }
}
// CLI handling
const command = process.argv[2];
async function main() {
    try {
        switch (command) {
            case 'run':
                await runMigrations();
                break;
            case 'rollback':
                await rollbackLastMigration();
                break;
            case 'status':
                await showMigrationStatus();
                break;
            default:
                console.log('Usage: tsx scripts/run-migrations.ts [run|rollback|status]');
                break;
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export { runMigrations, rollbackLastMigration, showMigrationStatus };
