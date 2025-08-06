import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { 
  users, 
  trips, 
  activities, 
  templates, 
  creatorProfiles,
  templateReviews 
} from '../shared/schema';

dotenv.config();

// Use Railway URL directly for seeding
const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

const pool = new Pool({
  connectionString: RAILWAY_URL,
});

const db = drizzle(pool);

// 10 Diverse Travel Influencer Personas
const creators = [
  {
    username: 'luxe_wanderer',
    email: 'sarah@luxewanderer.com',
    displayName: 'Sarah Chen',
    bio: 'Luxury travel connoisseur. I find the best hotels, spas, and fine dining experiences around the world. Former Conde Nast editor.',
    style: 'luxury',
    avatar: 'https://i.pravatar.cc/150?img=1',
    verified: true,
    socialInstagram: '@luxe_wanderer',
    socialTwitter: '@sarahchenluxe',
    websiteUrl: 'https://luxewanderer.com'
  },
  {
    username: 'budget_backpacker',
    email: 'mike@budgetbackpacker.com', 
    displayName: 'Mike Rodriguez',
    bio: 'Proving you can see the world on $50/day. Hostels, street food, and local transport expert. 72 countries and counting!',
    style: 'budget',
    avatar: 'https://i.pravatar.cc/150?img=3',
    verified: true,
    socialInstagram: '@budget_backpacker',
    socialTwitter: '@mikebackpacks'
  },
  {
    username: 'family_adventures',
    email: 'jennifer@familyadventures.com',
    displayName: 'Jennifer & Tom Wilson',
    bio: 'Parents of 3, showing families how to explore together. Kid-friendly activities, family resorts, and stress-free travel tips.',
    style: 'family',
    avatar: 'https://i.pravatar.cc/150?img=5',
    verified: true,
    socialInstagram: '@wilsonfamilyadventures',
    websiteUrl: 'https://familyadventures.blog'
  },
  {
    username: 'foodie_traveler',
    email: 'carlos@foodietraveler.com',
    displayName: 'Carlos Mendoza',
    bio: 'Michelin-starred restaurants to street food gems. Former chef turned food travel writer. James Beard Award nominee.',
    style: 'foodie',
    avatar: 'https://i.pravatar.cc/150?img=7',
    verified: true,
    socialInstagram: '@foodie_traveler',
    socialTwitter: '@carlosfoodtravel'
  },
  {
    username: 'adventure_seeker',
    email: 'emma@adventureseeker.com',
    displayName: 'Emma Thompson',
    bio: 'Rock climber, skydiver, and thrill seeker. If it gets your adrenaline pumping, I\'ve probably done it!',
    style: 'adventure',
    avatar: 'https://i.pravatar.cc/150?img=9',
    verified: true,
    socialInstagram: '@emma_adventures',
    websiteUrl: 'https://adventureseeker.co'
  },
  {
    username: 'culture_explorer',
    email: 'raj@cultureexplorer.com',
    displayName: 'Raj Patel',
    bio: 'Anthropologist and cultural enthusiast. Museums, historical sites, and local traditions. Making history come alive!',
    style: 'cultural',
    avatar: 'https://i.pravatar.cc/150?img=11',
    verified: true,
    socialInstagram: '@culture_with_raj',
    socialTwitter: '@rajexplores'
  },
  {
    username: 'eco_traveler',
    email: 'maya@ecotraveler.com',
    displayName: 'Maya Green',
    bio: 'Sustainable travel advocate. Eco-lodges, conservation projects, and carbon-neutral adventures. Travel responsibly!',
    style: 'eco',
    avatar: 'https://i.pravatar.cc/150?img=20',
    verified: true,
    socialInstagram: '@eco_maya',
    websiteUrl: 'https://ecotraveler.org'
  },
  {
    username: 'solo_female',
    email: 'aisha@solofemale.com',
    displayName: 'Aisha Johnson',
    bio: 'Empowering women to explore solo. Safety tips, solo-friendly destinations, and confidence-building adventures.',
    style: 'solo',
    avatar: 'https://i.pravatar.cc/150?img=16',
    verified: true,
    socialInstagram: '@solo_aisha',
    socialTwitter: '@aishasolotravel'
  },
  {
    username: 'digital_nomad',
    email: 'alex@digitalnomad.com',
    displayName: 'Alex Kim',
    bio: 'Working remotely from 30+ countries. Best cafes, co-working spaces, and long-term stay tips. Software engineer by trade.',
    style: 'nomad',
    avatar: 'https://i.pravatar.cc/150?img=12',
    verified: true,
    socialInstagram: '@nomad_alex',
    websiteUrl: 'https://digitalnomadlife.io'
  },
  {
    username: 'wellness_wanderer',
    email: 'sophia@wellnesswanderer.com',
    displayName: 'Sophia Martinez',
    bio: 'Yoga retreats, spa getaways, and mindful travel. Certified yoga instructor and wellness coach. Find your zen anywhere!',
    style: 'wellness',
    avatar: 'https://i.pravatar.cc/150?img=21',
    verified: true,
    socialInstagram: '@wellness_sophia',
    socialTwitter: '@sophiawellness'
  }
];

// Template data for each creator
const templateData = [
  // Sarah Chen - Luxury Travel (3 trips/year)
  {
    creator: 'luxe_wanderer',
    templates: [
      {
        title: 'NYC Luxury Long Weekend',
        description: 'Experience Manhattan\'s finest hotels, Michelin-starred dining, and exclusive shopping in just 4 days.',
        price: 49.99,
        destinations: ['New York City', 'Manhattan', 'USA'],
        duration: 4,
        tags: ['luxury', 'city-break', 'fine-dining', 'shopping', 'hotels'],
        itinerary: {
          city: 'New York City',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '15:00', title: 'Check-in at The St. Regis New York', locationName: 'The St. Regis New York', latitude: 40.7614, longitude: -73.9776, notes: 'Request a Central Park view room. Complimentary champagne on arrival.' },
                { time: '17:00', title: 'Afternoon Tea at The Plaza', locationName: 'The Plaza Hotel', latitude: 40.7644, longitude: -73.9747, notes: 'Book the Palm Court. Dress code: smart casual.' },
                { time: '20:00', title: 'Dinner at Eleven Madison Park', locationName: 'Eleven Madison Park', latitude: 40.7415, longitude: -73.9870, notes: '10-course tasting menu. Reservations essential 3 months in advance.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Private Shopping at Bergdorf Goodman', locationName: 'Bergdorf Goodman', latitude: 40.7639, longitude: -73.9727, notes: 'Personal shopper appointment included. Complimentary alterations.' },
                { time: '12:30', title: 'Lunch at The Modern', locationName: 'The Modern', latitude: 40.7608, longitude: -73.9779, notes: 'MoMA\'s 2-Michelin star restaurant. Request terrace seating.' },
                { time: '15:00', title: 'Spa at The Mandarin Oriental', locationName: 'Mandarin Oriental New York', latitude: 40.7693, longitude: -73.9836, notes: 'Book the Time Ritual spa package. Arrive 30 mins early for facilities.' },
                { time: '20:00', title: 'Broadway Show & Champagne', locationName: 'Theater District', latitude: 40.7590, longitude: -73.9845, notes: 'Premium seats for current hit show. Pre-theater champagne at Baccarat Hotel.' }
              ]
            },
            {
              date: 3, 
              activities: [
                { time: '10:00', title: 'Private Helicopter Tour', locationName: 'Downtown Manhattan Heliport', latitude: 40.7015, longitude: -74.0090, notes: '30-minute doors-off photography tour. Weather dependent.' },
                { time: '13:00', title: 'Lunch at Le Bernardin', locationName: 'Le Bernardin', latitude: 40.7615, longitude: -73.9819, notes: '3-Michelin stars. Seafood tasting menu with wine pairing.' },
                { time: '16:00', title: 'Private Art Tour at MET', locationName: 'The Metropolitan Museum of Art', latitude: 40.7794, longitude: -73.9632, notes: 'Curator-led tour of highlights. Skip-the-line access.' },
                { time: '20:00', title: 'Cocktails at The Press Lounge', locationName: 'The Press Lounge', latitude: 40.7511, longitude: -73.9983, notes: 'Rooftop bar with panoramic views. Sunset timing perfect.' }
              ]
            },
            {
              date: 4,
              activities: [
                { time: '10:00', title: 'Brunch at Balthazar', locationName: 'Balthazar', latitude: 40.7227, longitude: -73.9988, notes: 'SoHo institution. Try the eggs Benedict and bloody mary.' },
                { time: '12:00', title: 'Gallery Hopping in Chelsea', locationName: 'Chelsea Art District', latitude: 40.7465, longitude: -74.0058, notes: 'Visit Gagosian, Pace, and David Zwirner galleries.' },
                { time: '14:00', title: 'Late checkout & Departure', locationName: 'The St. Regis New York', latitude: 40.7614, longitude: -73.9776, notes: 'Arrange car service to airport. Use Centurion Lounge if flying.' }
              ]
            }
          ]
        }
      },
      {
        title: 'San Francisco Wine Country Escape',
        description: 'Combine city sophistication with Napa Valley\'s finest wineries. A perfect blend of urban luxury and wine country charm.',
        price: 59.99,
        destinations: ['San Francisco', 'Napa Valley', 'California', 'USA'],
        duration: 5,
        tags: ['luxury', 'wine', 'fine-dining', 'hotels', 'spa'],
        itinerary: {
          city: 'San Francisco',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in at Four Seasons San Francisco', locationName: 'Four Seasons Hotel', latitude: 37.7866, longitude: -122.4049, notes: 'Club Level room with lounge access. Complimentary wine hour at 5pm.' },
                { time: '16:00', title: 'Spa Treatment', locationName: 'Four Seasons Spa', latitude: 37.7866, longitude: -122.4049, notes: 'Book the jet lag recovery treatment.' },
                { time: '19:30', title: 'Dinner at Atelier Crenn', locationName: 'Atelier Crenn', latitude: 37.7982, longitude: -122.4369, notes: '3-Michelin stars. Poetic culinaire menu. Reserve months ahead.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Private Driver to Napa', locationName: 'Four Seasons Hotel', latitude: 37.7866, longitude: -122.4049, notes: 'Mercedes S-Class with champagne service.' },
                { time: '11:00', title: 'Opus One Winery Tour', locationName: 'Opus One Winery', latitude: 38.4394, longitude: -122.3966, notes: 'Private tour and tasting. Library wine access.' },
                { time: '13:00', title: 'Lunch at French Laundry', locationName: 'The French Laundry', latitude: 38.4044, longitude: -122.3649, notes: '3-Michelin stars. 9-course tasting menu. Book via Tock exactly 2 months ahead.' },
                { time: '16:00', title: 'Check-in at Auberge du Soleil', locationName: 'Auberge du Soleil', latitude: 38.4523, longitude: -122.3885, notes: 'Maison room with valley views. Best sunset spot in Napa.' },
                { time: '19:00', title: 'Dinner at Hotel Restaurant', locationName: 'Auberge du Soleil Restaurant', latitude: 38.4523, longitude: -122.3885, notes: 'Michelin-starred dining with panoramic views.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Miami Art & Beach Luxe',
        description: 'Art Basel vibes year-round. Luxury beach clubs, world-class art, and Miami\'s hottest dining scene.',
        price: 44.99,
        destinations: ['Miami', 'South Beach', 'Florida', 'USA'],
        duration: 4,
        tags: ['luxury', 'beach', 'art', 'nightlife', 'hotels'],
        itinerary: {
          city: 'Miami',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in at The Setai', locationName: 'The Setai Miami Beach', latitude: 25.7851, longitude: -80.1213, notes: 'Ocean view suite. Three infinity pools at different temperatures.' },
                { time: '16:00', title: 'Beach Club Experience', locationName: 'The Setai Beach Club', latitude: 25.7851, longitude: -80.1213, notes: 'Reserved daybed. Signature cocktails and light bites.' },
                { time: '20:00', title: 'Dinner at Stubborn Seed', locationName: 'Stubborn Seed', latitude: 25.7804, longitude: -80.1303, notes: 'Chef Jeremy Ford\'s tasting menu. Miami\'s hottest reservation.' }
              ]
            }
          ]
        }
      }
    ]
  },
  
  // Mike Rodriguez - Budget Backpacker (6 trips/year)
  {
    creator: 'budget_backpacker',
    templates: [
      {
        title: 'Portland on a Shoestring',
        description: 'Food trucks, free hikes, and quirky neighborhoods. Experience Portland\'s best without breaking the bank.',
        price: 9.99,
        destinations: ['Portland', 'Oregon', 'USA'],
        duration: 3,
        tags: ['budget', 'food-trucks', 'hiking', 'hostels', 'local-culture'],
        itinerary: {
          city: 'Portland',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '11:00', title: 'Check-in at HI Portland Hostel', locationName: 'HI Portland Northwest', latitude: 45.5262, longitude: -122.6840, notes: 'Great location in NW. Free breakfast included. Book a 4-bed dorm to save.' },
                { time: '12:30', title: 'Food Truck Lunch', locationName: 'Pine Street Market', latitude: 45.5213, longitude: -122.6718, notes: 'Try Marukin Ramen ($12) or Pok Pok ($10). Cheapest lunch downtown.' },
                { time: '14:00', title: 'Free Walking Tour', locationName: 'Pioneer Courthouse Square', latitude: 45.5189, longitude: -122.6792, notes: 'Tips-based tour. Usually $5-10 per person. Covers history and culture.' },
                { time: '17:00', title: 'Happy Hour at McMenamins', locationName: 'McMenamins Crystal Ballroom', latitude: 45.5209, longitude: -122.6847, notes: '$4 beers and $6 burgers from 3-6pm. Historic venue.' },
                { time: '19:00', title: 'Free Summer Concert', locationName: 'Pioneer Square', latitude: 45.5189, longitude: -122.6792, notes: 'Free concerts Thursday evenings in summer. Bring a blanket.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '08:00', title: 'Free Hostel Breakfast', locationName: 'HI Portland Northwest', latitude: 45.5262, longitude: -122.6840, notes: 'Fill up! Saves money for the day.' },
                { time: '09:30', title: 'Forest Park Hike', locationName: 'Forest Park Lower Macleay Trail', latitude: 45.5369, longitude: -122.7175, notes: 'Free! 30+ miles of trails. Pack snacks and water.' },
                { time: '13:00', title: 'Picnic Lunch', locationName: 'Pittock Mansion Grounds', latitude: 45.5252, longitude: -122.7163, notes: 'Free viewpoint. Buy groceries beforehand ($5 total).' },
                { time: '15:00', title: 'Powell\'s City of Books', locationName: 'Powell\'s Books', latitude: 45.5230, longitude: -122.6813, notes: 'World\'s largest bookstore. Free to browse. Coffee shop inside.' },
                { time: '18:00', title: 'Food Cart Dinner', locationName: 'Cartopia', latitude: 45.5138, longitude: -122.6534, notes: 'Open late. PBJ\'s Grilled ($8) or Potato Champion ($7).' },
                { time: '20:00', title: 'Free Comedy Show', locationName: 'Suki\'s Bar', latitude: 45.5136, longitude: -122.6566, notes: 'Free stand-up every Tuesday. Buy one drink minimum.' }
              ]
            },
            {
              date: 3,
              activities: [
                { time: '09:00', title: 'Saturday Market', locationName: 'Portland Saturday Market', latitude: 45.5225, longitude: -122.6704, notes: 'Free to browse. Street performers and local crafts.' },
                { time: '11:00', title: 'Cheap Brunch', locationName: 'The Bye and Bye', latitude: 45.5280, longitude: -122.6536, notes: 'Vegan bowls under $10. Great bloody marys for $6.' },
                { time: '13:00', title: 'Free Museum Day', locationName: 'Portland Art Museum', latitude: 45.5162, longitude: -122.6833, notes: 'Free 4th Friday 5-8pm, or $5 with student ID anytime.' },
                { time: '15:00', title: 'Thrift Shopping', locationName: 'Hawthorne District', latitude: 45.5121, longitude: -122.6227, notes: 'Crossroads Trading, Buffalo Exchange. Find Portland flannel!' },
                { time: '17:00', title: 'Sunset at Mt. Tabor', locationName: 'Mt. Tabor Park', latitude: 45.5119, longitude: -122.5950, notes: 'Free. Extinct volcano with city views. BYOB allowed in parks.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Austin\'s Free Music & Tacos',
        description: 'Live music capital meets taco heaven. Discover Austin\'s vibrant culture without spending a fortune.',
        price: 9.99,
        destinations: ['Austin', 'Texas', 'USA'],
        duration: 4,
        tags: ['budget', 'live-music', 'food-trucks', 'hostels', 'nightlife'],
        itinerary: {
          city: 'Austin',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '12:00', title: 'Check-in at Firehouse Hostel', locationName: 'Firehouse Hostel', latitude: 30.2672, longitude: -97.7431, notes: 'Former firehouse. Great location. Lounge with free coffee all day.' },
                { time: '13:30', title: 'Taco Truck Lunch', locationName: 'Veracruz All Natural', latitude: 30.2515, longitude: -97.7545, notes: 'Best breakfast tacos in Austin. $3 each. Try the migas.' },
                { time: '15:00', title: 'Zilker Park & Barton Springs', locationName: 'Zilker Park', latitude: 30.2669, longitude: -97.7699, notes: 'Free park. Barton Springs Pool is $5 for residents, $9 for visitors.' },
                { time: '18:00', title: 'Happy Hour on Rainey Street', locationName: 'Rainey Street', latitude: 30.2580, longitude: -97.7383, notes: 'Container Bar has $3 Lone Stars. Banger\'s has 100+ beers on tap.' },
                { time: '20:00', title: 'Free Live Music', locationName: 'The Continental Club', latitude: 30.2487, longitude: -97.7530, notes: 'No cover on Mondays. Tip the band. Austin institution since 1955.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Denver\'s Mountain High Budget',
        description: 'City meets mountains. Free hikes, craft beer happy hours, and Rocky Mountain adventures on the cheap.',
        price: 9.99,
        destinations: ['Denver', 'Colorado', 'USA'],
        duration: 3,
        tags: ['budget', 'hiking', 'breweries', 'mountains', 'hostels'],
        itinerary: {
          city: 'Denver',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '12:00', title: 'Check-in at Ember Hostel', locationName: 'Ember Hostel', latitude: 39.7571, longitude: -105.0070, notes: 'New hostel with rooftop bar. Free breakfast and dinner on weekdays.' },
                { time: '14:00', title: 'RiNo Art District Walk', locationName: 'RiNo Art District', latitude: 39.7577, longitude: -104.9858, notes: 'Free street art tour. Dozens of murals. Stop at Denver Central Market.' },
                { time: '16:00', title: 'Brewery Happy Hour', locationName: 'Great Divide Brewing', latitude: 39.7538, longitude: -104.9886, notes: '$3 pints from 3-6pm. Try the Yeti Imperial Stout.' },
                { time: '18:00', title: 'Food Hall Dinner', locationName: 'Denver Central Market', latitude: 39.7594, longitude: -104.9862, notes: 'Multiple vendors. Culture Meat & Cheese has $8 sandwiches.' }
              ]
            }
          ]
        }
      },
      {
        title: 'New Orleans Without Breaking the Bank',
        description: 'Jazz, gumbo, and good times. Experience the Big Easy\'s magic on a backpacker budget.',
        price: 12.99,
        destinations: ['New Orleans', 'Louisiana', 'USA'],
        duration: 4,
        tags: ['budget', 'music', 'culture', 'food', 'nightlife'],
        itinerary: {
          city: 'New Orleans',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '12:00', title: 'Check-in at India House Hostel', locationName: 'India House Hostel', latitude: 29.9340, longitude: -90.0859, notes: 'Pool and free crawfish boils (seasonal). Mid-City location.' },
                { time: '14:00', title: 'French Quarter Walk', locationName: 'French Quarter', latitude: 29.9584, longitude: -90.0644, notes: 'Free to explore. Street performers everywhere. Don\'t pay for tours.' },
                { time: '16:00', title: 'Café du Monde', locationName: 'Café du Monde', latitude: 29.9575, longitude: -90.0618, notes: 'Beignets are $3.40 for 3. Cash only. Open 24/7.' },
                { time: '18:00', title: 'Happy Hour at Coop\'s Place', locationName: 'Coop\'s Place', latitude: 29.9568, longitude: -90.0635, notes: '$5 jambalaya. $3 beers. Locals spot.' },
                { time: '20:00', title: 'Free Jazz on Frenchmen St', locationName: 'Frenchmen Street', latitude: 29.9638, longitude: -90.0577, notes: 'Better than Bourbon St. The Spotted Cat has no cover.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Chicago Deep Dish & Blues',
        description: 'Architecture, music, and legendary food. The Windy City delivers big experiences on a small budget.',
        price: 11.99,
        destinations: ['Chicago', 'Illinois', 'USA'],
        duration: 4,
        tags: ['budget', 'architecture', 'music', 'food', 'museums'],
        itinerary: {
          city: 'Chicago',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '12:00', title: 'Check-in at Chicago Getaway Hostel', locationName: 'Chicago Getaway Hostel', latitude: 41.8948, longitude: -87.6358, notes: 'Lincoln Park location. Free pancake breakfast. Clean and safe.' },
                { time: '14:00', title: 'Free Architecture Walk', locationName: 'Chicago Riverwalk', latitude: 41.8881, longitude: -87.6213, notes: 'Self-guided riverwalk. Download free audio tour app.' },
                { time: '16:00', title: 'Happy Hour Deep Dish', locationName: 'Pequod\'s Pizza', latitude: 41.9218, longitude: -87.6644, notes: 'Better than touristy spots. Large pizza $25 (feeds 3-4).' },
                { time: '19:00', title: 'Free Blues Monday', locationName: 'Kingston Mines', latitude: 41.9396, longitude: -87.6577, notes: 'Free entry Mondays before 7pm. Otherwise $15. Two stages.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Seattle Coffee & Grunge',
        description: 'Rain or shine, Seattle delivers. Markets, music, and mountains - Pacific Northwest on a budget.',
        price: 10.99,
        destinations: ['Seattle', 'Washington', 'USA'],
        duration: 3,
        tags: ['budget', 'coffee', 'music', 'markets', 'hiking'],
        itinerary: {
          city: 'Seattle',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '11:00', title: 'Check-in at Green Tortoise Hostel', locationName: 'Green Tortoise Hostel', latitude: 47.6085, longitude: -122.3405, notes: 'Pike Place Market location. Free breakfast. Great common area.' },
                { time: '12:30', title: 'Pike Place Market Lunch', locationName: 'Pike Place Market', latitude: 47.6097, longitude: -122.3425, notes: 'Piroshky Piroshky ($6). Watch fish throwing. Free samples everywhere.' },
                { time: '14:00', title: 'Original Starbucks', locationName: 'Original Starbucks', latitude: 47.6096, longitude: -122.3424, notes: 'Tourist trap but worth a photo. Get coffee elsewhere for cheaper.' },
                { time: '15:30', title: 'Free Waterfront Walk', locationName: 'Seattle Waterfront', latitude: 47.6062, longitude: -122.3425, notes: 'Great views. Street performers. Olympic Sculpture Park is free.' },
                { time: '18:00', title: 'Happy Hour at Fremont Brewing', locationName: 'Fremont Brewing', latitude: 47.6492, longitude: -122.3441, notes: '$5 pints. Family and dog-friendly. Bring food from outside.' },
                { time: '20:00', title: 'Free Show at Vera Project', locationName: 'The Vera Project', latitude: 47.6213, longitude: -122.3211, notes: 'All-ages venue. Some free shows. Support local music.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Jennifer & Tom Wilson - Family Adventures (4 trips/year)
  {
    creator: 'family_adventures',
    templates: [
      {
        title: 'Orlando Beyond the Theme Parks',
        description: 'Family fun that won\'t break the bank. Natural springs, science centers, and hidden gems perfect for kids.',
        price: 19.99,
        destinations: ['Orlando', 'Florida', 'USA'],
        duration: 5,
        tags: ['family', 'kids', 'educational', 'nature', 'budget-friendly'],
        itinerary: {
          city: 'Orlando',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in at Family Resort', locationName: 'Sheraton Vistana Resort Villas', latitude: 28.4380, longitude: -81.4631, notes: 'Villa with kitchen saves on dining. Multiple pools for kids.' },
                { time: '16:00', title: 'Resort Pool & Activities', locationName: 'Resort Pools', latitude: 28.4380, longitude: -81.4631, notes: 'Seven pools! Kids activities until 8pm. Parents can relax.' },
                { time: '18:00', title: 'Grocery Run', locationName: 'Publix', latitude: 28.4422, longitude: -81.4695, notes: 'Stock up for breakfast and snacks. Saves $50/day on meals.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Orlando Science Center', locationName: 'Orlando Science Center', latitude: 28.5717, longitude: -81.3683, notes: 'Kids under 3 free. Hands-on exhibits. Shows every hour.' },
                { time: '12:00', title: 'Picnic Lunch', locationName: 'Lake Eola Park', latitude: 28.5434, longitude: -81.3730, notes: 'Swan boats $15/30min. Playground. Sunday farmers market.' },
                { time: '14:30', title: 'Crayola Experience', locationName: 'Crayola Experience', latitude: 28.4432, longitude: -81.3082, notes: '26 hands-on activities. Make your own crayon. 2-3 hours.' },
                { time: '18:00', title: 'Disney Springs (Free)', locationName: 'Disney Springs', latitude: 28.3710, longitude: -81.5148, notes: 'Free to walk around. LEGO store, World of Disney. Balloon ride $25.' }
              ]
            },
            {
              date: 3,
              activities: [
                { time: '08:30', title: 'Wekiwa Springs State Park', locationName: 'Wekiwa Springs', latitude: 28.7122, longitude: -81.4534, notes: '$6/vehicle. Crystal clear springs. 72°F year-round. Rent canoes.' },
                { time: '12:00', title: 'Picnic at Springs', locationName: 'Wekiwa Springs Picnic Area', latitude: 28.7122, longitude: -81.4534, notes: 'Grills available. Swimming until sunset. Nature trail 30 mins.' },
                { time: '15:00', title: 'Return to Resort', locationName: 'Resort', latitude: 28.4380, longitude: -81.4631, notes: 'Nap time for little ones. Pool time for older kids.' },
                { time: '17:30', title: 'Mini Golf', locationName: 'Congo River Golf', latitude: 28.4506, longitude: -81.4724, notes: 'Feed alligators! $15/adult, $13/child. Takes 45-60 mins.' }
              ]
            }
          ]
        }
      },
      {
        title: 'San Diego Family Beach Week',
        description: 'Perfect weather, beaches, and the world-famous zoo. Kid-friendly adventures in America\'s Finest City.',
        price: 24.99,
        destinations: ['San Diego', 'California', 'USA'],
        duration: 6,
        tags: ['family', 'beach', 'zoo', 'outdoors', 'educational'],
        itinerary: {
          city: 'San Diego',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in at Beach Resort', locationName: 'Paradise Point Resort', latitude: 32.7795, longitude: -117.2380, notes: 'Beach resort on Mission Bay. Five pools, beach, bikes included.' },
                { time: '16:00', title: 'Beach Time', locationName: 'Mission Beach', latitude: 32.7707, longitude: -117.2514, notes: 'Gentle waves for kids. Playground nearby. Sunset at 7pm.' },
                { time: '18:30', title: 'Boardwalk Dinner', locationName: 'Belmont Park', latitude: 32.7705, longitude: -117.2515, notes: 'Historic roller coaster. Beach Burger $12. Kids meals $7.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'San Diego Zoo', locationName: 'San Diego Zoo', latitude: 32.7353, longitude: -117.1490, notes: 'Kids under 3 free. Get there at opening. Download app for showtimes.' },
                { time: '12:00', title: 'Zoo Lunch', locationName: 'Albert\'s Restaurant', latitude: 32.7353, longitude: -117.1490, notes: 'Inside zoo. Kids meals $8. Or bring picnic (allowed).' },
                { time: '14:00', title: 'More Zoo', locationName: 'Africa Rocks', latitude: 32.7353, longitude: -117.1490, notes: 'New exhibit. Penguins, baboons. Skyfari aerial tram included.' },
                { time: '17:00', title: 'Early Dinner in Little Italy', locationName: 'Little Italy', latitude: 32.7269, longitude: -117.1688, notes: 'Buona Forchetta has kids pizza. Gelato at Pappalecco.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Washington DC Educational Adventure',
        description: 'History comes alive! Free museums, monuments, and hands-on learning perfect for curious kids.',
        price: 17.99,
        destinations: ['Washington DC', 'USA'],
        duration: 4,
        tags: ['family', 'educational', 'museums', 'history', 'free-activities'],
        itinerary: {
          city: 'Washington',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in Embassy Suites', locationName: 'Embassy Suites Georgetown', latitude: 38.9049, longitude: -77.0621, notes: 'Free breakfast and evening reception. Saves on meals. Pool for kids.' },
                { time: '16:00', title: 'National Mall Walk', locationName: 'Lincoln Memorial', latitude: 38.8893, longitude: -77.0502, notes: 'Start here and walk east. All monuments free. Bring stroller.' },
                { time: '18:00', title: 'Dinner at Food Trucks', locationName: 'L\'Enfant Plaza', latitude: 38.8847, longitude: -77.0217, notes: 'Multiple trucks. Kids love the variety. $8-12 per meal.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Natural History Museum', locationName: 'National Museum of Natural History', latitude: 38.8913, longitude: -77.0261, notes: 'Free! Hope Diamond, dinosaurs, butterfly pavilion ($8).' },
                { time: '12:00', title: 'Museum Cafeteria Lunch', locationName: 'Museum Café', latitude: 38.8913, longitude: -77.0261, notes: 'Kids meals $7. Or eat at food court across street.' },
                { time: '14:00', title: 'Air and Space Museum', locationName: 'National Air and Space Museum', latitude: 38.8883, longitude: -77.0199, notes: 'Free! Touch moon rock. Flight simulators $8-10. IMAX $15.' },
                { time: '17:00', title: 'Capitol Building Tour', locationName: 'US Capitol', latitude: 38.8899, longitude: -77.0091, notes: 'Free tours. Book online in advance. 45 minutes. Age 6+ recommended.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Boston History for Kids',
        description: 'Walk in the footsteps of patriots! Make history fun with interactive experiences and New England charm.',
        price: 21.99,
        destinations: ['Boston', 'Massachusetts', 'USA'],
        duration: 4,
        tags: ['family', 'history', 'educational', 'walking', 'culture'],
        itinerary: {
          city: 'Boston',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Check-in Downtown Hotel', locationName: 'Residence Inn Boston Downtown', latitude: 42.3523, longitude: -71.0552, notes: 'Kitchen in room. Near everything. Free breakfast buffet.' },
                { time: '16:00', title: 'Boston Common & Gardens', locationName: 'Boston Common', latitude: 42.3550, longitude: -71.0656, notes: 'Swan boats $4.50/adult, $3/child. Make Way for Ducklings statues.' },
                { time: '18:00', title: 'Quincy Market Dinner', locationName: 'Quincy Market', latitude: 42.3600, longitude: -71.0556, notes: 'Food hall with options for everyone. Street performers outside.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:30', title: 'Freedom Trail Walk', locationName: 'Boston Common Start', latitude: 42.3550, longitude: -71.0656, notes: 'Follow red line. 2.5 miles. Takes 2-3 hours with kids. Free.' },
                { time: '12:00', title: 'Lunch in North End', locationName: 'Regina Pizzeria', latitude: 42.3653, longitude: -71.0525, notes: 'Original location. Best pizza in Boston. Kids love it.' },
                { time: '14:00', title: 'Boston Tea Party Ships', locationName: 'Boston Tea Party Ships & Museum', latitude: 42.3520, longitude: -71.0513, notes: 'Interactive. Kids can throw tea! $31.95/adult, $22.95/child.' },
                { time: '16:30', title: 'Children\'s Museum', locationName: 'Boston Children\'s Museum', latitude: 42.3517, longitude: -71.0499, notes: '$20/person. Kids under 1 free. 3-story climbing structure.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Carlos Mendoza - Foodie Traveler (5 trips/year)
  {
    creator: 'foodie_traveler',
    templates: [
      {
        title: 'NYC Ultimate Food Tour',
        description: 'From street carts to Michelin stars. Eat your way through Manhattan, Brooklyn, and Queens.',
        price: 34.99,
        destinations: ['New York City', 'USA'],
        duration: 5,
        tags: ['food', 'restaurants', 'street-food', 'markets', 'michelin'],
        itinerary: {
          city: 'New York City',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '08:00', title: 'Classic NY Bagel', locationName: 'Russ & Daughters', latitude: 40.7227, longitude: -73.9886, notes: 'Get the Super Heebster. 100+ year old appetizing shop.' },
                { time: '11:00', title: 'Chelsea Market Food Hall', locationName: 'Chelsea Market', latitude: 40.7424, longitude: -74.0061, notes: 'Los Tacos No. 1, Lobster Place. Graze don\'t gorge.' },
                { time: '14:00', title: 'Pizza at Prince St', locationName: 'Prince Street Pizza', latitude: 40.7230, longitude: -73.9945, notes: 'Pepperoni square slice is legendary. Expect a line.' },
                { time: '17:00', title: 'Happy Hour Oysters', locationName: 'Grand Central Oyster Bar', latitude: 40.7527, longitude: -73.9772, notes: '$1.50 oysters 4:30-6:30pm. Historic spot in Grand Central.' },
                { time: '19:30', title: 'Dinner at Gramercy Tavern', locationName: 'Gramercy Tavern', latitude: 40.7385, longitude: -73.9882, notes: 'Danny Meyer\'s flagship. Seasonal American. Book tavern room.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Chinatown Breakfast', locationName: 'Nom Wah Tea Parlor', latitude: 40.7145, longitude: -73.9984, notes: 'Oldest dim sum in NYC (1920). Get the OG pork buns.' },
                { time: '11:30', title: 'Lower East Side Food Walk', locationName: 'Katz\'s Delicatessen', latitude: 40.7223, longitude: -73.9873, notes: 'Pastrami on rye. Where Harry met Sally. $25 but huge.' },
                { time: '14:00', title: 'Economy Candy', locationName: 'Economy Candy', latitude: 40.7229, longitude: -73.9900, notes: 'Floor to ceiling candy since 1937. Buy some halvah.' },
                { time: '16:00', title: 'Afternoon at Eataly', locationName: 'Eataly Flatiron', latitude: 40.7416, longitude: -73.9897, notes: 'Italian market. Rooftop restaurant Serra. Aperitivo time.' },
                { time: '19:00', title: 'Koreatown Dinner', locationName: 'Jongro KBBQ', latitude: 40.7474, longitude: -73.9858, notes: '32nd street. All you can eat Korean BBQ. Late night spot.' }
              ]
            }
          ]
        }
      },
      {
        title: 'LA Taco & Food Truck Paradise',
        description: 'The real LA food scene. From legendary taco trucks to Korean-Mexican fusion that started it all.',
        price: 27.99,
        destinations: ['Los Angeles', 'California', 'USA'],
        duration: 4,
        tags: ['food', 'tacos', 'food-trucks', 'fusion', 'street-food'],
        itinerary: {
          city: 'Los Angeles',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '10:00', title: 'Breakfast Burrito', locationName: 'Cofax Coffee Shop', latitude: 34.0832, longitude: -118.3437, notes: 'Fairfax location. Get the Fairfax with hash browns inside.' },
                { time: '12:30', title: 'Original Farmers Market', locationName: 'Original Farmers Market', latitude: 34.0721, longitude: -118.3607, notes: 'Since 1934. Gumbo Pot, Pampas Grill. Historic LA.' },
                { time: '15:00', title: 'Kogi Truck Hunt', locationName: 'Check Twitter @kogibbq', latitude: 34.0522, longitude: -118.2437, notes: 'Original Korean-Mexican fusion. Follow Twitter for location.' },
                { time: '18:00', title: 'Grand Central Market', locationName: 'Grand Central Market', latitude: 34.0508, longitude: -118.2489, notes: 'Eggslut, Carnitas Urapan, Sarita\'s. Open since 1917.' },
                { time: '20:00', title: 'Late Night Thai', locationName: 'Night + Market', latitude: 34.0986, longitude: -118.3275, notes: 'West Hollywood. Party wings, larb, natural wine.' }
              ]
            }
          ]
        }
      },
      {
        title: 'New Orleans Creole & Cocktails',
        description: 'Beyond beignets. Dive deep into Creole cuisine, craft cocktails, and culinary history.',
        price: 29.99,
        destinations: ['New Orleans', 'Louisiana', 'USA'],
        duration: 4,
        tags: ['food', 'cocktails', 'creole', 'seafood', 'jazz'],
        itinerary: {
          city: 'New Orleans',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '09:00', title: 'Breakfast at Mother\'s', locationName: 'Mother\'s Restaurant', latitude: 29.9455, longitude: -90.0673, notes: 'Debris roast beef po\'boy. Cash only. Local institution.' },
                { time: '11:00', title: 'French Market', locationName: 'French Market', latitude: 29.9594, longitude: -90.0609, notes: 'Hot sauce tasting, pralines, local spices. Since 1791.' },
                { time: '13:00', title: 'Muffuletta at Central Grocery', locationName: 'Central Grocery', latitude: 29.9577, longitude: -90.0629, notes: 'Original muffuletta since 1906. Get a half to share.' },
                { time: '15:00', title: 'Cocktail History', locationName: 'Napoleon House', latitude: 29.9569, longitude: -90.0643, notes: 'Pimm\'s Cup in historic building. Classical music, old NOLA.' },
                { time: '17:30', title: 'Happy Hour Oysters', locationName: 'Acme Oyster House', latitude: 29.9555, longitude: -90.0691, notes: 'Chargrilled oysters. 15 cent oysters sometimes. Since 1910.' },
                { time: '20:00', title: 'Commander\'s Palace', locationName: 'Commander\'s Palace', latitude: 29.9287, longitude: -90.0842, notes: '25 cent martinis at lunch. Jazz brunch legendary. Jacket required.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Portland Food Cart Revolution',
        description: 'Food cart capital of America. From Thai to Egyptian, experience the world in a parking lot.',
        price: 22.99,
        destinations: ['Portland', 'Oregon', 'USA'],
        duration: 3,
        tags: ['food', 'food-carts', 'coffee', 'breweries', 'donuts'],
        itinerary: {
          city: 'Portland',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '08:30', title: 'Blue Star Donuts', locationName: 'Blue Star Donuts', latitude: 45.5225, longitude: -122.6834, notes: 'Brioche dough. Blueberry bourbon basil. Not your average donut.' },
                { time: '10:00', title: 'Stumptown Coffee', locationName: 'Stumptown Downtown', latitude: 45.5214, longitude: -122.6773, notes: 'Portland coffee pioneer. Try the Hair Bender blend.' },
                { time: '12:00', title: 'Food Cart Pod Lunch', locationName: 'Alder Street Food Carts', latitude: 45.5204, longitude: -122.6818, notes: 'Nong\'s Khao Man Gai, Matt\'s BBQ, Dump Truck. $8-12 meals.' },
                { time: '15:00', title: 'Salt & Straw Ice Cream', locationName: 'Salt & Straw NW', latitude: 45.5288, longitude: -122.6960, notes: 'Seasonal flavors. Try olive oil or bone marrow. Lines worth it.' },
                { time: '17:00', title: 'Happy Hour at Pok Pok', locationName: 'Pok Pok', latitude: 45.4724, longitude: -122.6308, notes: 'Fish sauce wings are legendary. Drinking vinegars. Thai street food.' },
                { time: '20:00', title: 'Le Pigeon', locationName: 'Le Pigeon', latitude: 45.5222, longitude: -122.6573, notes: 'James Beard winner. Adventurous French. Beef cheek is amazing.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Chicago Deep Dish to Fine Dining',
        description: 'Beyond deep dish. Explore Chicago\'s diverse food scene from hot dogs to haute cuisine.',
        price: 31.99,
        destinations: ['Chicago', 'Illinois', 'USA'],
        duration: 4,
        tags: ['food', 'pizza', 'fine-dining', 'cocktails', 'markets'],
        itinerary: {
          city: 'Chicago',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '09:00', title: 'Lou Mitchell\'s Breakfast', locationName: 'Lou Mitchell\'s', latitude: 41.8795, longitude: -87.6400, notes: 'Since 1923. Free donut holes and milk duds. Cash only.' },
                { time: '11:00', title: 'Chicago Food Tour', locationName: 'Willis Tower', latitude: 41.8789, longitude: -87.6358, notes: 'Self-guided. Hit Garrett Popcorn, Portillo\'s for Italian beef.' },
                { time: '14:00', title: 'Art of Pizza', locationName: 'Art of Pizza', latitude: 41.9399, longitude: -87.6534, notes: 'Better than tourist traps. Locals\' favorite deep dish.' },
                { time: '16:30', title: 'Green City Market', locationName: 'Green City Market', latitude: 41.9115, longitude: -87.6272, notes: 'Wednesday/Saturday. Chef demos. Local producers.' },
                { time: '19:00', title: 'Girl & the Goat', locationName: 'Girl & the Goat', latitude: 41.8839, longitude: -87.6481, notes: 'Stephanie Izard. Book 2 months ahead. Wood-fired pig face.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Emma Thompson - Adventure Seeker (4 trips/year)
  {
    creator: 'adventure_seeker',
    templates: [
      {
        title: 'Utah\'s Mighty Five Adventure',
        description: 'Epic road trip through all five Utah national parks. Hikes, canyons, and otherworldly landscapes.',
        price: 32.99,
        destinations: ['Utah', 'Zion', 'Bryce', 'USA'],
        duration: 7,
        tags: ['adventure', 'hiking', 'national-parks', 'road-trip', 'camping'],
        itinerary: {
          city: 'Salt Lake City',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '08:00', title: 'Pick up rental car', locationName: 'SLC Airport', latitude: 40.7884, longitude: -111.9778, notes: '4WD recommended. Stock up on supplies in SLC.' },
                { time: '12:00', title: 'Drive to Arches NP', locationName: 'Arches National Park', latitude: 38.7331, longitude: -109.5925, notes: '4 hour drive. Enter before 3pm or very early morning.' },
                { time: '16:00', title: 'Devils Garden Trail', locationName: 'Devils Garden Trailhead', latitude: 38.7827, longitude: -109.5959, notes: '7.2 miles to see 8 arches. Bring 3L water per person.' },
                { time: '19:30', title: 'Camp at Devils Garden', locationName: 'Devils Garden Campground', latitude: 38.7829, longitude: -109.5957, notes: 'Book 6 months ahead. No showers. Incredible stars.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '05:30', title: 'Sunrise at Delicate Arch', locationName: 'Delicate Arch', latitude: 38.7436, longitude: -109.4993, notes: '3 mile RT hike. Utah\'s icon. Go early to avoid crowds.' },
                { time: '10:00', title: 'Drive to Canyonlands', locationName: 'Canyonlands NP', latitude: 38.3269, longitude: -109.8782, notes: '30 minutes. Island in the Sky district.' },
                { time: '11:30', title: 'Mesa Arch Trail', locationName: 'Mesa Arch', latitude: 38.3893, longitude: -109.8679, notes: '0.5 mile loop. Iconic arch photo. Crowded at sunrise.' },
                { time: '14:00', title: 'Grand View Point', locationName: 'Grand View Point', latitude: 38.3125, longitude: -109.8594, notes: '2 mile trail along rim. 1000 foot drops. Mind-blowing views.' },
                { time: '17:00', title: 'Drive to Moab', locationName: 'Moab', latitude: 38.5733, longitude: -109.5498, notes: 'Stock up on food. Last real town for days.' },
                { time: '19:00', title: 'Camp BLM Land', locationName: 'BLM Road 313', latitude: 38.4669, longitude: -109.7570, notes: 'Free camping. No facilities. Download offline maps.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Colorado 14ers Challenge',
        description: 'Summit Colorado\'s highest peaks. For experienced hikers ready for altitude and adventure.',
        price: 27.99,
        destinations: ['Colorado', 'Rocky Mountains', 'USA'],
        duration: 5,
        tags: ['adventure', 'hiking', 'mountains', '14ers', 'challenging'],
        itinerary: {
          city: 'Denver',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '08:00', title: 'Drive to Leadville', locationName: 'Leadville', latitude: 39.2508, longitude: -106.2925, notes: '2 hours from Denver. Highest city in US. Acclimate here.' },
                { time: '11:00', title: 'Acclimation Hike', locationName: 'Turquoise Lake', latitude: 39.2525, longitude: -106.3625, notes: 'Easy 4 miles at 10,000ft. Prepare for tomorrow.' },
                { time: '15:00', title: 'Check gear and supplies', locationName: 'Melanzana', latitude: 39.2467, longitude: -106.2924, notes: 'Local gear shop. Get layers. Weather changes fast.' },
                { time: '18:00', title: 'Carb load dinner', locationName: 'High Mountain Pies', latitude: 39.2506, longitude: -106.2920, notes: 'Pizza at altitude. Hydrate! 3-4 liters today.' },
                { time: '20:00', title: 'Early sleep', locationName: 'Hostel or camping', latitude: 39.2508, longitude: -106.2925, notes: 'Wake up at 3am for summit attempt.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '03:00', title: 'Wake and prep', locationName: 'Leadville', latitude: 39.2508, longitude: -106.2925, notes: 'Light breakfast. Check weather. Abort if storms predicted.' },
                { time: '04:00', title: 'Drive to Mt. Elbert TH', locationName: 'Mt. Elbert Trailhead', latitude: 39.1178, longitude: -106.4120, notes: 'Colorado\'s highest peak. 14,440ft.' },
                { time: '05:00', title: 'Begin summit attempt', locationName: 'Mt. Elbert Trail', latitude: 39.1178, longitude: -106.4120, notes: '9 miles RT, 4,500ft gain. 7-9 hours total.' },
                { time: '09:00', title: 'Summit Mt. Elbert', locationName: 'Mt. Elbert Summit', latitude: 39.1178, longitude: -106.4453, notes: 'Turn around by noon regardless. Weather turns afternoon.' },
                { time: '14:00', title: 'Return to trailhead', locationName: 'Mt. Elbert Trailhead', latitude: 39.1178, longitude: -106.4120, notes: 'Go slow downhill. Most injuries happen descending.' },
                { time: '16:00', title: 'Recovery in Leadville', locationName: 'Tennessee Pass Cafe', latitude: 39.2471, longitude: -106.2913, notes: 'Huge portions. You burned 4000+ calories today.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Yosemite Rock Climbing',
        description: 'From bouldering to big walls. Experience Yosemite\'s legendary climbing scene.',
        price: 29.99,
        destinations: ['Yosemite', 'California', 'USA'],
        duration: 4,
        tags: ['adventure', 'climbing', 'yosemite', 'outdoors', 'camping'],
        itinerary: {
          city: 'Yosemite Valley',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '10:00', title: 'Arrive Yosemite Valley', locationName: 'Yosemite Valley', latitude: 37.7456, longitude: -119.5936, notes: 'Get camping/accommodation sorted first. Busy season book ahead.' },
                { time: '12:00', title: 'Camp 4 Check-in', locationName: 'Camp 4', latitude: 37.7424, longitude: -119.6002, notes: 'Historic climbers camp. First come first served. Get in line early.' },
                { time: '14:00', title: 'Swan Slab Practice', locationName: 'Swan Slab', latitude: 37.7420, longitude: -119.6010, notes: 'Easy multi-pitch. Perfect warm-up. 5.6 grade. Bring full rack.' },
                { time: '18:00', title: 'Climber\'s BBQ', locationName: 'Camp 4', latitude: 37.7424, longitude: -119.6002, notes: 'Meet other climbers. Beta for tomorrow. Share rope teams.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Pacific Northwest Alpine',
        description: 'Cascades climbing and glacier travel. Mt. Rainier prep and North Cascades exploration.',
        price: 35.99,
        destinations: ['Washington', 'Mt. Rainier', 'North Cascades', 'USA'],
        duration: 6,
        tags: ['adventure', 'mountaineering', 'glaciers', 'alpine', 'technical'],
        itinerary: {
          city: 'Seattle',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '09:00', title: 'Gear check in Seattle', locationName: 'Feathered Friends', latitude: 47.6636, longitude: -122.3131, notes: 'Rent crampons, ice axe, helmet. Get permits.' },
                { time: '12:00', title: 'Drive to Paradise', locationName: 'Mt. Rainier Paradise', latitude: 46.7865, longitude: -121.7353, notes: '2 hours. Stop for food in Ashford. Check weather.' },
                { time: '15:00', title: 'Snow school', locationName: 'Paradise Snowfield', latitude: 46.7865, longitude: -121.7353, notes: 'Practice self-arrest, crampon technique. Mandatory for permit.' },
                { time: '18:00', title: 'Camp at Paradise', locationName: 'Paradise Inn', latitude: 46.7865, longitude: -121.7353, notes: 'Or camp at Cougar Rock. Early start tomorrow.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Raj Patel - Culture Explorer (4 trips/year)
  {
    creator: 'culture_explorer',
    templates: [
      {
        title: 'Paris Museum & History Deep Dive',
        description: 'Beyond the Louvre. Discover Paris through its incredible museums, hidden history, and cultural treasures.',
        price: 38.99,
        destinations: ['Paris', 'France'],
        duration: 6,
        tags: ['culture', 'museums', 'history', 'art', 'architecture'],
        itinerary: {
          city: 'Paris',
          country: 'France',
          days: [
            {
              date: 1,
              activities: [
                { time: '09:00', title: 'Musée Rodin', locationName: 'Musée Rodin', latitude: 48.8553, longitude: 2.3159, notes: 'Start with gardens. The Thinker is here, not copies. Café in garden.' },
                { time: '11:30', title: 'Invalides & Napoleon\'s Tomb', locationName: 'Les Invalides', latitude: 48.8566, longitude: 2.3122, notes: 'Military history museum. Napoleon\'s massive tomb. Allow 2 hours.' },
                { time: '14:00', title: 'Lunch in 7th', locationName: 'Café de l\'Esplanade', latitude: 48.8600, longitude: 2.3138, notes: 'Classic French bistro. Prix fixe lunch €22.' },
                { time: '15:30', title: 'Musée d\'Orsay', locationName: 'Musée d\'Orsay', latitude: 48.8600, longitude: 2.3266, notes: 'Impressionist heaven. Former train station. Thursday open until 9:45pm.' },
                { time: '19:00', title: 'Seine Dinner Cruise', locationName: 'Port de la Bourdonnais', latitude: 48.8604, longitude: 2.2930, notes: 'See monuments lit up. Book ahead. Dress code smart casual.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '08:30', title: 'Early Louvre Entry', locationName: 'Louvre Museum', latitude: 48.8606, longitude: 2.3376, notes: 'Skip lines with 9am entry. See Mona Lisa first. Download app for audio guide.' },
                { time: '13:00', title: 'Lunch at Le Fumoir', locationName: 'Le Fumoir', latitude: 48.8608, longitude: 2.3393, notes: 'Next to Louvre. Literary café. Great salads and wine.' },
                { time: '15:00', title: 'Sainte-Chapelle', locationName: 'Sainte-Chapelle', latitude: 48.8554, longitude: 2.3451, notes: 'Best stained glass in world. Combined ticket with Conciergerie.' },
                { time: '17:00', title: 'Latin Quarter Walk', locationName: 'Latin Quarter', latitude: 48.8531, longitude: 2.3439, notes: 'Sorbonne, Pantheon, Shakespeare & Co bookstore. Student area.' },
                { time: '20:00', title: 'Jazz at Le Caveau', locationName: 'Le Caveau de la Huchette', latitude: 48.8533, longitude: 2.3468, notes: 'Historic jazz club since 1946. Where Tarantino danced in Pulp Fiction.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Rome: Empire to Renaissance',
        description: 'Walk through 3000 years of history. Ancient ruins, Renaissance art, and hidden archaeological sites.',
        price: 35.99,
        destinations: ['Rome', 'Italy'],
        duration: 5,
        tags: ['history', 'archaeology', 'art', 'culture', 'ancient-rome'],
        itinerary: {
          city: 'Rome',
          country: 'Italy',
          days: [
            {
              date: 1,
              activities: [
                { time: '08:00', title: 'Colosseum Underground', locationName: 'Colosseum', latitude: 41.8902, longitude: 12.4922, notes: 'Book underground tour months ahead. See gladiator tunnels. Avoid midday heat.' },
                { time: '11:00', title: 'Roman Forum & Palatine', locationName: 'Roman Forum', latitude: 41.8925, longitude: 12.4853, notes: 'Where Rome was founded. House of Augustus newly reopened. Same ticket as Colosseum.' },
                { time: '14:00', title: 'Lunch Testaccio Market', locationName: 'Mercato Testaccio', latitude: 41.8792, longitude: 12.4731, notes: 'Local market. Mordi e Vai for sandwiches. Avoid tourist traps.' },
                { time: '16:00', title: 'Baths of Caracalla', locationName: 'Terme di Caracalla', latitude: 41.8792, longitude: 12.4923, notes: 'Best preserved Roman baths. VR glasses show original splendor.' },
                { time: '19:00', title: 'Trastevere Evening', locationName: 'Trastevere', latitude: 41.8896, longitude: 12.4703, notes: 'Bohemian quarter. Da Enzo for dinner. Book ahead.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Maya Green - Eco Traveler (3 trips/year)
  {
    creator: 'eco_traveler',
    templates: [
      {
        title: 'Costa Rica Eco Adventure',
        description: 'Sustainable tourism at its best. Rainforests, wildlife, and conservation projects.',
        price: 41.99,
        destinations: ['Costa Rica', 'Manuel Antonio', 'Monteverde'],
        duration: 7,
        tags: ['eco-tourism', 'wildlife', 'rainforest', 'sustainable', 'conservation'],
        itinerary: {
          city: 'San José',
          country: 'Costa Rica',
          days: [
            {
              date: 1,
              activities: [
                { time: '09:00', title: 'Arrive San José', locationName: 'Juan Santamaría Airport', latitude: 9.9986, longitude: -84.2041, notes: 'Get colones from ATM. Uber works here. Skip city, head to nature.' },
                { time: '12:00', title: 'Drive to Monteverde', locationName: 'Monteverde', latitude: 10.3092, longitude: -84.8255, notes: '3 hours. Rough roads last 30km. Stop at Crocodile Bridge.' },
                { time: '16:00', title: 'Check-in Eco Lodge', locationName: 'Monteverde Lodge', latitude: 10.3157, longitude: -84.8255, notes: 'Sustainable hotel. Solar power, rainwater collection. Great views.' },
                { time: '18:00', title: 'Night Walk Tour', locationName: 'Monteverde Night Walk', latitude: 10.3050, longitude: -84.8100, notes: 'See sloths, frogs, insects. Different world at night. Bring headlamp.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '07:00', title: 'Cloud Forest Reserve', locationName: 'Monteverde Cloud Forest', latitude: 10.3000, longitude: -84.7917, notes: 'Open at 7am. Beat crowds. Quetzal best spotted early morning.' },
                { time: '11:00', title: 'Hanging Bridges', locationName: 'Selvatura Hanging Bridges', latitude: 10.3361, longitude: -84.8155, notes: '3km of bridges through canopy. See forest from new perspective.' },
                { time: '14:00', title: 'Sustainable Coffee Tour', locationName: 'Don Juan Coffee Tour', latitude: 10.3048, longitude: -84.8255, notes: 'Organic, shade-grown coffee. See entire process. Support local farmers.' },
                { time: '17:00', title: 'Local Dinner', locationName: 'Sabor Tico', latitude: 10.3150, longitude: -84.8250, notes: 'Family-run. Try casado. Vegetarian options. Supports community.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Aisha Johnson - Solo Female Travel (5 trips/year)
  {
    creator: 'solo_female',
    templates: [
      {
        title: 'Tokyo Solo Female Guide',
        description: 'Navigate Tokyo confidently as a solo female traveler. Safe neighborhoods, women-only spaces, and cultural tips.',
        price: 36.99,
        destinations: ['Tokyo', 'Japan'],
        duration: 6,
        tags: ['solo-female', 'safe-travel', 'tokyo', 'culture', 'women-friendly'],
        itinerary: {
          city: 'Tokyo',
          country: 'Japan',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Arrive Narita/Haneda', locationName: 'Narita Airport', latitude: 35.7720, longitude: 140.3929, notes: 'Get Suica card, pocket wifi. Airport limousine bus easiest to hotel.' },
                { time: '17:00', title: 'Check-in Shinjuku', locationName: 'Hotel Gracery Shinjuku', latitude: 35.6952, longitude: 139.7006, notes: 'Women-only floor available. Central location. Godzilla on roof!' },
                { time: '19:00', title: 'Omoide Yokocho', locationName: 'Omoide Yokocho', latitude: 35.6934, longitude: 139.6995, notes: 'Tiny yakitori stalls. Safe for solo dining. Point at what others eat.' },
                { time: '21:00', title: 'Don Quijote Shopping', locationName: 'Don Quijote Shinjuku', latitude: 35.6957, longitude: 139.7041, notes: 'Open 24/7. Bizarre mega-store. Everything you never knew you needed.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '06:00', title: 'Tsukiji Outer Market', locationName: 'Tsukiji Outer Market', latitude: 35.6654, longitude: 139.7707, notes: 'Inner market moved. Outer still great. Try tamago and fresh sushi.' },
                { time: '09:00', title: 'TeamLab Borderless', locationName: 'TeamLab Borderless', latitude: 35.6263, longitude: 139.7835, notes: 'Digital art museum. Wear pants not skirts. Mirrors everywhere. Book ahead.' },
                { time: '13:00', title: 'Women-Only Cafe', locationName: 'Milky Way Cafe', latitude: 35.6640, longitude: 139.6982, notes: 'Ikebukuro. Men not allowed. Relaxing space. Manga library.' },
                { time: '15:00', title: 'Harajuku & Meiji Shrine', locationName: 'Meiji Shrine', latitude: 35.6764, longitude: 139.6993, notes: 'Peaceful shrine. Then Takeshita street for kawaii culture.' },
                { time: '18:00', title: 'Shibuya Crossing', locationName: 'Shibuya Crossing', latitude: 35.6595, longitude: 139.7005, notes: 'World\'s busiest crossing. View from Starbucks. Stay aware of surroundings.' },
                { time: '20:00', title: 'Conveyor Sushi', locationName: 'Genki Sushi', latitude: 35.6614, longitude: 139.6993, notes: 'Fun solo dining. Order on tablet. No language barrier.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Iceland Solo Ring Road',
        description: 'Drive Iceland\'s Ring Road solo. Safety tips, best stops, and meeting other travelers.',
        price: 42.99,
        destinations: ['Iceland', 'Reykjavik', 'Ring Road'],
        duration: 8,
        tags: ['solo-female', 'road-trip', 'iceland', 'nature', 'safe-travel'],
        itinerary: {
          city: 'Reykjavik',
          country: 'Iceland',
          days: [
            {
              date: 1,
              activities: [
                { time: '10:00', title: 'Pick up camper van', locationName: 'Kuku Campers', latitude: 63.9760, longitude: -22.5618, notes: 'Near airport. Camper gives flexibility and saves on hotels. Heater essential.' },
                { time: '12:00', title: 'Reykjavik groceries', locationName: 'Bonus Supermarket', latitude: 64.1466, longitude: -21.9426, notes: 'Stock up! Food expensive in Iceland. Bonus is cheapest chain.' },
                { time: '14:00', title: 'Blue Lagoon', locationName: 'Blue Lagoon', latitude: 63.8804, longitude: -22.4495, notes: 'Touristy but worth it. Book ahead. Silica mask included. Safe lockers.' },
                { time: '18:00', title: 'Camp Reykjavik', locationName: 'Reykjavik Campground', latitude: 64.1437, longitude: -21.8849, notes: 'In city. Hot showers. Kitchen. Meet other travelers. Very safe.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Alex Kim - Digital Nomad (6 trips/year)
  {
    creator: 'digital_nomad',
    templates: [
      {
        title: 'Lisbon Digital Nomad Setup',
        description: 'Best neighborhoods, coworking spaces, and cafes for remote work. Plus weekend exploration.',
        price: 28.99,
        destinations: ['Lisbon', 'Portugal'],
        duration: 7,
        tags: ['digital-nomad', 'remote-work', 'coworking', 'cafes', 'long-term'],
        itinerary: {
          city: 'Lisbon',
          country: 'Portugal',
          days: [
            {
              date: 1,
              activities: [
                { time: '11:00', title: 'Arrive & Settle', locationName: 'Lisbon Airport', latitude: 38.7813, longitude: -9.1359, notes: 'Get monthly metro pass. Uber cheap here. Check Airbnb in Príncipe Real.' },
                { time: '14:00', title: 'Neighborhood Scout', locationName: 'Príncipe Real', latitude: 38.7167, longitude: -9.1500, notes: 'Best nomad area. LGBTQ+ friendly. Cafes everywhere. Safe and central.' },
                { time: '16:00', title: 'Second Home Lisboa', locationName: 'Second Home Lisboa', latitude: 38.7068, longitude: -9.1425, notes: 'Best coworking. €250/month. Beautiful space. Great community. Try day pass first.' },
                { time: '18:30', title: 'Welcome Drink', locationName: 'Park Bar', latitude: 38.7158, longitude: -9.1524, notes: 'Rooftop bar on parking garage. Sunset views. Meet expats and nomads.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '09:00', title: 'Work at Fábrica Coffee', locationName: 'Fábrica Coffee Roasters', latitude: 38.7141, longitude: -9.1458, notes: 'Great wifi. Specialty coffee. Opens early. Power outlets at window seats.' },
                { time: '13:00', title: 'Lunch Time Out Market', locationName: 'Time Out Market', latitude: 38.7068, longitude: -9.1456, notes: 'Food hall. Try Manteigaria pastéis. Can work here afternoons.' },
                { time: '15:00', title: 'LACS Cascais', locationName: 'LACS Cascais', latitude: 38.6969, longitude: -9.4216, notes: 'Cowork by beach. Train 40 mins. Day pass €15. Ocean view desks.' },
                { time: '19:00', title: 'Nomad Meetup', locationName: 'Village Underground', latitude: 38.7271, longitude: -9.1436, notes: 'Tuesday nomad drinks. Bus coworking space. Great networking.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Bali Nomad Paradise',
        description: 'Canggu and Ubud for digital nomads. Best coworks, accommodation, and work-life balance.',
        price: 31.99,
        destinations: ['Bali', 'Indonesia', 'Canggu', 'Ubud'],
        duration: 14,
        tags: ['digital-nomad', 'bali', 'coworking', 'tropical', 'long-term'],
        itinerary: {
          city: 'Canggu',
          country: 'Indonesia',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Arrive Denpasar', locationName: 'Ngurah Rai Airport', latitude: -8.7467, longitude: 115.1672, notes: 'Get SIM card at airport. Telkomsel best coverage. Grab/Gojek for transport.' },
                { time: '16:00', title: 'Check-in Canggu', locationName: 'Canggu', latitude: -8.6500, longitude: 115.1350, notes: 'Stay near Berawa or Batu Bolong. Monthly villa $500-1000. Negotiate rates.' },
                { time: '18:00', title: 'Sunset at Beach', locationName: 'Echo Beach', latitude: -8.6525, longitude: 115.1225, notes: 'Classic Canggu sunset. La Brisa for drinks. Meet nomad community.' }
              ]
            }
          ]
        }
      }
    ]
  },

  // Sophia Martinez - Wellness Wanderer (4 trips/year)
  {
    creator: 'wellness_wanderer',
    templates: [
      {
        title: 'Sedona Spiritual Retreat',
        description: 'Energy vortexes, meditation, yoga, and healing in Arizona\'s red rocks.',
        price: 37.99,
        destinations: ['Sedona', 'Arizona', 'USA'],
        duration: 4,
        tags: ['wellness', 'spiritual', 'yoga', 'meditation', 'healing'],
        itinerary: {
          city: 'Sedona',
          country: 'USA',
          days: [
            {
              date: 1,
              activities: [
                { time: '14:00', title: 'Arrive Phoenix', locationName: 'Phoenix Sky Harbor', latitude: 33.4343, longitude: -112.0118, notes: 'Rent car for 2hr drive. Stop at Whole Foods for supplies.' },
                { time: '17:00', title: 'Check-in L\'Auberge', locationName: 'L\'Auberge de Sedona', latitude: 34.8681, longitude: -111.7629, notes: 'Creek-side spa resort. Book spa treatments ahead. Forest houses amazing.' },
                { time: '19:00', title: 'Sunset Meditation', locationName: 'Airport Mesa Vortex', latitude: 34.8478, longitude: -111.7889, notes: 'Most accessible vortex. 360° views. Bring mat. Powerful energy spot.' }
              ]
            },
            {
              date: 2,
              activities: [
                { time: '06:30', title: 'Sunrise Yoga', locationName: 'Cathedral Rock', latitude: 34.8286, longitude: -111.7879, notes: 'Vortex site. Moderate hike up. Practice at top. Transformative experience.' },
                { time: '10:00', title: 'Spa Morning', locationName: 'L\'Auberge Spa', latitude: 34.8681, longitude: -111.7629, notes: 'Creek-side massage. Use outdoor showers. Relaxation room with tea.' },
                { time: '14:00', title: 'Crystal Shopping', locationName: 'Crystals & Minerals', latitude: 34.8697, longitude: -111.7606, notes: 'Huge selection. Get cleansed and charged crystals. Sedona energy.' },
                { time: '16:00', title: 'Sound Bath', locationName: 'Sedona Mago Retreat', latitude: 34.8883, longitude: -111.8044, notes: 'Crystal bowls session. Deep meditation. Healing frequencies. Book ahead.' },
                { time: '19:00', title: 'Farm Table Dinner', locationName: 'Mariposa', latitude: 34.8589, longitude: -111.7839, notes: 'Organic Latin cuisine. Best sunset views. Healthy and delicious.' }
              ]
            }
          ]
        }
      },
      {
        title: 'Tulum Wellness & Cenotes',
        description: 'Beach yoga, Mayan ceremonies, cenote healing, and clean eating in Mexico\'s wellness capital.',
        price: 39.99,
        destinations: ['Tulum', 'Mexico'],
        duration: 5,
        tags: ['wellness', 'yoga', 'beach', 'cenotes', 'mayan-culture'],
        itinerary: {
          city: 'Tulum',
          country: 'Mexico',
          days: [
            {
              date: 1,
              activities: [
                { time: '12:00', title: 'Arrive Cancun', locationName: 'Cancun Airport', latitude: 21.0365, longitude: -86.8771, notes: 'Pre-book ADO bus or private transfer. 2hr to Tulum. Avoid taxi mafia.' },
                { time: '15:00', title: 'Check Eco Hotel', locationName: 'Ahau Tulum', latitude: 20.1974, longitude: -87.4659, notes: 'Beachfront eco-resort. Yoga shalas. No AC but ocean breeze. Digital detox.' },
                { time: '17:00', title: 'Beach Walk & Meditation', locationName: 'Tulum Beach', latitude: 20.1974, longitude: -87.4659, notes: 'Grounding walk. Set intentions. Caribbean sunset. Quiet end of beach.' },
                { time: '19:00', title: 'Plant-Based Dinner', locationName: 'Raw Love', latitude: 20.2120, longitude: -87.4634, notes: 'Vegan restaurant. Try jackfruit tacos. Kombucha on tap. Jungle setting.' }
              ]
            }
          ]
        }
      }
    ]
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  
  try {
    // First, clear existing seeded data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing seed data...');
    await db.delete(templateReviews).where(eq(templateReviews.template_id, templateReviews.template_id));
    await db.delete(templates).where(eq(templates.user_id, templates.user_id));
    await db.delete(activities).where(eq(activities.trip_id, activities.trip_id));
    await db.delete(trips).where(eq(trips.user_id, trips.user_id));
    await db.delete(creatorProfiles).where(eq(creatorProfiles.user_id, creatorProfiles.user_id));
    
    // Delete only seeded users (with seed_ prefix in auth_id)
    const existingUsers = await db.select().from(users);
    for (const user of existingUsers) {
      if (user.auth_id?.startsWith('seed_')) {
        await db.delete(users).where(eq(users.id, user.id));
      }
    }
    
    // Create users and creator profiles
    for (const creatorData of creators) {
      console.log(`Creating creator: ${creatorData.username}`);
      
      // Hash password (using simple password for demo)
      const hashedPassword = await bcrypt.hash('demo123', 10);
      
      // Create user with unique auth_id
      const authId = `seed_${creatorData.username}_${Date.now()}`;
      const [user] = await db.insert(users).values({
        auth_id: authId,
        email: creatorData.email,
        username: creatorData.username,
        password: hashedPassword,
        account_type: 'creator',
        user_type: 'consumer',
      }).returning();
      
      // Create creator profile
      await db.insert(creatorProfiles).values({
        user_id: user.id,
        display_name: creatorData.displayName,
        bio: creatorData.bio,
        avatar_url: creatorData.avatar,
        website_url: creatorData.websiteUrl || null,
        social_instagram: creatorData.socialInstagram || null,
        social_twitter: creatorData.socialTwitter || null,
        verified: creatorData.verified,
        total_earnings: '0',
        available_balance: '0',
      });
      
      // Find template data for this creator
      const creatorTemplates = templateData.find(td => td.creator === creatorData.username);
      
      if (creatorTemplates) {
        for (const templateInfo of creatorTemplates.templates) {
          console.log(`  Creating template: ${templateInfo.title}`);
          
          // Create a trip first
          const startDate = new Date();
          const endDate = new Date(Date.now() + (templateInfo.duration * 24 * 60 * 60 * 1000));
          
          const [trip] = await db.insert(trips).values({
            user_id: user.id,
            title: templateInfo.title,
            start_date: startDate,
            end_date: endDate,
            city: templateInfo.itinerary.city,
            country: templateInfo.itinerary.country,
            created_at: new Date(),
          }).returning();
          
          // Add activities for each day
          for (const day of templateInfo.itinerary.days) {
            const dayDate = new Date(Date.now() + ((day.date - 1) * 24 * 60 * 60 * 1000));
            
            for (const activity of day.activities) {
              await db.insert(activities).values({
                trip_id: trip.id,
                title: activity.title,
                date: dayDate.toISOString().split('T')[0],
                time: activity.time,
                location_name: activity.locationName,
                latitude: activity.latitude?.toString() || null,
                longitude: activity.longitude?.toString() || null,
                notes: activity.notes || null,
                order: day.activities.indexOf(activity),
                created_at: new Date(),
              });
            }
          }
          
          // Get all activities for trip_data
          const tripActivities = await db.select().from(activities).where(eq(activities.trip_id, trip.id));
          
          // Create template
          const slug = templateInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const [template] = await db.insert(templates).values({
            user_id: user.id,
            title: templateInfo.title,
            slug: slug + '-' + Date.now(),
            description: templateInfo.description,
            price: templateInfo.price.toString(),
            currency: 'USD',
            destinations: templateInfo.destinations,
            duration: templateInfo.duration,
            trip_data: {
              ...templateInfo.itinerary,
              activities: tripActivities,
            },
            tags: templateInfo.tags,
            status: 'published',
            featured: Math.random() > 0.7, // 30% chance of being featured
            view_count: Math.floor(Math.random() * 500),
            sales_count: Math.floor(Math.random() * 50),
            created_at: new Date(),
            updated_at: new Date(),
          }).returning();
          
          // Add some fake reviews (30% chance per template)
          if (Math.random() > 0.7) {
            const reviewCount = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < reviewCount; i++) {
              // Use the current user as reviewer for simplicity (in real app, would be different users)
              await db.insert(templateReviews).values({
                template_id: template.id,
                user_id: user.id, // Use creator's own ID for demo
                rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
                review: getRandomReview(),
                verified_purchase: true,
                created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
              });
            }
          }
        }
      }
    }
    
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

function getRandomReview(): string {
  const reviews = [
    'Amazing itinerary! Every recommendation was spot on.',
    'This template saved me hours of planning. Worth every penny!',
    'Great mix of activities. Perfect pacing for the trip.',
    'The local tips were invaluable. Felt like traveling with a local guide.',
    'Excellent value. The hidden gems included were incredible.',
    'Well organized and thoughtfully planned. Highly recommend!',
    'Perfect for first-time visitors. Covered all the must-sees plus surprises.',
    'The food recommendations alone were worth the purchase!',
  ];
  return reviews[Math.floor(Math.random() * reviews.length)];
}

// Run the seed
seedDatabase();