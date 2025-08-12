import { db } from "./db-connection";
import { templates, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./utils/logger";

// Weekend template data
const weekendTemplates = [
  {
    title: "NYC Weekend Blitz",
    slug: "nyc-weekend-blitz",
    description: "Experience the best of New York City in just 48 hours! From iconic landmarks to hidden gems, this action-packed weekend covers Times Square, Central Park, Brooklyn Bridge, and the city's best food spots.",
    price: 8,
    destinations: ["New York City", "Manhattan", "Brooklyn"],
    duration: 3,
    tags: ["weekend", "city-break", "culture", "food", "nightlife"],
    cover_image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800",
    trip_data: {
      title: "NYC Weekend Blitz",
      duration: 3,
      city: "New York City",
      country: "United States",
      cityLatitude: 40.7128,
      cityLongitude: -74.0060,
      days: [
        {
          day: "1",
          title: "Friday - Manhattan Icons",
          activities: [
            {
              title: "Check-in & Times Square",
              time: "16:00",
              location: "Times Square, New York",
              locationName: "Times Square",
              latitude: 40.7580,
              longitude: -73.9855,
              notes: "Drop bags at hotel, then head to Times Square for the iconic NYC experience",
              tag: "sightseeing"
            },
            {
              title: "Dinner at Joe's Pizza",
              time: "19:00",
              location: "Joe's Pizza, Carmine Street",
              locationName: "Joe's Pizza",
              latitude: 40.7307,
              longitude: -74.0029,
              notes: "Classic New York slice at this legendary spot",
              tag: "food"
            },
            {
              title: "Broadway Show",
              time: "20:00",
              location: "Theater District",
              locationName: "Broadway",
              latitude: 40.7590,
              longitude: -73.9845,
              notes: "Catch a Broadway show (book in advance!)",
              tag: "entertainment"
            }
          ]
        },
        {
          day: "2",
          title: "Saturday - Full Day Adventure",
          activities: [
            {
              title: "Breakfast at Russ & Daughters",
              time: "09:00",
              location: "Lower East Side",
              locationName: "Russ & Daughters",
              latitude: 40.7226,
              longitude: -73.9883,
              notes: "Famous bagels and lox",
              tag: "food"
            },
            {
              title: "Walk Brooklyn Bridge",
              time: "10:30",
              location: "Brooklyn Bridge",
              locationName: "Brooklyn Bridge",
              latitude: 40.7061,
              longitude: -73.9969,
              notes: "Walk from Manhattan to Brooklyn for stunning views",
              tag: "sightseeing"
            },
            {
              title: "DUMBO & Brooklyn Bridge Park",
              time: "12:00",
              location: "DUMBO, Brooklyn",
              locationName: "DUMBO",
              latitude: 40.7033,
              longitude: -73.9881,
              notes: "Explore trendy DUMBO and waterfront park",
              tag: "sightseeing"
            },
            {
              title: "Central Park Picnic",
              time: "15:00",
              location: "Central Park",
              locationName: "Central Park",
              latitude: 40.7829,
              longitude: -73.9654,
              notes: "Grab food from Whole Foods and enjoy in the park",
              tag: "nature"
            },
            {
              title: "Sunset at Top of the Rock",
              time: "18:00",
              location: "Rockefeller Center",
              locationName: "Top of the Rock",
              latitude: 40.7587,
              longitude: -73.9787,
              notes: "Best views of Empire State Building at sunset",
              tag: "sightseeing"
            },
            {
              title: "Dinner in Greenwich Village",
              time: "20:00",
              location: "Greenwich Village",
              locationName: "Greenwich Village",
              latitude: 40.7336,
              longitude: -74.0027,
              notes: "Explore the Village's restaurant scene",
              tag: "food"
            }
          ]
        },
        {
          day: "3",
          title: "Sunday - Culture & Brunch",
          activities: [
            {
              title: "Brunch at Jacob's Pickles",
              time: "11:00",
              location: "Upper West Side",
              locationName: "Jacob's Pickles",
              latitude: 40.7865,
              longitude: -73.9757,
              notes: "Southern comfort food and great bloody marys",
              tag: "food"
            },
            {
              title: "Metropolitan Museum of Art",
              time: "13:00",
              location: "Fifth Avenue",
              locationName: "The Met",
              latitude: 40.7794,
              longitude: -73.9632,
              notes: "World-class art museum (pay what you wish for NY residents)",
              tag: "culture"
            },
            {
              title: "High Line Walk",
              time: "16:00",
              location: "Chelsea",
              locationName: "The High Line",
              latitude: 40.7480,
              longitude: -74.0048,
              notes: "Elevated park built on old railway",
              tag: "nature"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Vegas 48 Hours",
    slug: "vegas-48-hours",
    description: "The ultimate Vegas weekend! Hit the Strip, catch a show, try your luck at the casinos, and indulge in world-class dining. Perfect for a quick escape full of entertainment and excitement.",
    price: 8,
    destinations: ["Las Vegas", "Nevada"],
    duration: 2,
    tags: ["weekend", "entertainment", "nightlife", "shows", "gambling"],
    cover_image: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800",
    trip_data: {
      title: "Vegas 48 Hours",
      duration: 2,
      city: "Las Vegas",
      country: "United States",
      cityLatitude: 36.1699,
      cityLongitude: -115.1398,
      days: [
        {
          day: "1",
          title: "Saturday - The Strip",
          activities: [
            {
              title: "Hotel Check-in & Pool Time",
              time: "14:00",
              location: "Your Hotel",
              locationName: "Las Vegas Strip",
              latitude: 36.1147,
              longitude: -115.1728,
              notes: "Check in and enjoy the pool scene",
              tag: "leisure"
            },
            {
              title: "Walk the Strip",
              time: "17:00",
              location: "Las Vegas Boulevard",
              locationName: "The Strip",
              latitude: 36.1147,
              longitude: -115.1728,
              notes: "Explore the famous casinos and attractions",
              tag: "sightseeing"
            },
            {
              title: "Dinner & Show",
              time: "19:00",
              location: "Varies by show",
              locationName: "Las Vegas Show",
              latitude: 36.1147,
              longitude: -115.1728,
              notes: "Catch a Cirque du Soleil or magic show",
              tag: "entertainment"
            },
            {
              title: "Casino & Nightlife",
              time: "22:00",
              location: "Various Casinos",
              locationName: "Casino",
              latitude: 36.1147,
              longitude: -115.1728,
              notes: "Try your luck and enjoy the nightlife",
              tag: "nightlife"
            }
          ]
        },
        {
          day: "2",
          title: "Sunday - Recovery & Exploration",
          activities: [
            {
              title: "Brunch Buffet",
              time: "11:00",
              location: "Wynn or Bellagio",
              locationName: "Buffet",
              latitude: 36.1267,
              longitude: -115.1668,
              notes: "Legendary Vegas brunch buffet",
              tag: "food"
            },
            {
              title: "Fremont Street Experience",
              time: "14:00",
              location: "Downtown Las Vegas",
              locationName: "Fremont Street",
              latitude: 36.1619,
              longitude: -115.1426,
              notes: "Old Vegas charm and street performers",
              tag: "sightseeing"
            },
            {
              title: "Happy Hour & Departure",
              time: "17:00",
              location: "Casino Bar",
              locationName: "Las Vegas",
              latitude: 36.1147,
              longitude: -115.1728,
              notes: "One last drink before heading home",
              tag: "food"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Wine Country Escape",
    slug: "wine-country-escape",
    description: "A relaxing weekend in Napa Valley with wine tastings, vineyard tours, and farm-to-table dining. Perfect for couples or small groups looking to unwind in California's premier wine region.",
    price: 10,
    destinations: ["Napa Valley", "California", "Sonoma"],
    duration: 3,
    tags: ["weekend", "wine", "romantic", "food", "relaxation"],
    cover_image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800",
    trip_data: {
      title: "Wine Country Escape",
      duration: 3,
      city: "Napa",
      country: "United States",
      cityLatitude: 38.2975,
      cityLongitude: -122.2869,
      days: [
        {
          day: "1",
          title: "Friday - Arrival & First Tastings",
          activities: [
            {
              title: "Check-in at B&B",
              time: "15:00",
              location: "Napa Valley Inn",
              locationName: "Napa Valley",
              latitude: 38.2975,
              longitude: -122.2869,
              notes: "Check into your charming bed & breakfast",
              tag: "accommodation"
            },
            {
              title: "Sunset at Artesa Winery",
              time: "17:00",
              location: "Artesa Vineyards",
              locationName: "Artesa Vineyards",
              latitude: 38.1707,
              longitude: -122.2510,
              notes: "Stunning hilltop views and Spanish architecture",
              tag: "wine"
            },
            {
              title: "Dinner in Downtown Napa",
              time: "19:30",
              location: "Oxbow Public Market",
              locationName: "Downtown Napa",
              latitude: 38.3047,
              longitude: -122.2839,
              notes: "Local food hall with diverse options",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Saturday - Full Day Wine Tour",
          activities: [
            {
              title: "Breakfast at Model Bakery",
              time: "09:00",
              location: "St. Helena",
              locationName: "Model Bakery",
              latitude: 38.5049,
              longitude: -122.4703,
              notes: "Famous English muffins and coffee",
              tag: "food"
            },
            {
              title: "Castello di Amorosa",
              time: "10:30",
              location: "Calistoga",
              locationName: "Castello di Amorosa",
              latitude: 38.5672,
              longitude: -122.5416,
              notes: "13th-century Tuscan castle winery",
              tag: "wine"
            },
            {
              title: "Lunch at V. Sattui",
              time: "13:00",
              location: "St. Helena",
              locationName: "V. Sattui Winery",
              latitude: 38.4837,
              longitude: -122.4787,
              notes: "Picnic on the grounds with wine and deli items",
              tag: "food"
            },
            {
              title: "Inglenook Estate",
              time: "15:30",
              location: "Rutherford",
              locationName: "Inglenook",
              latitude: 38.4493,
              longitude: -122.4308,
              notes: "Historic estate owned by Francis Ford Coppola",
              tag: "wine"
            },
            {
              title: "Dinner at The French Laundry",
              time: "19:00",
              location: "Yountville",
              locationName: "The French Laundry",
              latitude: 38.4044,
              longitude: -122.3649,
              notes: "World-renowned restaurant (reservations essential!)",
              tag: "food"
            }
          ]
        },
        {
          day: "3",
          title: "Sunday - Sonoma & Departure",
          activities: [
            {
              title: "Sonoma Plaza",
              time: "10:00",
              location: "Sonoma",
              locationName: "Sonoma Plaza",
              latitude: 38.2919,
              longitude: -122.4580,
              notes: "Charming town square with shops and cafes",
              tag: "sightseeing"
            },
            {
              title: "Final Tasting at Buena Vista",
              time: "11:30",
              location: "Sonoma",
              locationName: "Buena Vista Winery",
              latitude: 38.2750,
              longitude: -122.4422,
              notes: "California's first commercial winery",
              tag: "wine"
            },
            {
              title: "Lunch & Departure",
              time: "13:00",
              location: "Sonoma",
              locationName: "Sonoma",
              latitude: 38.2919,
              longitude: -122.4580,
              notes: "Final meal before heading home",
              tag: "food"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Miami Beach Weekend",
    slug: "miami-beach-weekend",
    description: "Sun, sand, and South Beach! Experience Miami's vibrant culture, Art Deco architecture, Cuban cuisine, and legendary nightlife. Perfect for a tropical weekend getaway without leaving the country.",
    price: 8,
    destinations: ["Miami", "South Beach", "Florida"],
    duration: 3,
    tags: ["weekend", "beach", "nightlife", "culture", "food"],
    cover_image: "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=800",
    trip_data: {
      title: "Miami Beach Weekend",
      duration: 3,
      city: "Miami Beach",
      country: "United States",
      cityLatitude: 25.7907,
      cityLongitude: -80.1300,
      days: [
        {
          day: "1",
          title: "Friday - Beach & Art Deco",
          activities: [
            {
              title: "Beach Time",
              time: "14:00",
              location: "South Beach",
              locationName: "South Beach",
              latitude: 25.7826,
              longitude: -80.1340,
              notes: "Hit the famous South Beach",
              tag: "beach"
            },
            {
              title: "Art Deco Walking Tour",
              time: "17:00",
              location: "Ocean Drive",
              locationName: "Art Deco District",
              latitude: 25.7803,
              longitude: -80.1303,
              notes: "Self-guided tour of historic architecture",
              tag: "culture"
            },
            {
              title: "Cuban Dinner at Versailles",
              time: "19:30",
              location: "Little Havana",
              locationName: "Versailles Restaurant",
              latitude: 25.7646,
              longitude: -80.2533,
              notes: "Iconic Cuban restaurant",
              tag: "food"
            },
            {
              title: "Ocean Drive Nightlife",
              time: "22:00",
              location: "Ocean Drive",
              locationName: "Ocean Drive",
              latitude: 25.7803,
              longitude: -80.1303,
              notes: "Bar hop along the strip",
              tag: "nightlife"
            }
          ]
        },
        {
          day: "2",
          title: "Saturday - Culture & Party",
          activities: [
            {
              title: "Brunch at Joe's Stone Crab",
              time: "11:00",
              location: "South Beach",
              locationName: "Joe's Stone Crab",
              latitude: 25.7683,
              longitude: -80.1353,
              notes: "Miami institution since 1913",
              tag: "food"
            },
            {
              title: "Wynwood Walls",
              time: "13:00",
              location: "Wynwood",
              locationName: "Wynwood Walls",
              latitude: 25.8011,
              longitude: -80.1993,
              notes: "Outdoor street art museum",
              tag: "culture"
            },
            {
              title: "Pool Party",
              time: "15:00",
              location: "Your Hotel or Day Pass",
              locationName: "Pool Party",
              latitude: 25.7907,
              longitude: -80.1300,
              notes: "Miami's famous pool scene",
              tag: "party"
            },
            {
              title: "Sunset at Juvia",
              time: "18:30",
              location: "Lincoln Road",
              locationName: "Juvia",
              latitude: 25.7906,
              longitude: -80.1396,
              notes: "Rooftop dining with views",
              tag: "food"
            },
            {
              title: "LIV Nightclub",
              time: "23:00",
              location: "Fontainebleau",
              locationName: "LIV",
              latitude: 25.8173,
              longitude: -80.1224,
              notes: "One of Miami's hottest clubs",
              tag: "nightlife"
            }
          ]
        },
        {
          day: "3",
          title: "Sunday - Relax & Explore",
          activities: [
            {
              title: "Beach Yoga",
              time: "08:00",
              location: "South Beach",
              locationName: "Beach Yoga",
              latitude: 25.7826,
              longitude: -80.1340,
              notes: "Start the day with beach yoga",
              tag: "wellness"
            },
            {
              title: "Lincoln Road Shopping",
              time: "10:00",
              location: "Lincoln Road",
              locationName: "Lincoln Road",
              latitude: 25.7906,
              longitude: -80.1396,
              notes: "Pedestrian mall with shops and cafes",
              tag: "shopping"
            },
            {
              title: "Farewell Lunch",
              time: "13:00",
              location: "Bayside Marketplace",
              locationName: "Bayside",
              latitude: 25.7784,
              longitude: -80.1868,
              notes: "Waterfront dining before departure",
              tag: "food"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Nashville Music Weekend",
    slug: "nashville-music-weekend",
    description: "Immerse yourself in Music City! From honky-tonks on Broadway to the Grand Ole Opry, plus amazing Southern food and hipster neighborhoods. The perfect weekend for music lovers.",
    price: 10,
    destinations: ["Nashville", "Tennessee"],
    duration: 3,
    tags: ["weekend", "music", "culture", "food", "nightlife"],
    cover_image: "https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=800",
    trip_data: {
      title: "Nashville Music Weekend",
      duration: 3,
      city: "Nashville",
      country: "United States",
      cityLatitude: 36.1627,
      cityLongitude: -86.7816,
      days: [
        {
          day: "1",
          title: "Friday - Broadway & Honky-Tonks",
          activities: [
            {
              title: "Check-in & Hot Chicken",
              time: "16:00",
              location: "Downtown Nashville",
              locationName: "Prince's Hot Chicken",
              latitude: 36.1866,
              longitude: -86.7852,
              notes: "Try the original Nashville hot chicken",
              tag: "food"
            },
            {
              title: "Broadway Honky-Tonk Crawl",
              time: "19:00",
              location: "Broadway",
              locationName: "Broadway",
              latitude: 36.1609,
              longitude: -86.7785,
              notes: "Live music at Tootsies, Roberts, and more",
              tag: "music"
            },
            {
              title: "Late Night at The Stage",
              time: "22:00",
              location: "Broadway",
              locationName: "The Stage on Broadway",
              latitude: 36.1612,
              longitude: -86.7784,
              notes: "Three floors of live music",
              tag: "nightlife"
            }
          ]
        },
        {
          day: "2",
          title: "Saturday - Music History",
          activities: [
            {
              title: "Country Music Hall of Fame",
              time: "10:00",
              location: "Downtown",
              locationName: "Country Music Hall of Fame",
              latitude: 36.1584,
              longitude: -86.7761,
              notes: "Comprehensive music history museum",
              tag: "culture"
            },
            {
              title: "RCA Studio B Tour",
              time: "13:00",
              location: "Music Row",
              locationName: "RCA Studio B",
              latitude: 36.1498,
              longitude: -86.7958,
              notes: "Where Elvis recorded over 200 songs",
              tag: "music"
            },
            {
              title: "The Gulch & 12 South",
              time: "15:00",
              location: "The Gulch",
              locationName: "The Gulch",
              latitude: 36.1526,
              longitude: -86.7896,
              notes: "Trendy neighborhoods with shops and murals",
              tag: "sightseeing"
            },
            {
              title: "Grand Ole Opry",
              time: "19:00",
              location: "Opryland",
              locationName: "Grand Ole Opry",
              latitude: 36.2068,
              longitude: -86.6921,
              notes: "Legendary country music show",
              tag: "music"
            }
          ]
        },
        {
          day: "3",
          title: "Sunday - Brunch & Blues",
          activities: [
            {
              title: "Biscuit Love Brunch",
              time: "10:00",
              location: "The Gulch",
              locationName: "Biscuit Love",
              latitude: 36.1527,
              longitude: -86.7873,
              notes: "Southern brunch favorites",
              tag: "food"
            },
            {
              title: "Johnny Cash Museum",
              time: "12:00",
              location: "Downtown",
              locationName: "Johnny Cash Museum",
              latitude: 36.1596,
              longitude: -86.7759,
              notes: "Tribute to the Man in Black",
              tag: "culture"
            },
            {
              title: "Bluebird Cafe",
              time: "16:00",
              location: "Green Hills",
              locationName: "The Bluebird Cafe",
              latitude: 36.0897,
              longitude: -86.8037,
              notes: "Intimate songwriter venue (reservations needed)",
              tag: "music"
            }
          ]
        }
      ]
    }
  }
];

async function seedWeekendTemplates() {
  try {
    logger.info("Starting weekend templates seed...");

    // Get or create a system user for templates
    let systemUser = await db.select()
      .from(users)
      .where(eq(users.email, "templates@remvana.com"))
      .limit(1);

    if (systemUser.length === 0) {
      // Create system user
      const [newUser] = await db.insert(users).values({
        username: "remvana-templates",
        email: "templates@remvana.com",
        auth_id: "system-templates",
        display_name: "Remvana Templates",
        role: "admin",
        creator_status: "verified",
        creator_tier: "partner"
      }).returning();
      systemUser = [newUser];
      logger.info("Created system user for templates");
    }

    const userId = systemUser[0].id;

    // Insert each template
    for (const template of weekendTemplates) {
      try {
        // Check if template already exists
        const existing = await db.select()
          .from(templates)
          .where(eq(templates.slug, template.slug))
          .limit(1);

        if (existing.length > 0) {
          logger.info(`Template ${template.slug} already exists, skipping...`);
          continue;
        }

        // Insert template
        await db.insert(templates).values({
          ...template,
          user_id: userId,
          status: "published",
          featured: true,
          ai_generated: false,
          price: template.price.toString(),
          currency: "USD",
          created_at: new Date(),
          updated_at: new Date()
        });

        logger.info(`Created template: ${template.title}`);
      } catch (error) {
        logger.error(`Failed to create template ${template.title}:`, error);
      }
    }

    logger.info("Weekend templates seed completed successfully!");
  } catch (error) {
    logger.error("Error seeding weekend templates:", error);
    process.exit(1);
  }
}

// Run the seed
seedWeekendTemplates().then(() => {
  logger.info("Seed script finished");
  process.exit(0);
}).catch((error) => {
  logger.error("Seed script failed:", error);
  process.exit(1);
});