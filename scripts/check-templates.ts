import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { templates, users, creatorProfiles } from '../shared/schema';

dotenv.config();

// Use Railway URL directly
const pool = new Pool({
  connectionString: "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway",
});

const db = drizzle(pool);

async function checkData() {
  console.log('📊 Checking Railway database...\n');
  
  try {
    // Count templates
    const allTemplates = await db.select().from(templates);
    console.log(`✅ Templates: ${allTemplates.length}`);
    
    // Count users
    const allUsers = await db.select().from(users);
    const seedUsers = allUsers.filter(u => u.auth_id?.startsWith('seed_'));
    console.log(`✅ Total Users: ${allUsers.length}`);
    console.log(`✅ Seeded Creators: ${seedUsers.length}`);
    
    // Count creator profiles
    const profiles = await db.select().from(creatorProfiles);
    console.log(`✅ Creator Profiles: ${profiles.length}`);
    
    // Show some template titles
    console.log('\n📝 Sample Templates:');
    allTemplates.slice(0, 5).forEach(t => {
      console.log(`  - ${t.title} ($${t.price}) - Status: ${t.status}`);
    });
    
    // Check published templates
    const publishedTemplates = allTemplates.filter(t => t.status === 'published');
    console.log(`\n✅ Published Templates: ${publishedTemplates.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkData();