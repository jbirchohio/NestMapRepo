// Test script to check deleteActivity function
const { storage } = require('./server/storage-consumer');

async function testDelete() {
  try {
    console.log('Testing deleteActivity function...');
    
    // Try to delete a non-existent activity to see if the function works
    const result = await storage.deleteActivity(999999);
    console.log('Delete result for non-existent activity:', result);
    
    // Get all activities to see if any exist
    const activities = await storage.getActivitiesByTripId(1);
    console.log('Found activities:', activities.length);
    
    if (activities.length > 0) {
      const activityToDelete = activities[0];
      console.log('Attempting to delete activity:', activityToDelete.id);
      const deleteResult = await storage.deleteActivity(activityToDelete.id);
      console.log('Delete result:', deleteResult);
    }
  } catch (error) {
    console.error('Error testing delete:', error);
  }
  process.exit(0);
}

testDelete();