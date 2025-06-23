import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';
config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);
async function runMigrations() {
    console.log('Running migrations...');
    try {
        await migrate(db, { migrationsFolder: './migrations' });
        console.log('Migrations completed successfully');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await sql.end();
    }
}
runMigrations();
