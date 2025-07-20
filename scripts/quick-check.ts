import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

// Load environment variables from root .env file
config({ path: resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function quickCheck() {
  try {
    console.log('🔍 Quick Database Check');
    
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`Users: ${userCount[0].count}`);
    
    const orgCount = await sql`SELECT COUNT(*) as count FROM organizations`;
    console.log(`Organizations: ${orgCount[0].count}`);
    
    const tripCount = await sql`SELECT COUNT(*) as count FROM trips`;
    console.log(`Trips: ${tripCount[0].count}`);
    
    const activityCount = await sql`SELECT COUNT(*) as count FROM activities`;
    console.log(`Activities: ${activityCount[0].count}`);
    
    console.log('\n✅ Database is accessible and has data!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

quickCheck().catch(console.error);
