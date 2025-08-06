import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { users, templates, creatorProfiles, activities, trips } from '../shared/schema';

// Use Railway URL directly
const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

const pool = new Pool({ connectionString: RAILWAY_URL });
const db = drizzle(pool);

// Real Unsplash images for each city
const cityImages = {
  'New York': 'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=1600&h=900&fit=crop',
  'San Francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&h=900&fit=crop',
  'Miami': 'https://images.unsplash.com/photo-1506469717960-433cebe3f181?w=1600&h=900&fit=crop',
  'Portland': 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=1600&h=900&fit=crop',
  'Austin': 'https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=1600&h=900&fit=crop',
  'Denver': 'https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=1600&h=900&fit=crop',
  'New Orleans': 'https://images.unsplash.com/photo-1568693059993-a239b9cd4957?w=1600&h=900&fit=crop',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1600&h=900&fit=crop',
  'Seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1600&h=900&fit=crop',
  'Orlando': 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=1600&h=900&fit=crop',
  'San Diego': 'https://images.unsplash.com/photo-1545389336-cf6a0ed2e23e?w=1600&h=900&fit=crop',
  'Washington DC': 'https://images.unsplash.com/photo-1463839346397-8e9946845e6d?w=1600&h=900&fit=crop',
  'Boston': 'https://images.unsplash.com/photo-1491668607588-1ebd68015162?w=1600&h=900&fit=crop',
  'Los Angeles': 'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=1600&h=900&fit=crop',
  'Utah': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=900&fit=crop',
  'Colorado': 'https://images.unsplash.com/photo-1609403122746-e40c8888b570?w=1600&h=900&fit=crop',
  'Yosemite': 'https://images.unsplash.com/photo-1562310503-a918c4c61e38?w=1600&h=900&fit=crop',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=900&fit=crop',
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&h=900&fit=crop',
  'Costa Rica': 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=1600&h=900&fit=crop',
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=900&fit=crop',
  'Iceland': 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=1600&h=900&fit=crop',
  'Lisbon': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1600&h=900&fit=crop',
  'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&h=900&fit=crop',
  'Sedona': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&h=900&fit=crop',
  'Tulum': 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&h=900&fit=crop'
};

// Accurate template data with complete itineraries
const creators = [
  {
    username: 'luxe_wanderer',
    email: 'sarah@luxewanderer.com',
    displayName: 'Sarah Chen',
    bio: 'Luxury travel connoisseur exploring the world\'s finest hotels and experiences',
    specialties: ['Luxury Travel', 'Hotels', 'Fine Dining'],
    templates: [
      {
        title: 'NYC Luxury Long Weekend',
        description: 'Experience Manhattan like a VIP with exclusive access to the city\'s best',
        price: 49.99,
        destinations: ['New York'],
        duration: 4,
        coverImage: cityImages['New York'],
        tags: ['luxury', 'city', 'weekend'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'Arrival & Midtown Luxury',
              activities: [
                { time: '3:00 PM', title: 'Check-in at The St. Regis New York', location: '2 E 55th St', latitude: 40.7615, longitude: -73.9752 },
                { time: '5:00 PM', title: 'Afternoon tea at The Plaza', location: '768 5th Ave', latitude: 40.7645, longitude: -73.9747 },
                { time: '8:00 PM', title: 'Dinner at Eleven Madison Park', location: '11 Madison Ave', latitude: 40.7416, longitude: -73.9872 }
              ]
            },
            {
              day: 2,
              title: 'Art & Culture',
              activities: [
                { time: '10:00 AM', title: 'Private tour of The Met', location: '1000 5th Ave', latitude: 40.7794, longitude: -73.9632 },
                { time: '1:00 PM', title: 'Lunch at The Modern (MoMA)', location: '9 W 53rd St', latitude: 40.7614, longitude: -73.9776 },
                { time: '3:00 PM', title: 'MoMA visit', location: '11 W 53rd St', latitude: 40.7614, longitude: -73.9776 },
                { time: '7:30 PM', title: 'Broadway show & dinner', location: 'Times Square area', latitude: 40.7580, longitude: -73.9855 }
              ]
            },
            {
              day: 3,
              title: 'Downtown & Brooklyn',
              activities: [
                { time: '10:00 AM', title: 'Walk the High Line', location: 'Gansevoort St', latitude: 40.7420, longitude: -74.0080 },
                { time: '12:00 PM', title: 'Chelsea Market food tour', location: '75 9th Ave', latitude: 40.7424, longitude: -74.0060 },
                { time: '3:00 PM', title: 'Brooklyn Bridge walk', location: 'Brooklyn Bridge', latitude: 40.7061, longitude: -73.9969 },
                { time: '6:00 PM', title: 'Sunset drinks at Westlight', location: '111 N 12th St, Brooklyn', latitude: 40.7223, longitude: -73.9578 }
              ]
            },
            {
              day: 4,
              title: 'Central Park & Departure',
              activities: [
                { time: '9:00 AM', title: 'Breakfast at Jacob\'s Pickles', location: '509 Amsterdam Ave', latitude: 40.7864, longitude: -73.9757 },
                { time: '10:30 AM', title: 'Central Park stroll', location: 'Central Park', latitude: 40.7829, longitude: -73.9654 },
                { time: '12:00 PM', title: 'Checkout & departure', location: 'Hotel', latitude: 40.7615, longitude: -73.9752 }
              ]
            }
          ]
        }
      },
      {
        title: 'San Francisco Wine Country Escape',
        description: 'Napa Valley luxury with private tastings and Michelin dining',
        price: 59.99,
        destinations: ['San Francisco', 'Napa Valley'],
        duration: 3,
        coverImage: cityImages['San Francisco'],
        tags: ['luxury', 'wine', 'foodie'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'San Francisco to Napa',
              activities: [
                { time: '10:00 AM', title: 'Depart San Francisco', location: 'San Francisco', latitude: 37.7749, longitude: -122.4194 },
                { time: '11:30 AM', title: 'Domaine Carneros champagne tasting', location: '1240 Duhig Rd, Napa', latitude: 38.2858, longitude: -122.3707 },
                { time: '2:00 PM', title: 'Lunch at Bouchon Bistro', location: '6534 Washington St, Yountville', latitude: 38.4025, longitude: -122.3615 },
                { time: '4:00 PM', title: 'Check-in at Auberge du Soleil', location: '180 Rutherford Hill Rd', latitude: 38.4548, longitude: -122.3893 },
                { time: '7:00 PM', title: 'Dinner at The French Laundry', location: '6640 Washington St, Yountville', latitude: 38.4044, longitude: -122.3647 }
              ]
            },
            {
              day: 2,
              title: 'Full Day Wine Tasting',
              activities: [
                { time: '10:00 AM', title: 'Opus One private tour', location: '7900 St Helena Hwy', latitude: 38.4392, longitude: -122.3997 },
                { time: '12:00 PM', title: 'Lunch at Inglenook', location: '1991 St Helena Hwy', latitude: 38.4940, longitude: -122.4365 },
                { time: '2:30 PM', title: 'Castello di Amorosa tour', location: '4045 St Helena Hwy', latitude: 38.5645, longitude: -122.5417 },
                { time: '5:00 PM', title: 'Sunset at Sterling Vineyards', location: '1111 Dunaweal Ln, Calistoga', latitude: 38.5476, longitude: -122.5540 },
                { time: '8:00 PM', title: 'Dinner at Bottega', location: '6525 Washington St, Yountville', latitude: 38.4018, longitude: -122.3608 }
              ]
            },
            {
              day: 3,
              title: 'Morning Spa & Return',
              activities: [
                { time: '9:00 AM', title: 'Spa treatment at Calistoga Springs', location: '1006 Washington St, Calistoga', latitude: 38.5789, longitude: -122.5795 },
                { time: '11:30 AM', title: 'Final tasting at Schramsberg', location: '1400 Schramsberg Rd, Calistoga', latitude: 38.5645, longitude: -122.5634 },
                { time: '1:00 PM', title: 'Lunch at Model Bakery', location: '1357 Main St, St Helena', latitude: 38.5052, longitude: -122.4704 },
                { time: '3:00 PM', title: 'Return to San Francisco', location: 'San Francisco', latitude: 37.7749, longitude: -122.4194 }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    username: 'budget_backpacker',
    email: 'jake@budgetbackpack.com',
    displayName: 'Jake Martinez',
    bio: 'Proving you can see the world on $50 a day or less',
    specialties: ['Budget Travel', 'Hostels', 'Street Food'],
    templates: [
      {
        title: 'Portland on a Shoestring',
        description: 'Food carts, free activities, and cheap thrills in PDX',
        price: 9.99,
        destinations: ['Portland'],
        duration: 3,
        coverImage: cityImages['Portland'],
        tags: ['budget', 'foodie', 'hipster'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'Downtown & Food Carts',
              activities: [
                { time: '9:00 AM', title: 'Free walking tour from Pioneer Square', location: 'Pioneer Courthouse Square', latitude: 45.5189, longitude: -122.6795 },
                { time: '12:00 PM', title: 'Lunch at food cart pods', location: 'SW 10th & Alder', latitude: 45.5200, longitude: -122.6819 },
                { time: '2:00 PM', title: 'Powell\'s City of Books (free browsing)', location: '1005 W Burnside St', latitude: 45.5230, longitude: -122.6813 },
                { time: '4:00 PM', title: 'Happy hour at McMenamins', location: '1624 NW Glisan St', latitude: 45.5265, longitude: -122.6873 },
                { time: '7:00 PM', title: 'Cheap eats at Pok Pok', location: '3226 SE Division St', latitude: 45.5046, longitude: -122.6321 }
              ]
            },
            {
              day: 2,
              title: 'Nature & Neighborhoods',
              activities: [
                { time: '8:00 AM', title: 'Hike Forest Park (free)', location: 'Forest Park', latitude: 45.5598, longitude: -122.7547 },
                { time: '11:00 AM', title: 'Saturday Market (free to browse)', location: 'Tom McCall Waterfront Park', latitude: 45.5107, longitude: -122.6700 },
                { time: '1:00 PM', title: 'Cheap Vietnamese on Jade District', location: '82nd Avenue', latitude: 45.5190, longitude: -122.5780 },
                { time: '3:00 PM', title: 'Free brewery tours at Deschutes', location: '210 NW 11th Ave', latitude: 45.5247, longitude: -122.6820 },
                { time: '6:00 PM', title: 'Food cart dinner at Cartopia', location: 'SE 12th & Hawthorne', latitude: 45.5122, longitude: -122.6534 }
              ]
            },
            {
              day: 3,
              title: 'East Side Exploration',
              activities: [
                { time: '9:00 AM', title: 'Brunch at Screen Door (get there early)', location: '2337 E Burnside St', latitude: 45.5229, longitude: -122.6414 },
                { time: '11:00 AM', title: 'Walk Hawthorne District', location: 'SE Hawthorne Blvd', latitude: 45.5122, longitude: -122.6300 },
                { time: '1:00 PM', title: 'Cheap tacos at Por Que No', location: '3524 SE Hawthorne', latitude: 45.5122, longitude: -122.6276 },
                { time: '3:00 PM', title: 'Free at OMSI (first Sunday)', location: '1945 SE Water Ave', latitude: 45.5083, longitude: -122.6658 },
                { time: '6:00 PM', title: 'Happy hour at Apex Bar', location: '1216 SE Division St', latitude: 45.5046, longitude: -122.6534 }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    username: 'family_adventures',
    email: 'emily@familyadventures.com',
    displayName: 'Emily & Tom Johnson',
    bio: 'Family of 4 sharing kid-friendly adventures that parents will love too',
    specialties: ['Family Travel', 'Educational', 'Kid-Friendly'],
    templates: [
      {
        title: 'Orlando Beyond Theme Parks',
        description: 'Hidden gems and local favorites for families in Orlando',
        price: 24.99,
        destinations: ['Orlando'],
        duration: 5,
        coverImage: cityImages['Orlando'],
        tags: ['family', 'kids', 'budget-friendly'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'Downtown Orlando Discovery',
              activities: [
                { time: '9:00 AM', title: 'Lake Eola Park & Playground', location: '512 E Washington St', latitude: 28.5438, longitude: -81.3730 },
                { time: '11:00 AM', title: 'Orlando Science Center', location: '777 E Princeton St', latitude: 28.5724, longitude: -81.3683 },
                { time: '1:00 PM', title: 'Lunch at East End Market', location: '3201 Corrine Dr', latitude: 28.5667, longitude: -81.3434 },
                { time: '3:00 PM', title: 'Central Florida Zoo', location: '3755 W Seminole Blvd, Sanford', latitude: 28.7539, longitude: -81.4550 },
                { time: '6:00 PM', title: 'Dinner at 4 Rivers Smokehouse', location: '1600 W Fairbanks Ave', latitude: 28.5930, longitude: -81.3890 }
              ]
            },
            {
              day: 2,
              title: 'Springs & Nature',
              activities: [
                { time: '8:00 AM', title: 'Drive to Wekiwa Springs', location: '1800 Wekiwa Cir, Apopka', latitude: 28.7127, longitude: -81.4633 },
                { time: '9:00 AM', title: 'Swimming at natural springs', location: 'Wekiwa Springs State Park', latitude: 28.7127, longitude: -81.4633 },
                { time: '12:00 PM', title: 'Picnic lunch in park', location: 'Wekiwa Springs State Park', latitude: 28.7127, longitude: -81.4633 },
                { time: '2:00 PM', title: 'Kelly Park Rock Springs', location: '400 E Kelly Park Rd', latitude: 28.7560, longitude: -81.4990 },
                { time: '5:00 PM', title: 'Return to Orlando', location: 'Orlando', latitude: 28.5383, longitude: -81.3792 },
                { time: '6:30 PM', title: 'Dinner at Tibby\'s New Orleans Kitchen', location: '2203 Aloma Ave', latitude: 28.6366, longitude: -81.3517 }
              ]
            },
            {
              day: 3,
              title: 'Aviation & Space',
              activities: [
                { time: '9:00 AM', title: 'Kennedy Space Center Visitor Complex', location: 'Space Commerce Way', latitude: 28.5244, longitude: -80.6508 },
                { time: '10:30 AM', title: 'Rocket Garden tour', location: 'Kennedy Space Center', latitude: 28.5244, longitude: -80.6508 },
                { time: '12:00 PM', title: 'Lunch at Moon Rock Cafe', location: 'Kennedy Space Center', latitude: 28.5244, longitude: -80.6508 },
                { time: '2:00 PM', title: 'Space Shuttle Atlantis exhibit', location: 'Kennedy Space Center', latitude: 28.5244, longitude: -80.6508 },
                { time: '4:00 PM', title: 'IMAX movie', location: 'Kennedy Space Center', latitude: 28.5244, longitude: -80.6508 },
                { time: '6:00 PM', title: 'Return to Orlando', location: 'Orlando', latitude: 28.5383, longitude: -81.3792 }
              ]
            },
            {
              day: 4,
              title: 'LEGOLAND Florida',
              activities: [
                { time: '9:00 AM', title: 'Drive to LEGOLAND', location: '1 Legoland Way, Winter Haven', latitude: 27.9875, longitude: -81.6903 },
                { time: '10:00 AM', title: 'LEGO Kingdoms', location: 'LEGOLAND Florida', latitude: 27.9875, longitude: -81.6903 },
                { time: '12:00 PM', title: 'Lunch at Fun Town Pizza', location: 'LEGOLAND Florida', latitude: 27.9875, longitude: -81.6903 },
                { time: '1:30 PM', title: 'Water Park (seasonal)', location: 'LEGOLAND Florida', latitude: 27.9875, longitude: -81.6903 },
                { time: '4:00 PM', title: 'Miniland USA', location: 'LEGOLAND Florida', latitude: 27.9875, longitude: -81.6903 },
                { time: '6:00 PM', title: 'Return to Orlando', location: 'Orlando', latitude: 28.5383, longitude: -81.3792 }
              ]
            },
            {
              day: 5,
              title: 'Local Fun & Departure',
              activities: [
                { time: '9:00 AM', title: 'Crayola Experience', location: '8001 S Orange Blossom Trail', latitude: 28.4446, longitude: -81.3952 },
                { time: '11:30 AM', title: 'Icon Park & The Wheel', location: '8375 International Dr', latitude: 28.4432, longitude: -81.4680 },
                { time: '1:00 PM', title: 'Lunch at Shake Shack', location: '8369 International Dr', latitude: 28.4430, longitude: -81.4678 },
                { time: '2:30 PM', title: 'SEA LIFE Orlando Aquarium', location: '8449 International Dr', latitude: 28.4419, longitude: -81.4688 },
                { time: '4:00 PM', title: 'Departure preparations', location: 'Hotel', latitude: 28.5383, longitude: -81.3792 }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    username: 'foodie_traveler',
    email: 'maria@foodietraveler.com',
    displayName: 'Maria Gonzalez',
    bio: 'James Beard winner taking you on culinary journeys around the world',
    specialties: ['Food Tours', 'Local Cuisine', 'Cooking Classes'],
    templates: [
      {
        title: 'New Orleans Culinary Adventure',
        description: 'Dive deep into NOLA\'s incredible food scene from beignets to fine dining',
        price: 34.99,
        destinations: ['New Orleans'],
        duration: 4,
        coverImage: cityImages['New Orleans'],
        tags: ['foodie', 'culture', 'nightlife'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'French Quarter Classics',
              activities: [
                { time: '8:00 AM', title: 'Beignets at Café Du Monde', location: '800 Decatur St', latitude: 29.9575, longitude: -90.0619 },
                { time: '10:00 AM', title: 'French Market exploration', location: '1008 N Peters St', latitude: 29.9612, longitude: -90.0605 },
                { time: '12:00 PM', title: 'Muffuletta at Central Grocery', location: '923 Decatur St', latitude: 29.9588, longitude: -90.0628 },
                { time: '2:00 PM', title: 'Cooking class at New Orleans School of Cooking', location: '524 St Louis St', latitude: 29.9547, longitude: -90.0673 },
                { time: '6:00 PM', title: 'Dinner at GW Fins', location: '808 Bienville St', latitude: 29.9550, longitude: -90.0689 },
                { time: '9:00 PM', title: 'Jazz & cocktails on Frenchmen Street', location: 'Frenchmen St', latitude: 29.9640, longitude: -90.0575 }
              ]
            },
            {
              day: 2,
              title: 'Garden District & Uptown',
              activities: [
                { time: '9:00 AM', title: 'Breakfast at Ruby Slipper', location: '200 Magazine St', latitude: 29.9462, longitude: -90.0703 },
                { time: '10:30 AM', title: 'Garden District food walking tour', location: 'Washington Ave & Prytania St', latitude: 29.9286, longitude: -90.0847 },
                { time: '1:00 PM', title: 'Lunch at Cochon Butcher', location: '930 Tchoupitoulas St', latitude: 29.9425, longitude: -90.0703 },
                { time: '3:00 PM', title: 'Commander\'s Palace kitchen tour', location: '1403 Washington Ave', latitude: 29.9286, longitude: -90.0847 },
                { time: '5:00 PM', title: 'Happy hour at The Columns Hotel', location: '3811 St Charles Ave', latitude: 29.9234, longitude: -90.0986 },
                { time: '7:30 PM', title: 'Dinner at Shaya', location: '4213 Magazine St', latitude: 29.9226, longitude: -90.1015 }
              ]
            },
            {
              day: 3,
              title: 'Creole & Cajun Day',
              activities: [
                { time: '10:00 AM', title: 'Brunch at Brennan\'s', location: '417 Royal St', latitude: 29.9556, longitude: -90.0648 },
                { time: '12:30 PM', title: 'Southern Food & Beverage Museum', location: '1504 Oretha C Haley Blvd', latitude: 29.9359, longitude: -90.0797 },
                { time: '2:30 PM', title: 'Praline making at Laura\'s Candies', location: '331 Chartres St', latitude: 29.9541, longitude: -90.0694 },
                { time: '4:00 PM', title: 'Cocktail history tour', location: 'French Quarter', latitude: 29.9584, longitude: -90.0644 },
                { time: '7:00 PM', title: 'Dinner at K-Paul\'s Louisiana Kitchen', location: '416 Chartres St', latitude: 29.9556, longitude: -90.0652 },
                { time: '9:30 PM', title: 'Late night at Preservation Hall', location: '726 St Peter St', latitude: 29.9582, longitude: -90.0651 }
              ]
            },
            {
              day: 4,
              title: 'Market Day & Farewell',
              activities: [
                { time: '8:00 AM', title: 'Crescent City Farmers Market', location: '700 Magazine St', latitude: 29.9462, longitude: -90.0703 },
                { time: '10:00 AM', title: 'Bloody Mary brunch at The Ruby Slipper', location: '200 Magazine St', latitude: 29.9462, longitude: -90.0703 },
                { time: '12:00 PM', title: 'Food souvenir shopping at Rouses Market', location: '701 Royal St', latitude: 29.9570, longitude: -90.0644 },
                { time: '2:00 PM', title: 'Final po\'boy at Parkway Bakery', location: '538 Hagan Ave', latitude: 29.9756, longitude: -90.0444 },
                { time: '4:00 PM', title: 'Departure', location: 'New Orleans', latitude: 29.9511, longitude: -90.0715 }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    username: 'adventure_seeker',
    email: 'alex@adventureseeker.com',
    displayName: 'Alex Thompson',
    bio: 'Extreme sports enthusiast and certified adventure guide',
    specialties: ['Adventure Sports', 'National Parks', 'Rock Climbing'],
    templates: [
      {
        title: 'Utah Mighty Five Road Trip',
        description: 'Epic journey through all five of Utah\'s incredible national parks',
        price: 44.99,
        destinations: ['Utah', 'Zion', 'Bryce', 'Capitol Reef', 'Arches', 'Canyonlands'],
        duration: 7,
        coverImage: cityImages['Utah'],
        tags: ['adventure', 'national-parks', 'road-trip'],
        tripData: {
          days: [
            {
              day: 1,
              title: 'Las Vegas to Zion',
              activities: [
                { time: '7:00 AM', title: 'Pick up rental car in Las Vegas', location: 'Las Vegas Airport', latitude: 36.0840, longitude: -115.1537 },
                { time: '10:00 AM', title: 'Arrive at Zion National Park', location: 'Zion Visitor Center', latitude: 37.2002, longitude: -112.9878 },
                { time: '11:00 AM', title: 'Riverside Walk', location: 'Temple of Sinawava', latitude: 37.2850, longitude: -112.9478 },
                { time: '2:00 PM', title: 'Emerald Pools Trail', location: 'Zion Lodge', latitude: 37.2508, longitude: -112.9556 },
                { time: '5:00 PM', title: 'Sunset at Canyon Overlook', location: 'Canyon Overlook Trail', latitude: 37.2134, longitude: -112.9403 },
                { time: '7:00 PM', title: 'Camp at Watchman Campground', location: 'Watchman Campground', latitude: 37.1989, longitude: -112.9874 }
              ]
            },
            {
              day: 2,
              title: 'Zion to Bryce Canyon',
              activities: [
                { time: '6:00 AM', title: 'Angels Landing hike (start early!)', location: 'The Grotto', latitude: 37.2591, longitude: -112.9507 },
                { time: '12:00 PM', title: 'Lunch in Springdale', location: 'Springdale, UT', latitude: 37.1889, longitude: -112.9988 },
                { time: '2:00 PM', title: 'Drive to Bryce Canyon', location: 'Highway 89', latitude: 37.5733, longitude: -112.1877 },
                { time: '4:00 PM', title: 'Sunset Point & Rim Trail', location: 'Sunset Point', latitude: 37.6243, longitude: -112.1677 },
                { time: '6:00 PM', title: 'Stargazing program', location: 'Bryce Canyon Visitor Center', latitude: 37.6403, longitude: -112.1711 },
                { time: '8:00 PM', title: 'Camp at North Campground', location: 'North Campground', latitude: 37.6403, longitude: -112.1711 }
              ]
            },
            {
              day: 3,
              title: 'Bryce to Capitol Reef',
              activities: [
                { time: '7:00 AM', title: 'Sunrise at Bryce Point', location: 'Bryce Point', latitude: 37.6043, longitude: -112.1526 },
                { time: '8:30 AM', title: 'Navajo Loop Trail', location: 'Sunset Point', latitude: 37.6243, longitude: -112.1677 },
                { time: '11:00 AM', title: 'Drive Scenic Byway 12', location: 'Highway 12', latitude: 37.8931, longitude: -111.4206 },
                { time: '2:00 PM', title: 'Arrive Capitol Reef', location: 'Capitol Reef Visitor Center', latitude: 38.2914, longitude: -111.2615 },
                { time: '3:00 PM', title: 'Scenic Drive & Petroglyphs', location: 'Capitol Reef Scenic Drive', latitude: 38.2821, longitude: -111.2476 },
                { time: '5:00 PM', title: 'Sunset at Sunset Point', location: 'Goosenecks Overlook', latitude: 38.3147, longitude: -111.2615 },
                { time: '7:00 PM', title: 'Stay in Torrey', location: 'Torrey, UT', latitude: 38.2992, longitude: -111.4191 }
              ]
            },
            {
              day: 4,
              title: 'Capitol Reef to Arches',
              activities: [
                { time: '8:00 AM', title: 'Hickman Bridge Trail', location: 'Hickman Bridge Trailhead', latitude: 38.2875, longitude: -111.2273 },
                { time: '10:00 AM', title: 'Drive to Goblin Valley (detour)', location: 'Goblin Valley State Park', latitude: 38.5648, longitude: -110.7068 },
                { time: '12:00 PM', title: 'Explore Goblin Valley', location: 'Goblin Valley', latitude: 38.5648, longitude: -110.7068 },
                { time: '2:00 PM', title: 'Continue to Arches', location: 'Highway 191', latitude: 38.7331, longitude: -109.5925 },
                { time: '4:00 PM', title: 'Delicate Arch viewpoint', location: 'Delicate Arch Viewpoint', latitude: 38.7436, longitude: -109.5205 },
                { time: '6:00 PM', title: 'Sunset at Balanced Rock', location: 'Balanced Rock', latitude: 38.7010, longitude: -109.5644 },
                { time: '8:00 PM', title: 'Stay in Moab', location: 'Moab, UT', latitude: 38.5733, longitude: -109.5498 }
              ]
            },
            {
              day: 5,
              title: 'Arches National Park',
              activities: [
                { time: '6:00 AM', title: 'Sunrise at Mesa Arch', location: 'Mesa Arch', latitude: 38.3894, longitude: -109.8672 },
                { time: '8:00 AM', title: 'Devils Garden Trail', location: 'Devils Garden Trailhead', latitude: 38.7826, longitude: -109.5955 },
                { time: '11:00 AM', title: 'Landscape Arch', location: 'Landscape Arch', latitude: 38.7914, longitude: -109.6068 },
                { time: '1:00 PM', title: 'Lunch in Moab', location: 'Moab, UT', latitude: 38.5733, longitude: -109.5498 },
                { time: '3:00 PM', title: 'Fiery Furnace viewpoint', location: 'Fiery Furnace Viewpoint', latitude: 38.7444, longitude: -109.5613 },
                { time: '5:30 PM', title: 'Delicate Arch hike for sunset', location: 'Wolfe Ranch', latitude: 38.7356, longitude: -109.5206 },
                { time: '9:00 PM', title: 'Return to Moab', location: 'Moab, UT', latitude: 38.5733, longitude: -109.5498 }
              ]
            },
            {
              day: 6,
              title: 'Canyonlands National Park',
              activities: [
                { time: '8:00 AM', title: 'Drive to Island in the Sky', location: 'Island in the Sky Visitor Center', latitude: 38.4584, longitude: -109.8203 },
                { time: '9:00 AM', title: 'Mesa Arch Trail', location: 'Mesa Arch Trailhead', latitude: 38.3894, longitude: -109.8672 },
                { time: '10:30 AM', title: 'Grand View Point', location: 'Grand View Point', latitude: 38.3127, longitude: -109.8596 },
                { time: '12:00 PM', title: 'Green River Overlook', location: 'Green River Overlook', latitude: 38.4040, longitude: -109.8774 },
                { time: '2:00 PM', title: 'Upheaval Dome', location: 'Upheaval Dome', latitude: 38.4371, longitude: -109.9295 },
                { time: '4:00 PM', title: 'Shafer Trail viewpoint', location: 'Shafer Canyon Overlook', latitude: 38.4584, longitude: -109.8203 },
                { time: '6:00 PM', title: 'Return to Moab', location: 'Moab, UT', latitude: 38.5733, longitude: -109.5498 }
              ]
            },
            {
              day: 7,
              title: 'Return Journey',
              activities: [
                { time: '8:00 AM', title: 'Optional morning rafting', location: 'Colorado River, Moab', latitude: 38.5733, longitude: -109.5498 },
                { time: '11:00 AM', title: 'Begin drive back', location: 'Moab, UT', latitude: 38.5733, longitude: -109.5498 },
                { time: '2:00 PM', title: 'Lunch stop in Cedar City', location: 'Cedar City, UT', latitude: 37.6775, longitude: -113.0619 },
                { time: '5:00 PM', title: 'Arrive Las Vegas', location: 'Las Vegas', latitude: 36.1699, longitude: -115.1398 },
                { time: '6:00 PM', title: 'Return rental car', location: 'Las Vegas Airport', latitude: 36.0840, longitude: -115.1537 }
              ]
            }
          ]
        }
      }
    ]
  }
];

async function seedAccurateTemplates() {
  console.log('🌱 Seeding accurate templates to Railway database...');
  
  try {
    // Clear ALL existing data first
    console.log('🗑️ Wiping database clean...');
    await db.delete(activities);
    await db.delete(trips);
    await db.delete(templates);
    await db.delete(creatorProfiles);
    
    // Delete test users
    const testEmails = creators.map(c => c.email);
    for (const email of testEmails) {
      const existingUsers = await db.select().from(users).where(eq(users.email, email));
      for (const user of existingUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }
    }
    
    // Create creators and templates
    for (const creatorData of creators) {
      console.log(`\n👤 Creating creator: ${creatorData.username}`);
      
      // Create user
      const hashedPassword = await bcrypt.hash('template_demo_2024', 10);
      const [newUser] = await db.insert(users).values({
        auth_id: `creator_${creatorData.username}_${Date.now()}`,
        username: creatorData.username,
        email: creatorData.email,
        password_hash: hashedPassword,
        display_name: creatorData.displayName,
        role: 'user',
        role_type: 'consumer',
        created_at: new Date()
      }).returning();
      
      // Create creator profile (no fake metrics)
      await db.insert(creatorProfiles).values({
        user_id: newUser.id,
        bio: creatorData.bio,
        specialties: creatorData.specialties,
        verified: false, // Start unverified
        featured: false, // Not featured by default
        follower_count: 0, // Start at zero
        total_templates: creatorData.templates.length,
        total_sales: 0, // No fake sales
        average_rating: null, // No fake ratings
        created_at: new Date()
      });
      
      // Create templates with full itineraries
      for (const templateData of creatorData.templates) {
        console.log(`  📝 Creating template: ${templateData.title}`);
        
        const slug = templateData.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Create trip first
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 30); // Start 30 days from now
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + templateData.duration - 1);
        
        const [newTrip] = await db.insert(trips).values({
          user_id: newUser.id,
          title: templateData.title,
          destination: templateData.destinations[0],
          start_date: startDate,
          end_date: endDate,
          created_at: new Date()
        }).returning();
        
        // Create activities for each day
        for (const day of templateData.tripData.days) {
          const activityDate = new Date(startDate);
          activityDate.setDate(activityDate.getDate() + day.day - 1);
          
          for (const activity of day.activities) {
            await db.insert(activities).values({
              trip_id: newTrip.id,
              title: activity.title,
              location: activity.location,
              date: activityDate,
              time: activity.time,
              latitude: activity.latitude?.toString() || null,
              longitude: activity.longitude?.toString() || null,
              created_at: new Date()
            });
          }
        }
        
        // Create template with accurate data
        await db.insert(templates).values({
          user_id: newUser.id,
          title: templateData.title,
          slug: `${slug}-${Date.now()}`,
          description: templateData.description,
          price: templateData.price.toString(),
          cover_image: templateData.coverImage,
          destinations: templateData.destinations,
          duration: templateData.duration,
          trip_data: templateData.tripData,
          tags: templateData.tags,
          status: 'published',
          featured: false, // No fake featuring
          view_count: 0, // Start at zero
          sales_count: 0, // No fake sales
          rating: null, // No fake ratings
          review_count: 0, // No fake reviews
          created_at: new Date()
        });
      }
    }
    
    console.log('\n✅ Templates seeded successfully with accurate data!');
    
    // Verify seeded data
    const templateCount = await db.select().from(templates);
    const activityCount = await db.select().from(activities);
    console.log(`\n📊 Summary:`);
    console.log(`  - Templates created: ${templateCount.length}`);
    console.log(`  - Activities created: ${activityCount.length}`);
    console.log(`  - All data is accurate with no fake metrics`);
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await pool.end();
  }
}

seedAccurateTemplates();