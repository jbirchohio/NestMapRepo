import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { eq, like } from 'drizzle-orm';

const sfActivities = {
  duration: 5,
  activities: [
    // Day 1
    { day: 1, title: 'Golden Gate Bridge Walk', time: '8:00 AM', locationName: 'Golden Gate Bridge', latitude: 37.8199, longitude: -122.4783, price: 0, costNotes: 'FREE', notes: 'Walk halfway and back, 2 hours' },
    { day: 1, title: 'Crissy Field Beach', time: '10:30 AM', locationName: 'Crissy Field', latitude: 37.8037, longitude: -122.4668, price: 0, costNotes: 'FREE', notes: 'Beach with bridge views' },
    { day: 1, title: 'Palace of Fine Arts', time: '12:00 PM', locationName: 'Palace of Fine Arts', latitude: 37.8027, longitude: -122.4484, price: 0, costNotes: 'FREE', notes: 'Instagram paradise' },
    { day: 1, title: 'Fishermans Wharf Sea Lions', time: '2:00 PM', locationName: 'Pier 39', latitude: 37.8087, longitude: -122.4098, price: 0, costNotes: 'FREE', notes: 'Watch hundreds of sea lions' },
    { day: 1, title: 'Ghirardelli Square Samples', time: '4:00 PM', locationName: 'Ghirardelli Square', latitude: 37.8059, longitude: -122.4228, price: 3, costNotes: '$3 chocolate', notes: 'Free samples inside' },
    // Day 2
    { day: 2, title: 'Chinatown Walking Tour', time: '9:00 AM', locationName: 'Chinatown Gate', latitude: 37.7909, longitude: -122.4058, price: 0, costNotes: 'FREE self-guided', notes: 'Largest Chinatown outside Asia' },
    { day: 2, title: 'Dim Sum Breakfast', time: '10:30 AM', locationName: 'Good Mong Kok', latitude: 37.7945, longitude: -122.4076, price: 8, costNotes: '$8 dim sum', notes: 'Cheapest authentic dim sum' },
    { day: 2, title: 'Cable Car Museum', time: '12:00 PM', locationName: '1201 Mason St', latitude: 37.7947, longitude: -122.4116, price: 0, costNotes: 'FREE', notes: 'See how cable cars work' },
    { day: 2, title: 'Lombard Street', time: '2:00 PM', locationName: 'Lombard Street', latitude: 37.8021, longitude: -122.4187, price: 0, costNotes: 'FREE', notes: 'Crooked street photo op' },
    { day: 2, title: 'Coit Tower Views', time: '4:00 PM', locationName: 'Coit Tower', latitude: 37.8024, longitude: -122.4058, price: 0, costNotes: 'FREE outside views', notes: 'Skip paid elevator, walk around' },
    // Day 3
    { day: 3, title: 'Ferry Building Market', time: '9:00 AM', locationName: 'Ferry Building', latitude: 37.7955, longitude: -122.3937, price: 0, costNotes: 'FREE browsing', notes: 'Saturday farmers market' },
    { day: 3, title: 'Embarcadero Walk', time: '11:00 AM', locationName: 'Embarcadero', latitude: 37.7993, longitude: -122.3977, price: 0, costNotes: 'FREE', notes: 'Waterfront promenade' },
    { day: 3, title: 'Mission District Murals', time: '1:00 PM', locationName: 'Balmy Alley', latitude: 37.7517, longitude: -122.4123, price: 0, costNotes: 'FREE', notes: 'Most concentrated murals in SF' },
    { day: 3, title: 'Dolores Park', time: '3:00 PM', locationName: 'Dolores Park', latitude: 37.7596, longitude: -122.4269, price: 0, costNotes: 'FREE', notes: 'City views, local scene' },
    { day: 3, title: 'Castro District', time: '5:00 PM', locationName: 'Castro Street', latitude: 37.7609, longitude: -122.4350, price: 0, costNotes: 'FREE walking', notes: 'Historic LGBTQ neighborhood' },
    // Day 4
    { day: 4, title: 'Golden Gate Park', time: '9:00 AM', locationName: 'Golden Gate Park', latitude: 37.7694, longitude: -122.4862, price: 0, costNotes: 'FREE', notes: 'Larger than Central Park' },
    { day: 4, title: 'Japanese Tea Garden', time: '11:00 AM', locationName: 'Japanese Tea Garden', latitude: 37.7702, longitude: -122.4702, price: 7, costNotes: '$7 residents', notes: 'Free before 10am Mon/Wed/Fri' },
    { day: 4, title: 'California Academy of Sciences', time: '1:00 PM', locationName: '55 Music Concourse Dr', latitude: 37.7699, longitude: -122.4661, price: 15, costNotes: '$15 residents discount', notes: 'Neighborhood free days available' },
    { day: 4, title: 'Ocean Beach Sunset', time: '6:00 PM', locationName: 'Ocean Beach', latitude: 37.7594, longitude: -122.5107, price: 0, costNotes: 'FREE', notes: 'Best sunset in the city' },
    // Day 5
    { day: 5, title: 'Lands End Trail', time: '9:00 AM', locationName: 'Lands End Lookout', latitude: 37.7799, longitude: -122.5058, price: 0, costNotes: 'FREE', notes: 'Coastal trail with bridge views' },
    { day: 5, title: 'Sutro Baths Ruins', time: '11:00 AM', locationName: 'Sutro Baths', latitude: 37.7804, longitude: -122.5136, price: 0, costNotes: 'FREE', notes: 'Historic swimming complex ruins' },
    { day: 5, title: 'Haight-Ashbury', time: '1:00 PM', locationName: 'Haight Street', latitude: 37.7699, longitude: -122.4469, price: 0, costNotes: 'FREE browsing', notes: '1960s counterculture center' },
    { day: 5, title: 'Painted Ladies', time: '3:00 PM', locationName: 'Alamo Square', latitude: 37.7763, longitude: -122.4329, price: 0, costNotes: 'FREE', notes: 'Full House houses' },
    { day: 5, title: 'Twin Peaks Sunset', time: '6:30 PM', locationName: 'Twin Peaks', latitude: 37.7544, longitude: -122.4477, price: 0, costNotes: 'FREE', notes: '360-degree city views' }
  ]
};

async function addSFActivities() {
  console.log('Adding activities to SF template...\n');
  
  // Find SF template
  const [template] = await db.select()
    .from(templates)
    .where(like(templates.title, '%SF Broke%'))
    .limit(1);
  
  if (!template) {
    console.log('SF template not found');
    process.exit(1);
  }
  
  console.log(`Updating template ${template.id}: ${template.title}`);
  
  // Create days structure
  const days = [];
  for (let dayNum = 1; dayNum <= sfActivities.duration; dayNum++) {
    const dayActivities = sfActivities.activities.filter(a => a.day === dayNum);
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
  currentTripData.activities = sfActivities.activities.map((act, idx) => ({
    ...act,
    id: `activity-${idx}`,
    tripId: 0,
    order: idx,
    tag: act.price === 0 ? 'free' : 'budget',
    date: `Day ${act.day}`,
    locationName: act.locationName
  }));
  
  // Ensure budget info
  if (!currentTripData.budget) {
    currentTripData.budget = {
      total: 450, // $90/day x 5 days
      daily: 90,
      level: 'mid',
      currency: 'USD',
      breakdown: {
        accommodation: 160,
        food: 125,
        activities: 100,
        transportation: 45,
        shopping: 20
      },
      tips: {
        moneySaving: [
          'Many museums have free days for residents',
          'Muni passport for $5/day unlimited rides',
          'Eat in Chinatown for cheapest meals',
          'Happy hours 3-6pm at most bars'
        ],
        freeActivities: [
          'Golden Gate Bridge walk',
          'All city parks and beaches',
          'Street art in Mission District',
          'Cable Car Museum'
        ],
        splurgeWorthy: [
          'Alcatraz tour ($40)',
          'Cable car ride ($8)'
        ]
      }
    };
  }
  
  await db.update(templates)
    .set({ 
      trip_data: currentTripData,
      updated_at: new Date()
    })
    .where(eq(templates.id, template.id));
  
  console.log(`  ✓ Added ${sfActivities.activities.length} activities across ${sfActivities.duration} days`);
  console.log('\n✅ SF template updated!');
  process.exit(0);
}

addSFActivities().catch(console.error);