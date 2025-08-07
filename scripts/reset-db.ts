import { sql } from 'drizzle-orm';
import { db } from '../server/db-connection';

async function resetDatabase() {
  console.log('🗑️  Resetting database...');
  
  try {
    // Drop all tables in the correct order (respecting foreign key constraints)
    await db.execute(sql`DROP TABLE IF EXISTS template_purchases CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS creator_payouts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS template_activities CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS templates CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS notes CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS todos CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS activities CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS trips CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS organizations CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS system_settings CASCADE`);
    
    console.log('✅ All tables dropped successfully');
    
    // The schema will be recreated when we run db:push
    console.log('🔄 Run "npm run db:push" to recreate the schema');
    console.log('🌱 Then run "npm run seed" to add sample data');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();