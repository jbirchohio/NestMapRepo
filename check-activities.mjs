import { db } from './server/db-connection.js';
import { activities, trips } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';

async function checkActivities() {
  try {
    // Check trip 106
    const trip106 = await db.select().from(trips).where(eq(trips.id, 106));
    console.log('Trip 106:', trip106);
    
    // Get all activities for trip 106
    const trip106Activities = await db.select().from(activities).where(eq(activities.trip_id, 106));
    console.log(`\nActivities for trip 106 (${trip106Activities.length} total):`);
    trip106Activities.forEach(activity => {
      console.log(`- ${activity.title} (${activity.date} ${activity.time})`);
      console.log(`  Location: ${activity.location_name}`);
      console.log(`  Coordinates: ${activity.latitude}, ${activity.longitude}`);
    });
    
    // Also check the latest trips and their activities
    const latestTrips = await db.select().from(trips).orderBy(desc(trips.id)).limit(5);
    console.log('\n\nLatest 5 trips:');
    for (const trip of latestTrips) {
      const activitiesForTrip = await db.select().from(activities).where(eq(activities.trip_id, trip.id));
      console.log(`Trip ${trip.id}: "${trip.title}" - ${activitiesForTrip.length} activities`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkActivities();