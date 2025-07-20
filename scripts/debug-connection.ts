import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env file
const envPath = resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
config({ path: envPath });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...');

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function debugConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful!', result);
    
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 Users in database: ${userCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

debugConnection().catch(console.error);
