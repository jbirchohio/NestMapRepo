import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { getSetting } from './systemSettingsService.js';

const execAsync = promisify(exec);

export async function backupDatabase(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `remvana-backup-${timestamp}.sql`);

  // Ensure backup directory exists
  await fs.mkdir(backupDir, { recursive: true });

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    // For PostgreSQL, use pg_dump
    // Parse connection URL
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = password;

    // Run pg_dump
    const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupFile}"`;

    await execAsync(command);

    // Clean up old backups
    await cleanupOldBackups(backupDir);

    // Log backup
    await db.execute(sql`
      INSERT INTO backup_logs (backup_file, backup_size, status, created_at)
      VALUES (${backupFile}, ${(await fs.stat(backupFile)).size}, 'success', NOW())
    `);

    return backupFile;
  } catch (error) {
    // Log failed backup
    await db.execute(sql`
      INSERT INTO backup_logs (backup_file, status, error_message, created_at)
      VALUES (${backupFile}, 'failed', ${String(error)}, NOW())
    `);

    throw error;
  } finally {
    // Clean up environment
    delete process.env.PGPASSWORD;
  }
}

async function cleanupOldBackups(backupDir: string) {
  const retentionDays = await getSetting('backup_retention_days') || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const files = await fs.readdir(backupDir);

  for (const file of files) {
    if (file.startsWith('remvana-backup-')) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        }
    }
  }
}

// Create backup logs table if it doesn't exist
export async function initializeBackupSystem() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id SERIAL PRIMARY KEY,
      backup_file TEXT NOT NULL,
      backup_size BIGINT,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}