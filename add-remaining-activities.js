import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { eq, like, and, or } from 'drizzle-orm';

const remainingTemplateActivities = {
  // DC Power Trip: Everything's Free
  'DC Power Trip': {
    duration: 3,
    activities: [
      // Day 1
      { day: 1, title: 'National Mall Walk', time: '8:00 AM', locationName: 'National Mall', latitude: 38.8899, longitude: -77.0091, price: 0, costNotes: 'FREE', notes: 'Start at Lincoln Memorial, walk to Capitol' },
      { day: 1, title: 'Smithsonian Natural History Museum', time: '10:00 AM', locationName: '10th St & Constitution Ave', latitude: 38.8913, longitude: -77.0261, price: 0, costNotes: 'FREE', notes: 'No tickets needed, just walk in' },
      { day: 1, title: 'National Gallery of Art', time: '1:00 PM', locationName: '6th & Constitution Ave NW', latitude: 38.8913, longitude: -77.0199, price: 0, costNotes: 'FREE', notes: 'Both East and West buildings free' },
      { day: 1, title: 'Washington Monument', time: '3:00 PM', locationName: '2 15th St NW', latitude: 38.8895, longitude: -77.0353, price: 0, costNotes: 'FREE with timed pass', notes: 'Reserve free tickets online in advance' },
      { day: 1, title: 'Kennedy Center Free Show', time: '6:00 PM', locationName: '2700 F St NW', latitude: 38.8957, longitude: -77.0558, price: 0, costNotes: 'FREE Millennium Stage', notes: 'Free performances daily at 6pm' },
      // Day 2
      { day: 2, title: 'Capitol Building Tour', time: '9:00 AM', locationName: 'US Capitol', latitude: 38.8899, longitude: -77.0091, price: 0, costNotes: 'FREE tour', notes: 'Book free tour online in advance' },
      { day: 2, title: 'Library of Congress', time: '11:00 AM', locationName: '101 Independence Ave SE', latitude: 38.8887, longitude: -77.0047, price: 0, costNotes: 'FREE', notes: 'Most beautiful building in DC' },
      { day: 2, title: 'Supreme Court', time: '1:00 PM', locationName: '1 First St NE', latitude: 38.8906, longitude: -77.0044, price: 0, costNotes: 'FREE', notes: 'Court sessions open to public' },
      { day: 2, title: 'Air and Space Museum', time: '2:30 PM', locationName: '600 Independence Ave SW', latitude: 38.8882, longitude: -77.0199, price: 0, costNotes: 'FREE', notes: 'Most visited museum in US' },
      { day: 2, title: 'Monuments by Moonlight', time: '7:00 PM', locationName: 'Lincoln Memorial', latitude: 38.8893, longitude: -77.0502, price: 0, costNotes: 'FREE self-guided', notes: 'Beautiful at night, less crowded' },
      // Day 3
      { day: 3, title: 'Arlington Cemetery', time: '9:00 AM', locationName: 'Arlington National Cemetery', latitude: 38.8783, longitude: -77.0687, price: 0, costNotes: 'FREE', notes: 'Changing of guard every hour' },
      { day: 3, title: 'Georgetown Waterfront', time: '12:00 PM', locationName: 'Georgetown Waterfront Park', latitude: 38.9016, longitude: -77.0639, price: 0, costNotes: 'FREE', notes: 'Great for people watching' },
      { day: 3, title: 'National Zoo', time: '2:00 PM', locationName: '3001 Connecticut Ave NW', latitude: 38.9296, longitude: -77.0497, price: 0, costNotes: 'FREE', notes: 'See the pandas!' },
      { day: 3, title: 'Dupont Circle Farmers Market', time: '5:00 PM', locationName: 'Dupont Circle', latitude: 38.9097, longitude: -77.0434, price: 5, costNotes: '$5 for snacks', notes: 'Sunday market with free samples' }
    ]
  },

  // Denver Mile High on a Low Budget
  'Mile High on a Low Budget': {
    duration: 3,
    activities: [
      // Day 1
      { day: 1, title: 'Red Rocks Amphitheatre', time: '8:00 AM', locationName: '18300 W Alameda Pkwy', latitude: 39.6654, longitude: -105.2057, price: 0, costNotes: 'FREE to visit', notes: 'Hike the trails, amazing views' },
      { day: 1, title: 'Downtown Art Walk', time: '11:00 AM', locationName: 'Santa Fe Art District', latitude: 39.7205, longitude: -104.9997, price: 0, costNotes: 'FREE', notes: 'First Fridays are best' },
      { day: 1, title: 'Union Station', time: '1:00 PM', locationName: '1701 Wynkoop St', latitude: 39.7525, longitude: -105.0002, price: 8, costNotes: '$8 for lunch', notes: 'Historic train station, cheap eats' },
      { day: 1, title: 'Brewery Tour', time: '3:00 PM', locationName: 'Great Divide Brewing', latitude: 39.7538, longitude: -104.9882, price: 10, costNotes: '$10 tour with samples', notes: '4 beer samples included' },
      { day: 1, title: '16th Street Mall', time: '6:00 PM', locationName: '16th Street Mall', latitude: 39.7433, longitude: -104.9949, price: 0, costNotes: 'FREE mall ride', notes: 'Free bus up and down the mall' },
      // Day 2
      { day: 2, title: 'City Park', time: '9:00 AM', locationName: 'City Park', latitude: 39.7476, longitude: -104.9490, price: 0, costNotes: 'FREE', notes: 'Largest park in Denver' },
      { day: 2, title: 'Denver Museum of Nature', time: '11:00 AM', locationName: '2001 Colorado Blvd', latitude: 39.7476, longitude: -104.9428, price: 8, costNotes: '$8 Denver residents', notes: 'Discounted for CO residents' },
      { day: 2, title: 'Cheesman Park', time: '2:00 PM', locationName: 'Cheesman Park', latitude: 39.7315, longitude: -104.9661, price: 0, costNotes: 'FREE', notes: 'Great city views' },
      { day: 2, title: 'RiNo Art District', time: '4:00 PM', locationName: 'River North Art District', latitude: 39.7597, longitude: -104.9862, price: 0, costNotes: 'FREE', notes: 'Street art and murals everywhere' },
      { day: 2, title: 'Happy Hour Food Trucks', time: '6:00 PM', locationName: 'Civic Center Park', latitude: 39.7393, longitude: -104.9888, price: 10, costNotes: '$10 dinner', notes: 'Rotating food trucks daily' },
      // Day 3
      { day: 3, title: 'Confluence Park', time: '9:00 AM', locationName: 'Confluence Park', latitude: 39.7549, longitude: -105.0072, price: 0, costNotes: 'FREE', notes: 'Where two rivers meet' },
      { day: 3, title: 'Denver Botanic Gardens', time: '11:00 AM', locationName: '1007 York St', latitude: 39.7322, longitude: -104.9610, price: 12, costNotes: '$12 residents', notes: 'Discounted for Denver residents' },
      { day: 3, title: 'Washington Park', time: '2:00 PM', locationName: 'Washington Park', latitude: 39.7001, longitude: -104.9719, price: 0, costNotes: 'FREE', notes: 'Two lakes, great for picnics' },
      { day: 3, title: 'Denver Public Library', time: '4:00 PM', locationName: '10 W 14th Ave', latitude: 39.7371, longitude: -104.9901, price: 0, costNotes: 'FREE', notes: 'Amazing architecture' }
    ]
  },

  // Keep Austin Weird on a Budget
  'Keep Austin Weird on a Budget': {
    duration: 4,
    activities: [
      // Day 1
      { day: 1, title: 'South Congress Avenue', time: '9:00 AM', locationName: 'South Congress Ave', latitude: 30.2515, longitude: -97.7496, price: 0, costNotes: 'FREE window shopping', notes: 'Quirky shops, food trucks' },
      { day: 1, title: 'I Love You So Much Mural', time: '10:30 AM', locationName: '1300 S Congress Ave', latitude: 30.2507, longitude: -97.7496, price: 0, costNotes: 'FREE', notes: 'Instagram famous spot' },
      { day: 1, title: 'Food Truck Lunch', time: '12:00 PM', locationName: 'South First Food Court', latitude: 30.2504, longitude: -97.7550, price: 8, costNotes: '$8 tacos', notes: 'Best tacos in Austin' },
      { day: 1, title: 'Zilker Park', time: '2:00 PM', locationName: 'Zilker Park', latitude: 30.2670, longitude: -97.7676, price: 0, costNotes: 'FREE', notes: '350 acres of green space' },
      { day: 1, title: 'Barton Springs Pool', time: '4:00 PM', locationName: '2201 Barton Springs Rd', latitude: 30.2641, longitude: -97.7706, price: 5, costNotes: '$5 residents', notes: 'Natural spring pool, 70°F year-round' },
      // Day 2
      { day: 2, title: 'Texas State Capitol', time: '9:00 AM', locationName: '1100 Congress Ave', latitude: 30.2747, longitude: -97.7403, price: 0, costNotes: 'FREE tour', notes: 'Free guided tours hourly' },
      { day: 2, title: 'Blanton Museum', time: '11:00 AM', locationName: '200 E MLK Jr Blvd', latitude: 30.2812, longitude: -97.7376, price: 0, costNotes: 'FREE Thursdays', notes: 'Free admission on Thursdays' },
      { day: 2, title: '6th Street Live Music', time: '7:00 PM', locationName: '6th Street', latitude: 30.2672, longitude: -97.7390, price: 0, costNotes: 'FREE shows', notes: 'No cover at many venues' },
      { day: 2, title: 'Rainey Street Happy Hour', time: '5:00 PM', locationName: 'Rainey Street', latitude: 30.2592, longitude: -97.7390, price: 10, costNotes: '$10 drinks/apps', notes: 'Historic houses turned bars' },
      { day: 2, title: 'Graffiti Park', time: '3:00 PM', locationName: 'HOPE Outdoor Gallery', latitude: 30.2764, longitude: -97.7533, price: 0, costNotes: 'FREE', notes: 'Legal graffiti walls' },
      // Day 3
      { day: 3, title: 'Mount Bonnell', time: '8:00 AM', locationName: '3800 Mt Bonnell Rd', latitude: 30.3216, longitude: -97.7734, price: 0, costNotes: 'FREE', notes: 'Best sunrise views in Austin' },
      { day: 3, title: 'Lady Bird Lake Trail', time: '10:00 AM', locationName: 'Ann and Roy Butler Trail', latitude: 30.2596, longitude: -97.7503, price: 0, costNotes: 'FREE', notes: '10-mile trail around lake' },
      { day: 3, title: 'East Austin Food', time: '12:00 PM', locationName: 'East 6th Street', latitude: 30.2633, longitude: -97.7287, price: 10, costNotes: '$10 lunch', notes: 'Authentic Mexican food' },
      { day: 3, title: 'Mayfield Park', time: '2:00 PM', locationName: '3505 W 35th St', latitude: 30.3127, longitude: -97.7704, price: 0, costNotes: 'FREE', notes: 'Peacocks roam freely' },
      { day: 3, title: 'Bat Bridge Watching', time: '7:30 PM', locationName: 'Congress Ave Bridge', latitude: 30.2618, longitude: -97.7451, price: 0, costNotes: 'FREE', notes: '1.5 million bats at sunset' },
      // Day 4
      { day: 4, title: 'Farmers Market', time: '9:00 AM', locationName: 'Republic Square', latitude: 30.2676, longitude: -97.7474, price: 5, costNotes: '$5 samples', notes: 'Saturday market' },
      { day: 4, title: 'McKinney Falls', time: '11:00 AM', locationName: 'McKinney Falls State Park', latitude: 30.1836, longitude: -97.7223, price: 6, costNotes: '$6 entry', notes: 'Swimming holes and trails' },
      { day: 4, title: 'Domain Shopping', time: '3:00 PM', locationName: 'The Domain', latitude: 30.4019, longitude: -97.7481, price: 0, costNotes: 'FREE browsing', notes: 'Upscale outdoor mall' }
    ]
  },

  // NOLA Jazz & Soul for Less
  'NOLA Jazz & Soul for Less': {
    duration: 4,
    activities: [
      // Day 1
      { day: 1, title: 'French Quarter Walking Tour', time: '9:00 AM', locationName: 'Jackson Square', latitude: 29.9575, longitude: -90.0633, price: 0, costNotes: 'FREE self-guided', notes: 'Start at Jackson Square' },
      { day: 1, title: 'St. Louis Cathedral', time: '10:30 AM', locationName: '615 Pere Antoine Alley', latitude: 29.9581, longitude: -90.0632, price: 0, costNotes: 'FREE to enter', notes: 'Oldest cathedral in US' },
      { day: 1, title: 'French Market', time: '12:00 PM', locationName: 'French Market', latitude: 29.9610, longitude: -90.0607, price: 8, costNotes: '$8 po-boy', notes: 'Cheap local food' },
      { day: 1, title: 'Royal Street Music', time: '2:00 PM', locationName: 'Royal Street', latitude: 29.9574, longitude: -90.0650, price: 0, costNotes: 'FREE street performers', notes: 'Best buskers in the city' },
      { day: 1, title: 'Bourbon Street', time: '7:00 PM', locationName: 'Bourbon Street', latitude: 29.9592, longitude: -90.0694, price: 10, costNotes: '$10 for drinks', notes: 'People watching paradise' },
      // Day 2
      { day: 2, title: 'Garden District Walk', time: '9:00 AM', locationName: 'Garden District', latitude: 29.9297, longitude: -90.0847, price: 0, costNotes: 'FREE', notes: 'Historic mansions' },
      { day: 2, title: 'Lafayette Cemetery', time: '11:00 AM', locationName: '1400 Washington Ave', latitude: 29.9285, longitude: -90.0850, price: 0, costNotes: 'FREE', notes: 'Above-ground tombs' },
      { day: 2, title: 'Magazine Street', time: '1:00 PM', locationName: 'Magazine Street', latitude: 29.9246, longitude: -90.0873, price: 10, costNotes: '$10 lunch', notes: '6 miles of shops and cafes' },
      { day: 2, title: 'Audubon Park', time: '3:00 PM', locationName: 'Audubon Park', latitude: 29.9316, longitude: -90.1232, price: 0, costNotes: 'FREE', notes: 'Ancient oak trees' },
      { day: 2, title: 'Frenchmen Street Jazz', time: '8:00 PM', locationName: 'Frenchmen Street', latitude: 29.9638, longitude: -90.0577, price: 0, costNotes: 'FREE at most venues', notes: 'Better than Bourbon St' },
      // Day 3
      { day: 3, title: 'City Park', time: '9:00 AM', locationName: 'City Park', latitude: 29.9934, longitude: -90.0980, price: 0, costNotes: 'FREE', notes: '1300 acres, larger than Central Park' },
      { day: 3, title: 'Beignets at Morning Call', time: '11:00 AM', locationName: 'City Park', latitude: 29.9934, longitude: -90.0900, price: 4, costNotes: '$4 beignets', notes: 'Cheaper than Cafe du Monde' },
      { day: 3, title: 'Sculpture Garden', time: '1:00 PM', locationName: 'Sydney and Walda Besthoff Garden', latitude: 29.9859, longitude: -90.0928, price: 0, costNotes: 'FREE', notes: '60+ sculptures' },
      { day: 3, title: 'Bayou St. John', time: '3:00 PM', locationName: 'Bayou St. John', latitude: 29.9786, longitude: -90.0853, price: 0, costNotes: 'FREE', notes: 'Local hangout spot' },
      { day: 3, title: 'Second Line Parade', time: '5:00 PM', locationName: 'Treme', latitude: 29.9684, longitude: -90.0792, price: 0, costNotes: 'FREE to watch', notes: 'Check schedule for Sunday parades' },
      // Day 4
      { day: 4, title: 'Warehouse District', time: '10:00 AM', locationName: 'Arts District', latitude: 29.9436, longitude: -90.0681, price: 0, costNotes: 'FREE galleries', notes: 'Art galleries everywhere' },
      { day: 4, title: 'WWII Museum', time: '12:00 PM', locationName: '945 Magazine St', latitude: 29.9435, longitude: -90.0707, price: 10, costNotes: '$10 LA residents', notes: 'Discounted for locals' },
      { day: 4, title: 'Algiers Point Ferry', time: '3:00 PM', locationName: 'Canal St Ferry', latitude: 29.9539, longitude: -90.0639, price: 0, costNotes: 'FREE', notes: 'Best skyline views' },
      { day: 4, title: 'Congo Square', time: '5:00 PM', locationName: 'Louis Armstrong Park', latitude: 29.9632, longitude: -90.0687, price: 0, costNotes: 'FREE', notes: 'Birthplace of jazz' }
    ]
  },

  // Seattle Sleepless & Cheap
  'Seattle Sleepless & Cheap': {
    duration: 3,
    activities: [
      // Day 1
      { day: 1, title: 'Pike Place Market', time: '8:00 AM', locationName: 'Pike Place Market', latitude: 47.6097, longitude: -122.3425, price: 0, costNotes: 'FREE to browse', notes: 'Watch fish throwing, get samples' },
      { day: 1, title: 'Original Starbucks', time: '9:30 AM', locationName: '1912 Pike Pl', latitude: 47.6100, longitude: -122.3426, price: 4, costNotes: '$4 coffee', notes: 'Historic first store' },
      { day: 1, title: 'Waterfront Walk', time: '11:00 AM', locationName: 'Seattle Waterfront', latitude: 47.6062, longitude: -122.3425, price: 0, costNotes: 'FREE', notes: 'Great Wheel views' },
      { day: 1, title: 'Pioneer Square', time: '1:00 PM', locationName: 'Pioneer Square', latitude: 47.6021, longitude: -122.3319, price: 8, costNotes: '$8 lunch', notes: 'Historic neighborhood' },
      { day: 1, title: 'Seattle Central Library', time: '3:00 PM', locationName: '1000 4th Ave', latitude: 47.6062, longitude: -122.3321, price: 0, costNotes: 'FREE', notes: 'Architectural wonder' },
      { day: 1, title: 'Kerry Park Sunset', time: '7:00 PM', locationName: '211 W Highland Dr', latitude: 47.6295, longitude: -122.3599, price: 0, costNotes: 'FREE', notes: 'Best skyline views' },
      // Day 2
      { day: 2, title: 'Discovery Park', time: '9:00 AM', locationName: '3801 Discovery Park Blvd', latitude: 47.6573, longitude: -122.4058, price: 0, costNotes: 'FREE', notes: '534 acres, lighthouse trail' },
      { day: 2, title: 'Ballard Locks', time: '11:30 AM', locationName: '3015 NW 54th St', latitude: 47.6654, longitude: -122.3978, price: 0, costNotes: 'FREE', notes: 'Watch salmon and boats' },
      { day: 2, title: 'Fremont Troll', time: '1:30 PM', locationName: 'N 36th St', latitude: 47.6506, longitude: -122.3473, price: 0, costNotes: 'FREE', notes: 'Under Aurora Bridge' },
      { day: 2, title: 'Gas Works Park', time: '3:00 PM', locationName: '2101 N Northlake Way', latitude: 47.6456, longitude: -122.3344, price: 0, costNotes: 'FREE', notes: 'Unique industrial park' },
      { day: 2, title: 'Capitol Hill Happy Hour', time: '5:00 PM', locationName: 'Capitol Hill', latitude: 47.6252, longitude: -122.3207, price: 12, costNotes: '$12 drinks/apps', notes: 'Trendy neighborhood' },
      // Day 3
      { day: 3, title: 'International District', time: '9:00 AM', locationName: 'Chinatown-ID', latitude: 47.5981, longitude: -122.3264, price: 0, costNotes: 'FREE walking', notes: 'Asian culture hub' },
      { day: 3, title: 'Wing Luke Museum', time: '10:30 AM', locationName: '719 S King St', latitude: 47.5982, longitude: -122.3234, price: 8, costNotes: '$8 students', notes: 'Asian Pacific American history' },
      { day: 3, title: 'Dim Sum Lunch', time: '12:00 PM', locationName: 'Jade Garden', latitude: 47.5974, longitude: -122.3252, price: 10, costNotes: '$10 dim sum', notes: 'Authentic and cheap' },
      { day: 3, title: 'Volunteer Park', time: '2:00 PM', locationName: 'Volunteer Park', latitude: 47.6301, longitude: -122.3147, price: 0, costNotes: 'FREE', notes: 'Conservatory and water tower' },
      { day: 3, title: 'Green Lake Walk', time: '4:00 PM', locationName: 'Green Lake Park', latitude: 47.6813, longitude: -122.3287, price: 0, costNotes: 'FREE', notes: '2.8 mile path around lake' }
    ]
  }
};

async function addRemainingActivities() {
  console.log('Adding activities to remaining budget templates...\n');
  
  for (const [templateTitle, data] of Object.entries(remainingTemplateActivities)) {
    // Find template by title pattern
    const [template] = await db.select()
      .from(templates)
      .where(like(templates.title, `%${templateTitle}%`))
      .limit(1);
    
    if (!template) {
      console.log(`Template containing "${templateTitle}" not found, skipping...`);
      continue;
    }
    
    console.log(`Updating template ${template.id}: ${template.title}`);
    
    // Create days structure
    const days = [];
    for (let dayNum = 1; dayNum <= data.duration; dayNum++) {
      const dayActivities = data.activities.filter(a => a.day === dayNum);
      days.push({
        title: `Day ${dayNum}`,
        date: dayNum,
        activities: dayActivities.map(act => ({
          title: act.title,
          time: act.time,
          location: act.locationName,
          latitude: act.latitude,
          longitude: act.longitude,
          notes: act.notes,
          price: act.price,
          costNotes: act.costNotes
        }))
      });
    }
    
    // Update trip_data
    const currentTripData = template.trip_data || {};
    currentTripData.days = days;
    currentTripData.activities = data.activities.map((act, idx) => ({
      ...act,
      id: `activity-${idx}`,
      tripId: 0,
      order: idx,
      tag: act.price === 0 ? 'free' : 'budget',
      date: `Day ${act.day}`,
      locationName: act.locationName
    }));
    
    // Ensure budget info exists
    if (!currentTripData.budget) {
      const totalBudget = data.duration * 60; // $60/day average
      currentTripData.budget = {
        total: totalBudget,
        daily: 60,
        level: 'budget',
        currency: 'USD',
        breakdown: {
          accommodation: Math.round(totalBudget * 0.35),
          food: Math.round(totalBudget * 0.25),
          activities: Math.round(totalBudget * 0.25),
          transportation: Math.round(totalBudget * 0.10),
          shopping: Math.round(totalBudget * 0.05)
        }
      };
    }
    
    await db.update(templates)
      .set({ 
        trip_data: currentTripData,
        updated_at: new Date()
      })
      .where(eq(templates.id, template.id));
    
    console.log(`  ✓ Added ${data.activities.length} activities across ${data.duration} days`);
  }
  
  console.log('\n✅ All remaining templates updated!');
  process.exit(0);
}

addRemainingActivities().catch(console.error);