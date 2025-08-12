import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const templateActivities = {
  // Miami Beach template
  66: {
    activities: [
      { day: 1, title: 'South Beach Morning Walk', time: '7:00 AM', locationName: 'Ocean Drive and Collins Ave', latitude: 25.7804, longitude: -80.1300, price: 0, costNotes: 'FREE', notes: 'Start early to beat crowds. Great for photos.' },
      { day: 1, title: 'Hostel Check-in', time: '10:00 AM', locationName: '229 14th St, Miami Beach, FL', latitude: 25.7907, longitude: -80.1300, price: 25, costNotes: '$25/night dorm bed', notes: 'HI Miami Beach Hostel' },
      { day: 2, title: 'Free Beach Yoga', time: '7:30 AM', locationName: '3rd Street Beach', latitude: 25.7684, longitude: -80.1320, price: 0, costNotes: 'FREE', notes: 'Bring your own mat or towel' },
      { day: 2, title: 'Little Havana Walking Tour', time: '11:00 AM', locationName: 'SW 8th St & 15th Ave', latitude: 25.7653, longitude: -80.2194, price: 0, costNotes: 'FREE self-guided', notes: 'Try Cuban coffee for $2' },
      { day: 3, title: 'Wynwood Walls', time: '10:00 AM', locationName: '2520 NW 2nd Ave', latitude: 25.8010, longitude: -80.1993, price: 0, costNotes: 'FREE outdoor viewing', notes: 'Instagram paradise' },
      { day: 3, title: 'Happy Hour Tacos', time: '5:00 PM', locationName: 'Coyo Taco', latitude: 25.8000, longitude: -80.1990, price: 8, costNotes: '$2 tacos during happy hour', notes: '4-7pm daily' },
      { day: 4, title: 'Venetian Pool', time: '9:00 AM', locationName: '2701 De Soto Blvd, Coral Gables', latitude: 25.7460, longitude: -80.2785, price: 8, costNotes: '$8 Miami residents', notes: 'Historic swimming pool' },
      { day: 4, title: 'Bayfront Park Concert', time: '7:00 PM', locationName: '301 Biscayne Blvd', latitude: 25.7752, longitude: -80.1862, price: 0, costNotes: 'FREE concerts Friday nights', notes: 'Bring a blanket' },
      { day: 5, title: 'Matheson Hammock Beach', time: '9:00 AM', locationName: '9610 Old Cutler Rd', latitude: 25.6813, longitude: -80.2685, price: 5, costNotes: '$5 parking', notes: 'Hidden gem beach' },
      { day: 5, title: 'Sunset at Key Biscayne', time: '6:00 PM', locationName: 'Bill Baggs Cape Florida State Park', latitude: 25.6664, longitude: -80.1580, price: 8, costNotes: '$8 per vehicle', notes: 'Best sunset spot' }
    ]
  },
  
  // Vegas template
  65: {
    activities: [
      { day: 1, title: 'Fremont Street Experience', time: '7:00 PM', locationName: '425 Fremont Street', latitude: 36.1699, longitude: -115.1422, price: 0, costNotes: 'FREE to walk', notes: 'Free live music every night' },
      { day: 1, title: 'Container Park', time: '5:00 PM', locationName: '707 Fremont St', latitude: 36.1699, longitude: -115.1404, price: 0, costNotes: 'FREE entry', notes: 'Unique shopping from shipping containers' },
      { day: 2, title: 'Red Rock Canyon', time: '8:00 AM', locationName: 'Red Rock Canyon', latitude: 36.1354, longitude: -115.4264, price: 15, costNotes: '$15 per vehicle', notes: '13-mile scenic drive' },
      { day: 2, title: 'Bellagio Conservatory', time: '3:00 PM', locationName: '3600 S Las Vegas Blvd', latitude: 36.1121, longitude: -115.1767, price: 0, costNotes: 'FREE', notes: 'Changes seasonally' },
      { day: 2, title: 'Forum Shops Aquarium', time: '5:00 PM', locationName: '3500 S Las Vegas Blvd', latitude: 36.1180, longitude: -115.1740, price: 0, costNotes: 'FREE to view', notes: 'Feed the fish at 1:15 and 5:15pm' },
      { day: 3, title: 'Valley of Fire State Park', time: '7:00 AM', locationName: 'Valley of Fire Highway', latitude: 36.4424, longitude: -114.5178, price: 10, costNotes: '$10 per vehicle', notes: '1 hour drive, bring water' },
      { day: 3, title: 'Ellis Island Happy Hour', time: '5:00 PM', locationName: '4178 Koval Ln', latitude: 36.1150, longitude: -115.1620, price: 7, costNotes: '$7.99 steak special', notes: 'Best deal in Vegas' },
      { day: 4, title: 'Pinball Hall of Fame', time: '11:00 AM', locationName: '4925 Las Vegas Blvd S', latitude: 36.0955, longitude: -115.1761, price: 5, costNotes: '$5 in quarters', notes: 'Vintage pinball machines' },
      { day: 4, title: 'Welcome to Vegas Sign', time: '9:00 AM', locationName: '5100 Las Vegas Blvd S', latitude: 36.0822, longitude: -115.1730, price: 0, costNotes: 'FREE', notes: 'Go early to avoid crowds' }
    ]
  },
  
  // NYC template
  64: {
    activities: [
      { day: 1, title: 'Central Park Walk', time: '9:00 AM', locationName: 'Central Park', latitude: 40.7829, longitude: -73.9654, price: 0, costNotes: 'FREE', notes: 'Start at Columbus Circle' },
      { day: 1, title: 'Museum of Modern Art', time: '4:00 PM', locationName: '11 W 53rd St', latitude: 40.7614, longitude: -73.9776, price: 0, costNotes: 'FREE Fridays 4-8pm', notes: 'Get there by 3:30 to queue' },
      { day: 1, title: '$1 Pizza Slice', time: '12:00 PM', locationName: "Joe's Pizza", latitude: 40.7307, longitude: -74.0029, price: 3, costNotes: '$1-3 per slice', notes: 'Multiple locations' },
      { day: 2, title: 'Brooklyn Bridge Walk', time: '8:00 AM', locationName: 'Brooklyn Bridge', latitude: 40.7061, longitude: -73.9969, price: 0, costNotes: 'FREE', notes: 'Start from Brooklyn side' },
      { day: 2, title: 'High Line Park', time: '11:00 AM', locationName: 'High Line', latitude: 40.7480, longitude: -74.0048, price: 0, costNotes: 'FREE', notes: 'Elevated park on old rail line' },
      { day: 2, title: 'Chelsea Market', time: '1:00 PM', locationName: '75 9th Ave', latitude: 40.7424, longitude: -74.0060, price: 10, costNotes: '$10 for lunch', notes: 'Food hall with samples' },
      { day: 3, title: 'Staten Island Ferry', time: '10:00 AM', locationName: 'Whitehall Terminal', latitude: 40.7015, longitude: -74.0133, price: 0, costNotes: 'FREE', notes: 'Great Statue of Liberty views' },
      { day: 3, title: 'Times Square', time: '7:00 PM', locationName: 'Times Square', latitude: 40.7580, longitude: -73.9855, price: 0, costNotes: 'FREE', notes: 'Street performers everywhere' },
      { day: 3, title: 'Grand Central Terminal', time: '5:00 PM', locationName: '89 E 42nd St', latitude: 40.7527, longitude: -73.9772, price: 0, costNotes: 'FREE', notes: 'Beautiful architecture' }
    ]
  },
  
  // Portland template  
  74: {
    activities: [
      { day: 1, title: 'Washington Park', time: '9:00 AM', locationName: 'Washington Park', latitude: 45.5109, longitude: -122.7178, price: 0, costNotes: 'FREE', notes: 'Rose Garden and trails' },
      { day: 1, title: "Powell's City of Books", time: '11:00 AM', locationName: '1005 W Burnside St', latitude: 45.5228, longitude: -122.6812, price: 0, costNotes: 'FREE browsing', notes: 'Largest independent bookstore' },
      { day: 1, title: 'Food Cart Lunch', time: '12:30 PM', locationName: 'SW 10th & Alder', latitude: 45.5200, longitude: -122.6810, price: 8, costNotes: '$8 average meal', notes: 'Over 60 carts' },
      { day: 2, title: 'Forest Park Hike', time: '8:00 AM', locationName: 'Forest Park', latitude: 45.5579, longitude: -122.7623, price: 0, costNotes: 'FREE', notes: '80+ miles of trails' },
      { day: 2, title: 'Saturday Market', time: '11:00 AM', locationName: '2 SW Naito Pkwy', latitude: 45.5108, longitude: -122.6739, price: 0, costNotes: 'FREE entry', notes: 'Weekends only Mar-Dec' },
      { day: 2, title: 'Happy Hour Brewery', time: '4:00 PM', locationName: 'Deschutes Brewery', latitude: 45.5240, longitude: -122.6850, price: 12, costNotes: '$3 beers, $6 apps', notes: '3-6pm daily' },
      { day: 3, title: 'Lan Su Chinese Garden', time: '10:00 AM', locationName: '239 NW Everett St', latitude: 45.5249, longitude: -122.6706, price: 12, costNotes: '$12 admission', notes: 'Free tea included' },
      { day: 3, title: 'Pearl District Walk', time: '2:00 PM', locationName: 'Pearl District', latitude: 45.5320, longitude: -122.6850, price: 0, costNotes: 'FREE', notes: 'Art galleries and shops' },
      { day: 4, title: 'Mount Tabor Park', time: '9:00 AM', locationName: 'SE 60th & Salmon', latitude: 45.5120, longitude: -122.5980, price: 0, costNotes: 'FREE', notes: 'Extinct volcano park' },
      { day: 4, title: 'Hawthorne District', time: '12:00 PM', locationName: 'SE Hawthorne Blvd', latitude: 45.5122, longitude: -122.6150, price: 0, costNotes: 'FREE browsing', notes: 'Vintage shops and cafes' }
    ]
  }
};

async function fixTemplates() {
  console.log('Starting template activity fixes...\n');
  
  for (const [templateId, data] of Object.entries(templateActivities)) {
    const id = parseInt(templateId);
    
    // Get the current template
    const [template] = await db.select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);
    
    if (!template) {
      console.log(`Template ${id} not found, skipping...`);
      continue;
    }
    
    console.log(`Updating template ${id}: ${template.title}`);
    
    // Update trip_data with activities
    const currentTripData = template.trip_data || {};
    currentTripData.activities = data.activities.map((act, idx) => ({
      ...act,
      id: `activity-${idx}`,
      tripId: 0,
      order: idx,
      tag: act.price === 0 ? 'free' : 'budget',
      date: `Day ${act.day}`
    }));
    
    // Update the template
    await db.update(templates)
      .set({ 
        trip_data: currentTripData,
        updated_at: new Date()
      })
      .where(eq(templates.id, id));
    
    console.log(`  ✓ Added ${data.activities.length} activities`);
  }
  
  console.log('\n✅ All templates updated successfully!');
  process.exit(0);
}

fixTemplates().catch(console.error);