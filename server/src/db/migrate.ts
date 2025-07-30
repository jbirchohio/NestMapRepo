import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Create a database connection
    const sql = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(sql);
    
    // Run migrations from the migrations folder
    console.log('Running migrations...');
    await migrate(db, { 
      migrationsFolder: path.join(__dirname, '../../migrations') 
    });
    
    console.log('✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
