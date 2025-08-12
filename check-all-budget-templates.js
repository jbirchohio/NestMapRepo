import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { desc, or, like, eq } from 'drizzle-orm';

async function checkAllBudgetTemplates() {
  // Get templates by specific titles we created
  const budgetTemplates = await db.select()
    .from(templates)
    .where(
      or(
        like(templates.title, '%NYC on a Shoestring%'),
        like(templates.title, '%Vegas Without Gambling%'),
        like(templates.title, '%Miami Beach Vibes%'),
        like(templates.title, '%Keep Austin Weird%')
      )
    )
    .orderBy(desc(templates.id));

  console.log('\n=== OUR CREATED BUDGET TEMPLATES ===');
  console.log(`Total found: ${budgetTemplates.length}`);
  
  for (const template of budgetTemplates) {
    console.log('\n========================================');
    console.log(`TEMPLATE: ${template.title}`);
    console.log(`========================================`);
    console.log(`ID: ${template.id}`);
    console.log(`Slug: ${template.slug}`);
    console.log(`Price: $${template.price}`);
    console.log(`Duration: ${template.duration} days`);
    console.log(`Status: ${template.status}`);
    console.log(`Featured: ${template.featured}`);
    console.log(`AI Generated: ${template.ai_generated}`);
    
    // Check trip data structure
    if (template.trip_data) {
      const tripData = template.trip_data;
      
      // Budget Information
      if (tripData.budget) {
        console.log('\n✅ BUDGET INFORMATION:');
        console.log(`  Total Budget: $${tripData.budget.total} ${tripData.budget.currency}`);
        console.log(`  Daily Budget: $${tripData.budget.daily}/day`);
        console.log(`  Budget Level: ${tripData.budget.level}`);
        
        if (tripData.budget.breakdown) {
          console.log('\n  Category Breakdown:');
          Object.entries(tripData.budget.breakdown).forEach(([cat, amount]) => {
            console.log(`    - ${cat}: $${amount}`);
          });
        }
        
        if (tripData.budget.tips) {
          console.log('\n  Budget Tips Available:');
          console.log(`    - Money Saving: ${tripData.budget.tips.moneySaving?.length || 0} tips`);
          console.log(`    - Free Activities: ${tripData.budget.tips.freeActivities?.length || 0} activities`);
          console.log(`    - Splurge Worthy: ${tripData.budget.tips.splurgeWorthy?.length || 0} items`);
        }
      } else {
        console.log('\n❌ NO BUDGET INFORMATION');
      }
      
      // Activities Check
      console.log(`\n📍 ACTIVITIES: ${tripData.activities ? tripData.activities.length : 0} total`);
      
      if (tripData.activities && tripData.activities.length > 0) {
        // Sample first 3 activities
        const sampleActivities = tripData.activities.slice(0, 3);
        console.log('\n  First 3 Activities:');
        sampleActivities.forEach((act, idx) => {
          console.log(`\n  ${idx + 1}. ${act.title}`);
          console.log(`     Time: ${act.time || 'NO TIME'}`);
          console.log(`     Location: ${act.location_name || 'NO LOCATION'}`);
          console.log(`     Cost: ${act.price !== undefined ? `$${act.price}` : 'NO PRICE'}`);
          if (act.cost_notes) console.log(`     Cost Notes: ${act.cost_notes}`);
        });
        
        // Check if activities have coordinates (for map pins)
        const hasCoordinates = tripData.activities.some(act => 
          act.latitude !== undefined && act.longitude !== undefined
        );
        console.log(`\n  ⚠️ Activities have coordinates for map: ${hasCoordinates ? 'NO - Missing lat/lng' : 'YES'}`);
      }
    } else {
      console.log('\n❌ NO TRIP DATA');
    }
  }
  
  // Now let's test accessing one via API
  if (budgetTemplates.length > 0) {
    const firstTemplate = budgetTemplates[0];
    console.log('\n\n=== TESTING API ACCESS ===');
    console.log(`Fetching template via API: ${firstTemplate.slug}`);
    
    try {
      const response = await fetch(`http://localhost:5000/api/templates/${firstTemplate.slug}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Response OK');
        console.log(`  Title: ${data.title}`);
        console.log(`  Has tripData: ${data.tripData ? 'YES' : 'NO'}`);
        console.log(`  Has budget in tripData: ${data.tripData?.budget ? 'YES' : 'NO'}`);
      } else {
        console.log(`❌ API Error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ API Fetch Error: ${error.message}`);
    }
  }
  
  process.exit(0);
}

checkAllBudgetTemplates().catch(console.error);