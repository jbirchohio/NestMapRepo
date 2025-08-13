import 'dotenv/config';
import { storage } from './storage';

async function testEndpoint() {
  try {
    console.log('Testing storage.getActivitiesByTripId(106)...\n');
    
    const activities = await storage.getActivitiesByTripId(106);
    
    console.log(`Found ${activities.length} activities:`);
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. ${activity.title}`);
      console.log(`   ID: ${activity.id}`);
      console.log(`   Trip ID: ${activity.trip_id}`);
      console.log(`   Date: ${activity.date}`);
      console.log(`   Time: ${activity.time}`);
      console.log(`   Location Name: ${activity.location_name}`);
      console.log(`   Latitude: ${activity.latitude}`);
      console.log(`   Longitude: ${activity.longitude}`);
    });
    
    // Also test the trip fetch
    console.log('\n\nTesting storage.getTrip(106)...');
    const trip = await storage.getTrip(106);
    console.log('Trip found:', trip ? `"${trip.title}"` : 'NOT FOUND');
    console.log('User ID:', trip?.user_id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testEndpoint();