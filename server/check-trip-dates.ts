import 'dotenv/config';
import { db } from './db-connection';
import { trips, activities } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkTripDates() {
  try {
    // Get trip 106
    const [trip] = await db.select().from(trips).where(eq(trips.id, 106));
    
    console.log('Trip 106 Details:');
    console.log('  Title:', trip.title);
    console.log('  Start Date:', trip.start_date);
    console.log('  End Date:', trip.end_date);
    console.log('');
    
    // Get activities for trip 106
    const tripActivities = await db.select().from(activities).where(eq(activities.trip_id, 106));
    
    console.log('Activities for Trip 106:');
    tripActivities.forEach(activity => {
      console.log(`  - ${activity.title}`);
      console.log(`    Date: ${activity.date}`);
    });
    
    console.log('\n⚠️  Issue Found:');
    console.log('Trip dates:', trip.start_date, 'to', trip.end_date);
    console.log('Activity dates: 2023-09-08 to 2023-09-11');
    console.log('\nThe activities have different dates than the trip!');
    console.log('This is why they are not showing up - the frontend filters activities by trip date.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTripDates();