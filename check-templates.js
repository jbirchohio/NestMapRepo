import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { desc, like } from 'drizzle-orm';

async function checkTemplates() {
  // Get our budget templates
  const budgetTemplates = await db.select()
    .from(templates)
    .where(like(templates.title, '%Budget%'))
    .orderBy(desc(templates.id))
    .limit(10);

  console.log('\n=== BUDGET TEMPLATES FOUND ===');
  console.log(`Total found: ${budgetTemplates.length}`);
  
  for (const template of budgetTemplates) {
    console.log('\n-------------------');
    console.log(`ID: ${template.id}`);
    console.log(`Title: ${template.title}`);
    console.log(`Slug: ${template.slug}`);
    console.log(`Price: $${template.price}`);
    console.log(`Duration: ${template.duration} days`);
    console.log(`AI Generated: ${template.ai_generated}`);
    
    // Check trip data structure
    if (template.trip_data) {
      const tripData = template.trip_data;
      console.log('\nTrip Data Check:');
      console.log(`  - Has activities: ${tripData.activities ? tripData.activities.length : 0} activities`);
      console.log(`  - Has budget info: ${tripData.budget ? 'YES' : 'NO'}`);
      
      if (tripData.budget) {
        console.log(`  - Total Budget: $${tripData.budget.total}`);
        console.log(`  - Daily Budget: $${tripData.budget.daily}`);
        console.log(`  - Budget Level: ${tripData.budget.level}`);
        console.log(`  - Has breakdown: ${tripData.budget.breakdown ? 'YES' : 'NO'}`);
      }
      
      // Check first activity for location data
      if (tripData.activities && tripData.activities.length > 0) {
        const firstActivity = tripData.activities[0];
        console.log('\nFirst Activity Check:');
        console.log(`  - Title: ${firstActivity.title}`);
        console.log(`  - Has location: ${firstActivity.location_name ? 'YES' : 'NO'}`);
        console.log(`  - Has price: ${firstActivity.price !== undefined ? `$${firstActivity.price}` : 'NO'}`);
        console.log(`  - Has time: ${firstActivity.time ? firstActivity.time : 'NO'}`);
      }
    }
  }
  
  process.exit(0);
}

checkTemplates().catch(console.error);