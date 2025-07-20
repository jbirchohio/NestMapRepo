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

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check for user_role enum
    const userRoles = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumlabel
    `;

    if (userRoles.length > 0) {
      console.log('👥 Available user roles:');
      userRoles.forEach(role => console.log(`  • ${role.enumlabel}`));
    } else {
      console.log('❌ No user_role enum found');
    }

    // Check users table structure
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;

    if (userColumns.length > 0) {
      console.log('\n📋 Users table structure:');
      userColumns.forEach(col => {
        console.log(`  • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n❌ No users table found');
    }

    // Check organizations table structure
    const orgColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      ORDER BY ordinal_position
    `;

    if (orgColumns.length > 0) {
      console.log('\n🏢 Organizations table structure:');
      orgColumns.forEach(col => {
        console.log(`  • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n❌ No organizations table found');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await sql.end();
  }
}

checkSchema();
