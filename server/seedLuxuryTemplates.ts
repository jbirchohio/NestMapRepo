import { db } from "./db-connection";
import { templates, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./utils/logger";

// Luxury template data
const luxuryTemplates = [
  {
    title: "Maldives Overwater Paradise",
    slug: "maldives-overwater-paradise",
    description: "Experience ultimate luxury in the Maldives with overwater villas, private dining, world-class diving, and sunset cruises. This exclusive itinerary includes spa treatments, dolphin watching, and gourmet dining experiences.",
    price: 45,
    destinations: ["Maldives", "Male", "Indian Ocean"],
    duration: 7,
    tags: ["luxury", "beach", "honeymoon", "diving", "spa", "romantic"],
    cover_image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800",
    trip_data: {
      title: "Maldives Overwater Paradise",
      duration: 7,
      city: "Male",
      country: "Maldives",
      cityLatitude: 4.1755,
      cityLongitude: 73.5093,
      days: [
        {
          day: "1",
          title: "Arrival & Island Welcome",
          activities: [
            {
              title: "Seaplane Transfer to Resort",
              time: "14:00",
              location: "Velana International Airport",
              locationName: "Male Airport",
              latitude: 4.1916,
              longitude: 73.5291,
              notes: "Scenic 45-minute seaplane journey to your private island resort",
              tag: "transport"
            },
            {
              title: "Check-in to Overwater Villa",
              time: "15:30",
              location: "Conrad Maldives or similar",
              locationName: "Luxury Resort",
              latitude: 1.9173,
              longitude: 73.4294,
              notes: "Welcome drinks, villa orientation, personal butler introduction",
              tag: "accommodation"
            },
            {
              title: "Sunset Champagne & Canapés",
              time: "18:00",
              location: "Private Villa Deck",
              locationName: "Your Villa",
              notes: "Complimentary champagne while watching the sunset from your deck",
              tag: "luxury"
            },
            {
              title: "Private Beach Dinner",
              time: "19:30",
              location: "Private Beach",
              locationName: "Resort Beach",
              notes: "Romantic dinner on the beach with personal chef and waiter",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Underwater Wonders",
          activities: [
            {
              title: "Sunrise Yoga on the Beach",
              time: "06:30",
              location: "Beach Pavilion",
              locationName: "Resort Beach",
              notes: "Private yoga session with ocean views",
              tag: "wellness"
            },
            {
              title: "Breakfast in Villa",
              time: "08:00",
              location: "Overwater Villa",
              locationName: "Your Villa",
              notes: "Floating breakfast served in your private pool",
              tag: "food"
            },
            {
              title: "Whale Shark & Manta Ray Excursion",
              time: "09:30",
              location: "South Ari Atoll",
              locationName: "Diving Site",
              latitude: 3.4855,
              longitude: 72.8333,
              notes: "Snorkel with whale sharks and manta rays (seasonal)",
              tag: "adventure"
            },
            {
              title: "Underwater Restaurant Lunch",
              time: "13:00",
              location: "Ithaa Undersea Restaurant",
              locationName: "Conrad Maldives",
              latitude: 1.9173,
              longitude: 73.4294,
              notes: "Dine 5 meters below sea level surrounded by marine life",
              tag: "food"
            },
            {
              title: "Spa Treatment",
              time: "15:30",
              location: "Over-water Spa",
              locationName: "Resort Spa",
              notes: "Couples massage with glass floor panels showing ocean below",
              tag: "spa"
            },
            {
              title: "Sunset Dolphin Cruise",
              time: "17:30",
              location: "Resort Marina",
              locationName: "Marina",
              notes: "Private yacht cruise to spot spinner dolphins",
              tag: "wildlife"
            }
          ]
        },
        {
          day: "3",
          title: "Island Hopping & Culture",
          activities: [
            {
              title: "Local Island Cultural Tour",
              time: "09:00",
              location: "Maafushi Island",
              locationName: "Local Island",
              latitude: 3.9394,
              longitude: 73.4900,
              notes: "Visit local island to experience Maldivian culture and crafts",
              tag: "culture"
            },
            {
              title: "Sandbank Picnic Lunch",
              time: "12:30",
              location: "Private Sandbank",
              locationName: "Sandbank",
              notes: "Exclusive picnic on a deserted sandbank in the middle of the ocean",
              tag: "luxury"
            },
            {
              title: "Jet Ski Safari",
              time: "15:00",
              location: "Resort Watersports Center",
              locationName: "Watersports",
              notes: "Guided jet ski tour around neighboring atolls",
              tag: "adventure"
            },
            {
              title: "Cinema Under the Stars",
              time: "20:00",
              location: "Beach Cinema",
              locationName: "Resort Beach",
              notes: "Private movie screening on the beach with gourmet popcorn",
              tag: "entertainment"
            }
          ]
        },
        {
          day: "4",
          title: "Diving & Relaxation",
          activities: [
            {
              title: "PADI Discover Scuba Diving",
              time: "08:00",
              location: "House Reef",
              locationName: "Diving Center",
              notes: "Beginner-friendly dive with instructor to explore coral reefs",
              tag: "diving"
            },
            {
              title: "Floating Lunch",
              time: "12:30",
              location: "Private Pool",
              locationName: "Your Villa",
              notes: "Luxurious floating tray lunch in your private pool",
              tag: "food"
            },
            {
              title: "Catamaran Sailing",
              time: "15:00",
              location: "Resort Marina",
              locationName: "Marina",
              notes: "Learn to sail or relax while crew handles the catamaran",
              tag: "sailing"
            },
            {
              title: "Maldivian Cooking Class",
              time: "18:00",
              location: "Resort Kitchen",
              locationName: "Cooking School",
              notes: "Learn to prepare traditional Maldivian dishes with head chef",
              tag: "culture"
            }
          ]
        },
        {
          day: "5",
          title: "Ultimate Indulgence",
          activities: [
            {
              title: "Sunrise Fishing",
              time: "05:30",
              location: "Deep Sea",
              locationName: "Fishing Grounds",
              notes: "Traditional Maldivian fishing experience",
              tag: "adventure"
            },
            {
              title: "Chef's Table Breakfast",
              time: "09:00",
              location: "Main Restaurant",
              locationName: "Resort Restaurant",
              notes: "Exclusive breakfast prepared by executive chef",
              tag: "food"
            },
            {
              title: "Private Island Exploration",
              time: "11:00",
              location: "Uninhabited Island",
              locationName: "Private Island",
              notes: "Speedboat to deserted island for complete privacy",
              tag: "luxury"
            },
            {
              title: "Sunset Yoga & Meditation",
              time: "17:30",
              location: "Yoga Pavilion",
              locationName: "Wellness Center",
              notes: "Guided meditation as the sun sets over the Indian Ocean",
              tag: "wellness"
            },
            {
              title: "Wine Tasting & Dinner",
              time: "19:30",
              location: "Wine Cellar",
              locationName: "Underground Cellar",
              notes: "Seven-course degustation with wine pairing",
              tag: "food"
            }
          ]
        },
        {
          day: "6",
          title: "Adventure Day",
          activities: [
            {
              title: "Parasailing",
              time: "09:00",
              location: "Watersports Center",
              locationName: "Resort Beach",
              notes: "Soar above the turquoise waters for aerial views",
              tag: "adventure"
            },
            {
              title: "Submarine Excursion",
              time: "11:00",
              location: "Whale Submarine",
              locationName: "Submarine Port",
              latitude: 4.1755,
              longitude: 73.5093,
              notes: "Descend 150 feet to explore underwater world in submarine",
              tag: "unique"
            },
            {
              title: "Beachside BBQ Lunch",
              time: "13:00",
              location: "Beach Grill",
              locationName: "Resort Beach",
              notes: "Fresh seafood BBQ with ocean views",
              tag: "food"
            },
            {
              title: "Couples Spa Ritual",
              time: "15:00",
              location: "Spa Sanctuary",
              locationName: "Overwater Spa",
              notes: "3-hour signature spa journey for couples",
              tag: "spa"
            },
            {
              title: "Farewell Dinner Cruise",
              time: "19:00",
              location: "Luxury Yacht",
              locationName: "Marina",
              notes: "Sunset dinner cruise on private yacht with live music",
              tag: "luxury"
            }
          ]
        },
        {
          day: "7",
          title: "Departure",
          activities: [
            {
              title: "Final Morning Swim",
              time: "07:00",
              location: "Villa Pool",
              locationName: "Your Villa",
              notes: "Last swim in your private pool",
              tag: "leisure"
            },
            {
              title: "Farewell Breakfast",
              time: "08:30",
              location: "Main Restaurant",
              locationName: "Resort Restaurant",
              notes: "Full breakfast buffet with ocean views",
              tag: "food"
            },
            {
              title: "Resort Boutique Shopping",
              time: "10:00",
              location: "Resort Shops",
              locationName: "Shopping Area",
              notes: "Last-minute souvenir shopping",
              tag: "shopping"
            },
            {
              title: "Seaplane Transfer",
              time: "12:00",
              location: "Resort Seaplane Terminal",
              locationName: "Seaplane Terminal",
              notes: "Scenic flight back to Male International Airport",
              tag: "transport"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Swiss Alps Exclusive",
    slug: "swiss-alps-exclusive",
    description: "Discover the pinnacle of Alpine luxury with private helicopter tours, Michelin-starred dining, exclusive ski slopes, and stays in the finest mountain resorts. Experience Switzerland's breathtaking beauty in ultimate comfort.",
    price: 40,
    destinations: ["Switzerland", "Zermatt", "St. Moritz", "Interlaken"],
    duration: 7,
    tags: ["luxury", "mountains", "skiing", "scenic", "adventure", "fine-dining"],
    cover_image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
    trip_data: {
      title: "Swiss Alps Exclusive",
      duration: 7,
      city: "Zurich",
      country: "Switzerland",
      cityLatitude: 47.3769,
      cityLongitude: 8.5417,
      days: [
        {
          day: "1",
          title: "Zurich Arrival & Luxury Welcome",
          activities: [
            {
              title: "VIP Airport Transfer",
              time: "14:00",
              location: "Zurich Airport",
              locationName: "Zurich Airport",
              latitude: 47.4647,
              longitude: 8.5492,
              notes: "Private limousine transfer to hotel",
              tag: "transport"
            },
            {
              title: "Check-in at Baur au Lac",
              time: "15:30",
              location: "Baur au Lac Hotel",
              locationName: "Baur au Lac",
              latitude: 47.3671,
              longitude: 8.5386,
              notes: "5-star luxury hotel overlooking Lake Zurich",
              tag: "accommodation"
            },
            {
              title: "Welcome Dinner at Kronenhalle",
              time: "19:00",
              location: "Restaurant Kronenhalle",
              locationName: "Kronenhalle",
              latitude: 47.3704,
              longitude: 8.5448,
              notes: "Historic restaurant with original Picasso and Chagall art",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Glacier Express to Zermatt",
          activities: [
            {
              title: "First Class Glacier Express",
              time: "08:00",
              location: "Zurich HB",
              locationName: "Zurich Station",
              latitude: 47.3779,
              longitude: 8.5403,
              notes: "World's slowest express train through stunning Alpine scenery",
              tag: "transport"
            },
            {
              title: "Gourmet Lunch on Board",
              time: "12:30",
              location: "Glacier Express",
              locationName: "On Train",
              notes: "5-course meal served at your seat with panoramic views",
              tag: "food"
            },
            {
              title: "Arrival in Zermatt",
              time: "16:00",
              location: "Zermatt Station",
              locationName: "Zermatt",
              latitude: 46.0207,
              longitude: 7.7491,
              notes: "Car-free mountain village at the base of Matterhorn",
              tag: "arrival"
            },
            {
              title: "Mont Cervin Palace Check-in",
              time: "16:30",
              location: "Mont Cervin Palace",
              locationName: "Mont Cervin Palace",
              latitude: 46.0234,
              longitude: 7.7479,
              notes: "5-star Alpine resort with Matterhorn views",
              tag: "accommodation"
            },
            {
              title: "Fondue at Findlerhof",
              time: "19:00",
              location: "Restaurant Findlerhof",
              locationName: "Findlerhof",
              latitude: 46.0171,
              longitude: 7.7884,
              notes: "Mountain restaurant accessible by private snowcat",
              tag: "food"
            }
          ]
        },
        {
          day: "3",
          title: "Matterhorn & Mountain Adventures",
          activities: [
            {
              title: "Gornergrat Railway",
              time: "09:00",
              location: "Gornergrat Bahn",
              locationName: "Gornergrat",
              latitude: 45.9831,
              longitude: 7.7847,
              notes: "Cogwheel train to 3,089m for Matterhorn panorama",
              tag: "sightseeing"
            },
            {
              title: "Private Ski Lesson",
              time: "11:00",
              location: "Gornergrat Slopes",
              locationName: "Ski Area",
              notes: "One-on-one instruction on exclusive slopes",
              tag: "skiing"
            },
            {
              title: "Mountain Lunch at Kulmhotel",
              time: "13:00",
              location: "Kulmhotel Gornergrat",
              locationName: "Kulmhotel",
              latitude: 45.9831,
              longitude: 7.7847,
              notes: "Europe's highest hotel with 360° Alpine views",
              tag: "food"
            },
            {
              title: "Helicopter Tour",
              time: "15:00",
              location: "Air Zermatt",
              locationName: "Heliport",
              notes: "Private helicopter tour around Matterhorn",
              tag: "luxury"
            },
            {
              title: "Spa at Mont Cervin",
              time: "17:00",
              location: "Mont Cervin Spa",
              locationName: "Hotel Spa",
              notes: "Alpine wellness treatment and relaxation",
              tag: "spa"
            }
          ]
        },
        {
          day: "4",
          title: "Journey to St. Moritz",
          activities: [
            {
              title: "Private Transfer to St. Moritz",
              time: "09:00",
              location: "Zermatt",
              locationName: "Mont Cervin Palace",
              notes: "Luxury car through scenic Alpine passes",
              tag: "transport"
            },
            {
              title: "Lunch at Chesa Veglia",
              time: "13:00",
              location: "Chesa Veglia",
              locationName: "St. Moritz",
              latitude: 46.4978,
              longitude: 9.8387,
              notes: "300-year-old farmhouse restaurant",
              tag: "food"
            },
            {
              title: "Badrutt's Palace Check-in",
              time: "15:00",
              location: "Badrutt's Palace Hotel",
              locationName: "Badrutt's Palace",
              latitude: 46.4969,
              longitude: 9.8388,
              notes: "Legendary luxury hotel since 1896",
              tag: "accommodation"
            },
            {
              title: "Champagne at King's Club",
              time: "18:00",
              location: "King's Club",
              locationName: "Badrutt's Palace",
              notes: "Exclusive members club and bar",
              tag: "nightlife"
            },
            {
              title: "Dinner at IGNIV",
              time: "20:00",
              location: "IGNIV by Andreas Caminada",
              locationName: "IGNIV",
              notes: "Michelin-starred sharing concept restaurant",
              tag: "food"
            }
          ]
        },
        {
          day: "5",
          title: "St. Moritz Elegance",
          activities: [
            {
              title: "Bernina Express First Class",
              time: "09:00",
              location: "St. Moritz Station",
              locationName: "St. Moritz",
              notes: "UNESCO World Heritage railway route",
              tag: "sightseeing"
            },
            {
              title: "Ice Driving Experience",
              time: "14:00",
              location: "Frozen Lake St. Moritz",
              locationName: "Lake St. Moritz",
              latitude: 46.4950,
              longitude: 9.8416,
              notes: "Drive luxury cars on frozen lake with instructor",
              tag: "adventure"
            },
            {
              title: "Afternoon Tea at Badrutt's",
              time: "16:00",
              location: "Le Grand Hall",
              locationName: "Badrutt's Palace",
              notes: "Traditional afternoon tea with live piano",
              tag: "food"
            },
            {
              title: "Casino Royale Evening",
              time: "20:00",
              location: "Casino St. Moritz",
              locationName: "Casino",
              latitude: 46.4992,
              longitude: 9.8448,
              notes: "Try your luck at Switzerland's highest casino",
              tag: "entertainment"
            }
          ]
        },
        {
          day: "6",
          title: "Interlaken & Jungfraujoch",
          activities: [
            {
              title: "Scenic Train to Interlaken",
              time: "08:00",
              location: "St. Moritz",
              locationName: "Station",
              notes: "First-class panoramic journey",
              tag: "transport"
            },
            {
              title: "Jungfraujoch - Top of Europe",
              time: "11:00",
              location: "Jungfraujoch",
              locationName: "Jungfraujoch",
              latitude: 46.5474,
              longitude: 7.9856,
              notes: "Europe's highest railway station at 3,454m",
              tag: "sightseeing"
            },
            {
              title: "Ice Palace Visit",
              time: "13:00",
              location: "Ice Palace",
              locationName: "Jungfraujoch",
              notes: "Magical ice sculptures inside the glacier",
              tag: "attraction"
            },
            {
              title: "Victoria Jungfrau Check-in",
              time: "17:00",
              location: "Victoria Jungfrau Grand Hotel",
              locationName: "Victoria Jungfrau",
              latitude: 46.6863,
              longitude: 7.8632,
              notes: "5-star grand hotel with mountain views",
              tag: "accommodation"
            },
            {
              title: "La Terrasse Dinner",
              time: "19:30",
              location: "Restaurant La Terrasse",
              locationName: "Victoria Jungfrau",
              notes: "Fine dining with Eiger, Mönch and Jungfrau views",
              tag: "food"
            }
          ]
        },
        {
          day: "7",
          title: "Farewell Switzerland",
          activities: [
            {
              title: "Harder Kulm Funicular",
              time: "09:00",
              location: "Harder Kulm",
              locationName: "Harder Kulm",
              latitude: 46.6989,
              longitude: 7.8507,
              notes: "Panoramic viewpoint over Interlaken",
              tag: "sightseeing"
            },
            {
              title: "Swiss Watch Shopping",
              time: "11:00",
              location: "Kirchhofer",
              locationName: "Watch Boutique",
              notes: "Exclusive Swiss timepiece shopping",
              tag: "shopping"
            },
            {
              title: "Transfer to Zurich Airport",
              time: "14:00",
              location: "Interlaken",
              locationName: "Victoria Jungfrau",
              notes: "Private transfer through scenic route",
              tag: "transport"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Dubai Ultimate Luxury",
    slug: "dubai-ultimate-luxury",
    description: "Experience Dubai's extraordinary opulence with stays in 7-star hotels, private yacht charters, helicopter tours, desert safaris in vintage Land Rovers, and exclusive access to the world's most luxurious attractions.",
    price: 35,
    destinations: ["Dubai", "UAE", "Abu Dhabi"],
    duration: 5,
    tags: ["luxury", "city", "desert", "shopping", "modern", "exclusive"],
    cover_image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    trip_data: {
      title: "Dubai Ultimate Luxury",
      duration: 5,
      city: "Dubai",
      country: "United Arab Emirates",
      cityLatitude: 25.2048,
      cityLongitude: 55.2708,
      days: [
        {
          day: "1",
          title: "Arrival & Burj Al Arab",
          activities: [
            {
              title: "VIP Airport Arrival",
              time: "14:00",
              location: "Dubai International Airport",
              locationName: "DXB Airport",
              latitude: 25.2532,
              longitude: 55.3657,
              notes: "Fast-track immigration and Rolls-Royce transfer",
              tag: "transport"
            },
            {
              title: "Burj Al Arab Check-in",
              time: "15:30",
              location: "Burj Al Arab",
              locationName: "Burj Al Arab",
              latitude: 25.1413,
              longitude: 55.1853,
              notes: "World's most luxurious hotel - 7-star experience",
              tag: "accommodation"
            },
            {
              title: "Gold Cappuccino at Sahn Eddar",
              time: "17:00",
              location: "Sahn Eddar Lounge",
              locationName: "Burj Al Arab",
              notes: "24-karat gold flakes cappuccino in the atrium",
              tag: "luxury"
            },
            {
              title: "Underwater Dining at Al Mahara",
              time: "19:30",
              location: "Al Mahara Restaurant",
              locationName: "Burj Al Arab",
              notes: "Seafood dining surrounded by aquarium",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Sky High & Shopping",
          activities: [
            {
              title: "Burj Khalifa VIP Experience",
              time: "10:00",
              location: "Burj Khalifa",
              locationName: "Burj Khalifa",
              latitude: 25.1972,
              longitude: 55.2744,
              notes: "Private access to 148th floor SKY lounge",
              tag: "sightseeing"
            },
            {
              title: "Lunch at At.mosphere",
              time: "12:30",
              location: "At.mosphere Restaurant",
              locationName: "Burj Khalifa Level 122",
              notes: "World's highest restaurant",
              tag: "food"
            },
            {
              title: "Dubai Mall VIP Shopping",
              time: "14:30",
              location: "Dubai Mall",
              locationName: "Dubai Mall",
              latitude: 25.1979,
              longitude: 55.2793,
              notes: "Personal shopper service at luxury boutiques",
              tag: "shopping"
            },
            {
              title: "Dubai Fountain Show",
              time: "18:00",
              location: "Dubai Fountain",
              locationName: "Burj Lake",
              notes: "Private boat ride during fountain show",
              tag: "entertainment"
            },
            {
              title: "Dinner at Nobu",
              time: "20:00",
              location: "Nobu Dubai",
              locationName: "Atlantis The Palm",
              latitude: 25.1304,
              longitude: 55.1173,
              notes: "Japanese-Peruvian fusion by celebrity chef",
              tag: "food"
            }
          ]
        },
        {
          day: "3",
          title: "Desert Safari Luxury",
          activities: [
            {
              title: "Helicopter City Tour",
              time: "09:00",
              location: "HeliDubai",
              locationName: "Police Academy",
              latitude: 25.1527,
              longitude: 55.3926,
              notes: "22-minute aerial tour of Dubai's icons",
              tag: "luxury"
            },
            {
              title: "Platinum Desert Safari",
              time: "15:00",
              location: "Dubai Desert Conservation Reserve",
              locationName: "Desert Camp",
              latitude: 24.9133,
              longitude: 55.5802,
              notes: "Vintage Land Rover, falconry, camel ride",
              tag: "adventure"
            },
            {
              title: "Bedouin Camp Experience",
              time: "18:00",
              location: "Al Maha Desert Resort",
              locationName: "Desert Camp",
              notes: "Henna, shisha, belly dancing show",
              tag: "culture"
            },
            {
              title: "Desert BBQ Under Stars",
              time: "20:00",
              location: "Private Desert Camp",
              locationName: "Desert",
              notes: "7-course dinner with astronomy session",
              tag: "food"
            }
          ]
        },
        {
          day: "4",
          title: "Yacht & Beach Club",
          activities: [
            {
              title: "Private Yacht Charter",
              time: "10:00",
              location: "Dubai Marina",
              locationName: "Marina Yacht Club",
              latitude: 25.0774,
              longitude: 55.1337,
              notes: "Full day on 100ft luxury yacht with crew",
              tag: "luxury"
            },
            {
              title: "Swimming at Atlantis",
              time: "13:00",
              location: "Aquaventure Waterpark",
              locationName: "Atlantis The Palm",
              notes: "VIP access to waterpark and private cabana",
              tag: "leisure"
            },
            {
              title: "Afternoon Tea at Burj Al Arab",
              time: "16:00",
              location: "Skyview Bar",
              locationName: "Burj Al Arab",
              notes: "Gold-leafed pastries with panoramic views",
              tag: "food"
            },
            {
              title: "Spa at Talise",
              time: "18:00",
              location: "Talise Ottoman Spa",
              locationName: "Jumeirah Zabeel Saray",
              latitude: 25.1172,
              longitude: 55.1178,
              notes: "Turkish hammam and signature treatments",
              tag: "spa"
            }
          ]
        },
        {
          day: "5",
          title: "Farewell Dubai",
          activities: [
            {
              title: "Gold Souk Shopping",
              time: "10:00",
              location: "Dubai Gold Souk",
              locationName: "Deira Gold Souk",
              latitude: 25.2696,
              longitude: 55.2967,
              notes: "World's largest gold market",
              tag: "shopping"
            },
            {
              title: "Abra Boat & Spice Souk",
              time: "11:30",
              location: "Dubai Creek",
              locationName: "Creek Crossing",
              notes: "Traditional boat ride and spice market",
              tag: "culture"
            },
            {
              title: "Farewell Lunch at Pierchic",
              time: "13:00",
              location: "Pierchic Restaurant",
              locationName: "Al Qasr Hotel",
              latitude: 25.1311,
              longitude: 55.1848,
              notes: "Over-water dining with Dubai skyline views",
              tag: "food"
            },
            {
              title: "Rolls-Royce Airport Transfer",
              time: "16:00",
              location: "Burj Al Arab",
              locationName: "Hotel",
              notes: "Chauffeur service to airport",
              tag: "transport"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Santorini Honeymoon",
    slug: "santorini-honeymoon",
    description: "Romance in the Greek islands with cliffside infinity pools, private sunset sailing, wine tasting in ancient vineyards, and candlelit dinners overlooking the caldera. The perfect honeymoon escape.",
    price: 40,
    destinations: ["Santorini", "Greece", "Mykonos"],
    duration: 6,
    tags: ["honeymoon", "romantic", "luxury", "island", "wine", "sunset"],
    cover_image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800",
    trip_data: {
      title: "Santorini Honeymoon",
      duration: 6,
      city: "Santorini",
      country: "Greece",
      cityLatitude: 36.3932,
      cityLongitude: 25.4615,
      days: [
        {
          day: "1",
          title: "Arrival in Paradise",
          activities: [
            {
              title: "Airport Transfer by Helicopter",
              time: "14:00",
              location: "Santorini Airport",
              locationName: "JTR Airport",
              latitude: 36.4000,
              longitude: 25.4793,
              notes: "5-minute scenic helicopter transfer to Oia",
              tag: "transport"
            },
            {
              title: "Canaves Oia Epitome Check-in",
              time: "14:30",
              location: "Canaves Oia Epitome",
              locationName: "Canaves Oia",
              latitude: 36.4618,
              longitude: 25.3753,
              notes: "Private pool villa with caldera views",
              tag: "accommodation"
            },
            {
              title: "Welcome Champagne",
              time: "16:00",
              location: "Private Terrace",
              locationName: "Your Villa",
              notes: "Champagne and fruit platter on arrival",
              tag: "luxury"
            },
            {
              title: "Sunset at Oia Castle",
              time: "19:00",
              location: "Oia Castle",
              locationName: "Byzantine Castle Ruins",
              latitude: 36.4616,
              longitude: 25.3737,
              notes: "World-famous sunset viewing spot",
              tag: "romantic"
            },
            {
              title: "Private Dinner on Terrace",
              time: "20:30",
              location: "Villa Terrace",
              locationName: "Canaves Oia",
              notes: "Chef-prepared dinner with caldera views",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Sailing & Wine",
          activities: [
            {
              title: "Floating Breakfast",
              time: "09:00",
              location: "Private Pool",
              locationName: "Your Villa",
              notes: "Breakfast served floating in your pool",
              tag: "luxury"
            },
            {
              title: "Luxury Catamaran Cruise",
              time: "11:00",
              location: "Ammoudi Bay",
              locationName: "Ammoudi Port",
              latitude: 36.4644,
              longitude: 25.3671,
              notes: "Private catamaran with crew and chef",
              tag: "sailing"
            },
            {
              title: "Swimming at Red Beach",
              time: "13:00",
              location: "Red Beach",
              locationName: "Kokkini Paralia",
              latitude: 36.3486,
              longitude: 25.3947,
              notes: "Unique red volcanic sand beach",
              tag: "beach"
            },
            {
              title: "Seafood Lunch on Board",
              time: "14:00",
              location: "Catamaran",
              locationName: "At Sea",
              notes: "Fresh grilled seafood and Greek salads",
              tag: "food"
            },
            {
              title: "Hot Springs & Sunset",
              time: "17:00",
              location: "Palea Kameni",
              locationName: "Volcanic Hot Springs",
              latitude: 36.3983,
              longitude: 25.3886,
              notes: "Swim in therapeutic volcanic waters",
              tag: "nature"
            },
            {
              title: "Dinner at Lauda",
              time: "20:00",
              location: "Lauda Restaurant",
              locationName: "Oia",
              latitude: 36.4615,
              longitude: 25.3755,
              notes: "Fine dining with modern Greek cuisine",
              tag: "food"
            }
          ]
        },
        {
          day: "3",
          title: "Exploring Santorini",
          activities: [
            {
              title: "Sunrise Yoga Session",
              time: "06:30",
              location: "Villa Terrace",
              locationName: "Canaves Oia",
              notes: "Private yoga with sunrise views",
              tag: "wellness"
            },
            {
              title: "Ancient Akrotiri Tour",
              time: "10:00",
              location: "Akrotiri Archaeological Site",
              locationName: "Akrotiri",
              latitude: 36.3517,
              longitude: 25.4034,
              notes: "Minoan Bronze Age settlement - 'Pompeii of the Aegean'",
              tag: "culture"
            },
            {
              title: "Wine Tasting at Santo Wines",
              time: "13:00",
              location: "Santo Wines Winery",
              locationName: "Santo Wines",
              latitude: 36.3710,
              longitude: 25.4311,
              notes: "Cliffside winery with panoramic caldera views",
              tag: "wine"
            },
            {
              title: "Couples Spa Treatment",
              time: "16:00",
              location: "Canaves Spa",
              locationName: "Spa",
              notes: "Signature couples massage and facial",
              tag: "spa"
            },
            {
              title: "Dinner at Selene",
              time: "20:00",
              location: "Selene Restaurant",
              locationName: "Pyrgos",
              latitude: 36.3833,
              longitude: 25.4495,
              notes: "Michelin-recommended with sunset views",
              tag: "food"
            }
          ]
        },
        {
          day: "4",
          title: "Beach Day & Romance",
          activities: [
            {
              title: "Transfer to Perivolos Beach",
              time: "10:00",
              location: "Perivolos Beach",
              locationName: "Perivolos",
              latitude: 36.3582,
              longitude: 25.4534,
              notes: "Black sand beach with beach clubs",
              tag: "beach"
            },
            {
              title: "Beach Club Luxury",
              time: "11:00",
              location: "Wet Stories Beach Bar",
              locationName: "Perivolos Beach",
              notes: "Premium sunbeds, cocktails, and DJ",
              tag: "leisure"
            },
            {
              title: "Beachside Lunch",
              time: "13:30",
              location: "Seaside Santorini",
              locationName: "Beach Restaurant",
              notes: "Fresh seafood with feet in the sand",
              tag: "food"
            },
            {
              title: "ATV Adventure to Lighthouse",
              time: "16:00",
              location: "Akrotiri Lighthouse",
              locationName: "Faros",
              latitude: 36.3386,
              longitude: 25.3523,
              notes: "Ride ATVs to southwestern tip of island",
              tag: "adventure"
            },
            {
              title: "Private Cinema Under Stars",
              time: "20:30",
              location: "Open Air Cinema Kamari",
              locationName: "Kamari",
              latitude: 36.3770,
              longitude: 25.4881,
              notes: "Private screening of romantic movie",
              tag: "entertainment"
            }
          ]
        },
        {
          day: "5",
          title: "Mykonos Day Trip",
          activities: [
            {
              title: "High-Speed Ferry to Mykonos",
              time: "08:00",
              location: "Athinios Port",
              locationName: "Port",
              latitude: 36.3875,
              longitude: 25.4318,
              notes: "2.5 hour journey to party island",
              tag: "transport"
            },
            {
              title: "Mykonos Town Walking Tour",
              time: "11:00",
              location: "Mykonos Town",
              locationName: "Chora",
              latitude: 37.4467,
              longitude: 25.3289,
              notes: "Windmills, Little Venice, and boutiques",
              tag: "sightseeing"
            },
            {
              title: "Lunch at Nammos",
              time: "13:00",
              location: "Nammos Beach Club",
              locationName: "Psarou Beach",
              latitude: 37.4189,
              longitude: 25.3427,
              notes: "Celebrity hotspot beach club",
              tag: "food"
            },
            {
              title: "Beach Time at Paradise",
              time: "15:00",
              location: "Paradise Beach",
              locationName: "Paradise",
              latitude: 37.4111,
              longitude: 25.3486,
              notes: "Famous party beach with crystal waters",
              tag: "beach"
            },
            {
              title: "Return Ferry to Santorini",
              time: "18:00",
              location: "Mykonos Port",
              locationName: "Port",
              notes: "Evening return to Santorini",
              tag: "transport"
            }
          ]
        },
        {
          day: "6",
          title: "Farewell Santorini",
          activities: [
            {
              title: "Sunrise Photo Shoot",
              time: "06:00",
              location: "Blue Domes of Oia",
              locationName: "Three Blue Domes",
              latitude: 36.4609,
              longitude: 25.3758,
              notes: "Professional photographer for couple photos",
              tag: "romantic"
            },
            {
              title: "Farewell Brunch",
              time: "10:00",
              location: "Elements Restaurant",
              locationName: "Canaves Oia",
              notes: "Final meal with caldera views",
              tag: "food"
            },
            {
              title: "Last-Minute Shopping",
              time: "12:00",
              location: "Oia Main Street",
              locationName: "Oia",
              notes: "Local art, jewelry, and souvenirs",
              tag: "shopping"
            },
            {
              title: "Helicopter to Airport",
              time: "15:00",
              location: "Oia Helipad",
              locationName: "Helipad",
              notes: "Scenic farewell flight to airport",
              tag: "transport"
            }
          ]
        }
      ]
    }
  },
  {
    title: "Japanese Ryokan Experience",
    slug: "japanese-ryokan-experience",
    description: "Immerse yourself in Japanese luxury with stays in exclusive ryokans, private geisha performances, Michelin-starred kaiseki dining, bullet train first-class travel, and sacred temple experiences.",
    price: 35,
    destinations: ["Tokyo", "Kyoto", "Hakone", "Japan"],
    duration: 7,
    tags: ["luxury", "culture", "spa", "cuisine", "traditional", "zen"],
    cover_image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
    trip_data: {
      title: "Japanese Ryokan Experience",
      duration: 7,
      city: "Tokyo",
      country: "Japan",
      cityLatitude: 35.6762,
      cityLongitude: 139.6503,
      days: [
        {
          day: "1",
          title: "Tokyo Arrival",
          activities: [
            {
              title: "VIP Airport Welcome",
              time: "14:00",
              location: "Narita Airport",
              locationName: "NRT Airport",
              latitude: 35.7720,
              longitude: 140.3929,
              notes: "Meet & greet service with private transfer",
              tag: "transport"
            },
            {
              title: "Aman Tokyo Check-in",
              time: "16:00",
              location: "Aman Tokyo",
              locationName: "Aman Tokyo",
              latitude: 35.6870,
              longitude: 139.7669,
              notes: "Urban sanctuary with Imperial Palace views",
              tag: "accommodation"
            },
            {
              title: "Welcome Tea Ceremony",
              time: "17:30",
              location: "Aman Lounge",
              locationName: "Hotel",
              notes: "Traditional tea ceremony introduction",
              tag: "culture"
            },
            {
              title: "Sushi Omakase at Sukiyabashi Jiro",
              time: "19:30",
              location: "Sukiyabashi Jiro",
              locationName: "Ginza",
              latitude: 35.6714,
              longitude: 139.7620,
              notes: "3-Michelin star sushi experience",
              tag: "food"
            }
          ]
        },
        {
          day: "2",
          title: "Tokyo Highlights",
          activities: [
            {
              title: "Tsukiji Outer Market Tour",
              time: "06:00",
              location: "Tsukiji Market",
              locationName: "Tsukiji",
              latitude: 35.6654,
              longitude: 139.7707,
              notes: "Fresh sushi breakfast and market exploration",
              tag: "food"
            },
            {
              title: "Imperial Palace & Gardens",
              time: "10:00",
              location: "Imperial Palace",
              locationName: "Chiyoda",
              latitude: 35.6852,
              longitude: 139.7528,
              notes: "Private guided tour of palace grounds",
              tag: "culture"
            },
            {
              title: "Lunch at Kozasa",
              time: "13:00",
              location: "Kozasa",
              locationName: "Asakusa",
              latitude: 35.7148,
              longitude: 139.7967,
              notes: "Tempura kaiseki experience",
              tag: "food"
            },
            {
              title: "Senso-ji Temple & Asakusa",
              time: "15:00",
              location: "Senso-ji Temple",
              locationName: "Asakusa",
              latitude: 35.7148,
              longitude: 139.7967,
              notes: "Tokyo's oldest temple and traditional shopping",
              tag: "culture"
            },
            {
              title: "Spa at Aman Tokyo",
              time: "17:30",
              location: "Aman Spa",
              locationName: "Aman Tokyo",
              notes: "Japanese hot bath and massage",
              tag: "spa"
            },
            {
              title: "Rooftop Bar at New York Grill",
              time: "20:00",
              location: "Park Hyatt Tokyo",
              locationName: "Shinjuku",
              latitude: 35.6859,
              longitude: 139.6916,
              notes: "Lost in Translation bar with city views",
              tag: "nightlife"
            }
          ]
        },
        {
          day: "3",
          title: "Bullet Train to Kyoto",
          activities: [
            {
              title: "Green Car Shinkansen",
              time: "09:00",
              location: "Tokyo Station",
              locationName: "Tokyo Station",
              latitude: 35.6812,
              longitude: 139.7671,
              notes: "First-class bullet train to Kyoto",
              tag: "transport"
            },
            {
              title: "Ekiben Lunch on Train",
              time: "11:30",
              location: "Shinkansen",
              locationName: "On Train",
              notes: "Premium bento box on bullet train",
              tag: "food"
            },
            {
              title: "Tawaraya Ryokan Check-in",
              time: "13:00",
              location: "Tawaraya Ryokan",
              locationName: "Kyoto",
              latitude: 35.0094,
              longitude: 135.7680,
              notes: "300-year-old luxury ryokan",
              tag: "accommodation"
            },
            {
              title: "Fushimi Inari Shrine",
              time: "15:00",
              location: "Fushimi Inari",
              locationName: "Fushimi",
              latitude: 34.9671,
              longitude: 135.7727,
              notes: "Thousands of vermillion torii gates",
              tag: "culture"
            },
            {
              title: "Kaiseki Dinner at Ryokan",
              time: "19:00",
              location: "Tawaraya Ryokan",
              locationName: "In-room",
              notes: "Multi-course traditional kaiseki served in room",
              tag: "food"
            }
          ]
        },
        {
          day: "4",
          title: "Kyoto Temples & Geisha",
          activities: [
            {
              title: "Golden Pavilion at Dawn",
              time: "07:00",
              location: "Kinkaku-ji",
              locationName: "Kinkaku-ji",
              latitude: 35.0394,
              longitude: 135.7292,
              notes: "Private early access to Golden Pavilion",
              tag: "culture"
            },
            {
              title: "Bamboo Grove Walk",
              time: "09:00",
              location: "Arashiyama Bamboo Forest",
              locationName: "Arashiyama",
              latitude: 35.0170,
              longitude: 135.6719,
              notes: "Mystical bamboo forest walk",
              tag: "nature"
            },
            {
              title: "Traditional Crafts Workshop",
              time: "11:00",
              location: "Kyoto Handicraft Center",
              locationName: "Craft Center",
              notes: "Private pottery or textile dyeing class",
              tag: "culture"
            },
            {
              title: "Lunch at Kikunoi",
              time: "13:00",
              location: "Kikunoi",
              locationName: "Higashiyama",
              latitude: 35.0016,
              longitude: 135.7751,
              notes: "3-Michelin star kaiseki restaurant",
              tag: "food"
            },
            {
              title: "Private Geisha Performance",
              time: "18:00",
              location: "Gion Ochaya",
              locationName: "Gion",
              latitude: 35.0087,
              longitude: 135.7755,
              notes: "Exclusive geisha and maiko entertainment",
              tag: "culture"
            }
          ]
        },
        {
          day: "5",
          title: "Hakone Hot Springs",
          activities: [
            {
              title: "Train to Hakone",
              time: "09:00",
              location: "Kyoto Station",
              locationName: "Station",
              notes: "Scenic train to mountain resort town",
              tag: "transport"
            },
            {
              title: "Gora Kadan Check-in",
              time: "12:00",
              location: "Gora Kadan",
              locationName: "Hakone",
              latitude: 35.2485,
              longitude: 139.0414,
              notes: "Former imperial family summer villa",
              tag: "accommodation"
            },
            {
              title: "Private Onsen Experience",
              time: "14:00",
              location: "Gora Kadan",
              locationName: "Private Onsen",
              notes: "Natural hot spring bath in room",
              tag: "spa"
            },
            {
              title: "Mount Fuji Views",
              time: "16:00",
              location: "Owakudani Valley",
              locationName: "Owakudani",
              latitude: 35.2441,
              longitude: 139.0195,
              notes: "Cable car with Fuji views and volcanic valley",
              tag: "nature"
            },
            {
              title: "In-Room Kaiseki",
              time: "19:00",
              location: "Gora Kadan",
              locationName: "Your Room",
              notes: "Private multi-course dinner in yukata",
              tag: "food"
            }
          ]
        },
        {
          day: "6",
          title: "Return to Tokyo",
          activities: [
            {
              title: "Morning Onsen",
              time: "07:00",
              location: "Gora Kadan",
              locationName: "Hot Springs",
              notes: "Final soak in therapeutic waters",
              tag: "spa"
            },
            {
              title: "Hakone Open-Air Museum",
              time: "10:00",
              location: "Hakone Open-Air Museum",
              locationName: "Museum",
              latitude: 35.2452,
              longitude: 139.0506,
              notes: "Sculpture park with mountain backdrop",
              tag: "culture"
            },
            {
              title: "Romance Car to Tokyo",
              time: "14:00",
              location: "Hakone-Yumoto Station",
              locationName: "Station",
              notes: "Panoramic window train to Tokyo",
              tag: "transport"
            },
            {
              title: "Ginza Shopping",
              time: "16:00",
              location: "Ginza",
              locationName: "Ginza",
              latitude: 35.6717,
              longitude: 139.7650,
              notes: "Luxury shopping district exploration",
              tag: "shopping"
            },
            {
              title: "Farewell Dinner at Narisawa",
              time: "19:00",
              location: "Narisawa",
              locationName: "Minato",
              latitude: 35.6685,
              longitude: 139.7287,
              notes: "2-Michelin star innovative Japanese",
              tag: "food"
            }
          ]
        },
        {
          day: "7",
          title: "Departure",
          activities: [
            {
              title: "Meiji Shrine Visit",
              time: "09:00",
              location: "Meiji Shrine",
              locationName: "Shibuya",
              latitude: 35.6764,
              longitude: 139.6993,
              notes: "Peaceful shrine in forest setting",
              tag: "culture"
            },
            {
              title: "Last-Minute Shopping",
              time: "11:00",
              location: "Takashimaya",
              locationName: "Department Store",
              notes: "Depachika food floor for gifts",
              tag: "shopping"
            },
            {
              title: "Airport Transfer",
              time: "14:00",
              location: "Aman Tokyo",
              locationName: "Hotel",
              notes: "Private car to airport",
              tag: "transport"
            }
          ]
        }
      ]
    }
  }
];

async function seedLuxuryTemplates() {
  try {
    logger.info("Starting luxury templates seed...");

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
    for (const template of luxuryTemplates) {
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

    logger.info("Luxury templates seed completed successfully!");
  } catch (error) {
    logger.error("Error seeding luxury templates:", error);
    process.exit(1);
  }
}

// Run the seed
seedLuxuryTemplates().then(() => {
  logger.info("Seed script finished");
  process.exit(0);
}).catch((error) => {
  logger.error("Seed script failed:", error);
  process.exit(1);
});