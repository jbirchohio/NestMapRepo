import 'dotenv/config';
import { db } from './db-connection';
import { templates } from '@shared/schema';
import { desc } from 'drizzle-orm';

async function checkLatestTemplate() {
  try {
    // Get the most recent template
    const [latestTemplate] = await db
      .select()
      .from(templates)
      .orderBy(desc(templates.created_at))
      .limit(1);
    
    if (!latestTemplate) {
      console.log('No templates found');
      return;
    }
    
    console.log('Latest Template:');
    console.log('  ID:', latestTemplate.id);
    console.log('  Title:', latestTemplate.title);
    console.log('  Created:', latestTemplate.created_at);
    console.log('');
    
    console.log('Trip Data:');
    const tripData = latestTemplate.trip_data as any;
    if (tripData) {
      console.log('  Has trip_data:', !!tripData);
      console.log('  Activities count:', tripData.activities?.length || 0);
      
      if (tripData.activities && tripData.activities.length > 0) {
        console.log('\n  First 3 activities:');
        tripData.activities.slice(0, 3).forEach((activity: any, i: number) => {
          console.log(`    ${i + 1}. ${activity.title}`);
          console.log(`       Date: ${activity.date}`);
          console.log(`       Time: ${activity.time}`);
          console.log(`       Location: ${activity.location_name || activity.locationName || 'N/A'}`);
        });
      } else {
        console.log('  ⚠️  No activities in trip_data!');
      }
      
      console.log('\n  Trip data keys:', Object.keys(tripData));
    } else {
      console.log('  ⚠️  No trip_data stored!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkLatestTemplate();