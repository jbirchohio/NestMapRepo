import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString, { max: 1 });

async function listTables() {
  console.log('📋 Listing database tables...\n');

  try {
    // List all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log('📊 Tables in database:');
    tables.forEach(table => console.log(`  • ${table.table_name}`));

    // List all enums
    const enums = await sql`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typtype = 'e'
      ORDER BY t.typname, e.enumlabel
    `;

    if (enums.length > 0) {
      console.log('\n🏷️ Enums in database:');
      const enumMap = new Map();
      enums.forEach(e => {
        if (!enumMap.has(e.enum_name)) {
          enumMap.set(e.enum_name, []);
        }
        enumMap.get(e.enum_name).push(e.enum_value);
      });

      enumMap.forEach((values, name) => {
        console.log(`  • ${name}: [${values.join(', ')}]`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to list tables:', error);
  } finally {
    await sql.end();
  }
}

listTables();
