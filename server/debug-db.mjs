import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🔍 Testing database import...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('Environment loaded');

try {
  console.log('Importing db-connection...');
  const { supabase, db, pool } = await import('./db-connection.js');
  console.log('✅ Database connection imported successfully');
  console.log('Supabase client:', supabase ? 'CREATED' : 'NULL');
  console.log('Database client:', db ? 'CREATED' : 'NULL');
  console.log('Pool:', pool ? 'CREATED' : 'NULL');
} catch (error) {
  console.error('❌ Error importing database connection:', error);
}
