// Script to fix Hudson River Kayaking coordinates via API
async function fixHudsonRiverActivity() {
  try {
    // First, get all activities for the trip
    const response = await fetch('http://localhost:5000/api/activities/trip/452', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    
    const activities = await response.json();
    
    // Find Hudson River Kayaking activity
    const hudsonActivity = activities.find(a => a.title === 'Hudson River Kayaking');
    
    if (hudsonActivity) {
      console.log('Found Hudson River activity:', hudsonActivity);
      
      // Update with correct NYC coordinates for Hudson River Park
      const updateResponse = await fetch(`http://localhost:5000/api/activities/${hudsonActivity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          ...hudsonActivity,
          locationName: 'Hudson River Park, New York, NY',
          latitude: '40.7266',
          longitude: '-74.0096'
        })
      });
      
      const result = await updateResponse.json();
      console.log('Updated activity:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run in browser console
console.log('Copy and run this in browser console:');
console.log(fixHudsonRiverActivity.toString() + '\nfixHudsonRiverActivity();');