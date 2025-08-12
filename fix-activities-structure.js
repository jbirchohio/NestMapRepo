import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function fixActivitiesStructure() {
  console.log('Fixing activities structure for templates...\n');
  
  const templateIds = [64, 65, 66, 74];
  
  const results = await db.select()
    .from(templates)
    .where(inArray(templates.id, templateIds));
  
  for (const template of results) {
    if (!template.trip_data?.activities || template.trip_data.activities.length === 0) {
      console.log(`Skipping ${template.id}: No activities to fix`);
      continue;
    }
    
    console.log(`Fixing template ${template.id}: ${template.title}`);
    
    const activities = template.trip_data.activities;
    const days = [];
    
    // Group activities by day
    const dayGroups = {};
    activities.forEach(activity => {
      const dayNum = activity.day || 1;
      if (!dayGroups[dayNum]) {
        dayGroups[dayNum] = [];
      }
      dayGroups[dayNum].push(activity);
    });
    
    // Create days structure
    for (let dayNum = 1; dayNum <= template.duration; dayNum++) {
      const dayActivities = dayGroups[dayNum] || [];
      days.push({
        title: `Day ${dayNum}`,
        date: dayNum,
        activities: dayActivities.map(act => ({
          title: act.title,
          time: act.time || '9:00 AM',
          location: act.locationName || act.location_name || '',
          latitude: act.latitude,
          longitude: act.longitude,
          notes: act.notes || '',
          price: act.price || 0,
          costNotes: act.costNotes || act.cost_notes || ''
        }))
      });
    }
    
    // Update trip_data with the new structure
    const updatedTripData = {
      ...template.trip_data,
      days: days,
      // Keep activities array as well for backward compatibility
      activities: activities
    };
    
    await db.update(templates)
      .set({ 
        trip_data: updatedTripData,
        updated_at: new Date()
      })
      .where(eq(templates.id, template.id));
    
    console.log(`  ✓ Fixed structure for ${days.length} days with ${activities.length} total activities`);
  }
  
  console.log('\n✅ All templates structure fixed!');
  process.exit(0);
}

fixActivitiesStructure().catch(console.error);