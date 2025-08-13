import 'dotenv/config';
import { db } from './db-connection';
import { activities, trips } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function checkDatabase() {
  try {
    console.log('Checking database...\n');
    
    // Count total activities
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(activities);
    console.log(`Total activities in database: ${count}`);
    
    // Get latest 10 trips
    const latestTrips = await db.select().from(trips).orderBy(desc(trips.id)).limit(10);
    console.log('\nLatest 10 trips:');
    
    for (const trip of latestTrips) {
      const tripActivities = await db.select().from(activities).where(eq(activities.trip_id, trip.id));
      console.log(`Trip ${trip.id}: "${trip.title}" - ${tripActivities.length} activities`);
      
      if (trip.id === 106 && tripActivities.length > 0) {
        console.log('  Activities for trip 106:');
        tripActivities.forEach(a => {
          console.log(`    - ${a.title} at ${a.location_name || 'no location'}`);
        });
      }
    }
    
    // Specifically check trip 106
    console.log('\n--- Checking Trip 106 specifically ---');
    const trip106Activities = await db.select().from(activities).where(eq(activities.trip_id, 106));
    console.log(`Found ${trip106Activities.length} activities for trip 106`);
    
    if (trip106Activities.length > 0) {
      console.log('Activities:');
      trip106Activities.forEach(activity => {
        console.log(`- ID: ${activity.id}`);
        console.log(`  Title: ${activity.title}`);
        console.log(`  Date: ${activity.date}`);
        console.log(`  Time: ${activity.time}`);
        console.log(`  Location: ${activity.location_name}`);
        console.log(`  Lat/Lng: ${activity.latitude}, ${activity.longitude}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();