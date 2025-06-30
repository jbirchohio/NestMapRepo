import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Initializing SQLite database...');
  
  // Create the database file by initializing Prisma Client
  const prisma = new PrismaClient();
  
  try {
    // Test the connection (this will create the database file if it doesn't exist)
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database file created successfully');
    
    // Read and execute our manual migration SQL
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '0_init', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying schema...');
    await prisma.$executeRawUnsafe(migrationSQL);
    console.log('✅ Database schema applied successfully');
    
    // Mark the migration as applied in the _prisma_migrations table
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count)
      VALUES ('00000000-0000-0000-0000-000000000000', 'manual_migration', '0_init', datetime('now'), 1);
    `;
    
    console.log('✅ Migration recorded successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
