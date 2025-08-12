import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { inArray } from 'drizzle-orm';

async function checkActivities() {
  const templateIds = [64, 65, 66, 74]; // Our budget templates
  
  const results = await db.select({
    id: templates.id,
    title: templates.title,
    trip_data: templates.trip_data
  })
  .from(templates)
  .where(inArray(templates.id, templateIds));
  
  console.log('\n=== TEMPLATE ACTIVITIES CHECK ===\n');
  
  for (const template of results) {
    const activities = template.trip_data?.activities || [];
    console.log(`Template ${template.id}: ${template.title}`);
    console.log(`  Activities: ${activities.length}`);
    if (activities.length > 0) {
      console.log(`  First activity: ${activities[0].title}`);
      console.log(`  Has coordinates: ${!!activities[0].latitude}`);
    }
    console.log('');
  }
  
  process.exit(0);
}

checkActivities().catch(console.error);