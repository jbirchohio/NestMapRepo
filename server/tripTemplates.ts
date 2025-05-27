export interface TemplateActivity {
  title: string;
  time: string;
  locationName: string;
  notes?: string;
  tag?: string;
  day: number; // Which day of the trip (1-based)
  latitude?: string;
  longitude?: string;
}

export interface TripTemplate {
  id: string;
  title: string;
  description: string;
  duration: number; // days
  city: string;
  country: string;
  imageUrl?: string;
  tags: string[];
  activities: TemplateActivity[];
  suggestedTodos: string[];
  notes?: string;
  bestTimeToVisit?: string;
  budget?: {
    low: number;
    medium: number;
    high: number;
  };
}

export const tripTemplates: TripTemplate[] = [
  {
    id: "nyc-weekend",
    title: "NYC Weekend Getaway",
    description: "Experience the best of New York City in 3 days - from iconic landmarks to world-class dining",
    duration: 3,
    city: "New York City",
    country: "USA",
    tags: ["City Break", "Culture", "Food", "Shopping"],
    activities: [
      {
        title: "Central Park Walk",
        time: "09:00",
        locationName: "Central Park",
        notes: "Start with Bethesda Fountain and walk to Strawberry Fields",
        tag: "Sightseeing",
        day: 1,
        latitude: "40.7829",
        longitude: "-73.9654"
      },
      {
        title: "Metropolitan Museum of Art",
        time: "11:30",
        locationName: "Metropolitan Museum of Art",
        notes: "Focus on Egyptian Art and American Wing. Allow 3 hours minimum",
        tag: "Culture",
        day: 1,
        latitude: "40.7794",
        longitude: "-73.9632"
      },
      {
        title: "Lunch at The Plaza Food Hall",
        time: "14:30",
        locationName: "The Plaza Food Hall",
        notes: "Great variety of gourmet options in iconic location",
        tag: "Food",
        day: 1,
        latitude: "40.7647",
        longitude: "-73.9753"
      },
      {
        title: "Times Square & Broadway",
        time: "16:00",
        locationName: "Times Square",
        notes: "Walk around, take photos, check out Broadway show availability",
        tag: "Sightseeing",
        day: 1,
        latitude: "40.7580",
        longitude: "-73.9855"
      },
      {
        title: "Dinner in Little Italy",
        time: "19:00",
        locationName: "Little Italy",
        notes: "Try Lombardi's for authentic coal oven pizza",
        tag: "Food",
        day: 1,
        latitude: "40.7190",
        longitude: "-73.9956"
      },
      {
        title: "Statue of Liberty & Ellis Island",
        time: "09:00",
        locationName: "Battery Park",
        notes: "Take early ferry to avoid crowds. Book tickets in advance",
        tag: "Sightseeing",
        day: 2,
        latitude: "40.7033",
        longitude: "-74.0170"
      },
      {
        title: "9/11 Memorial & Museum",
        time: "14:00",
        locationName: "9/11 Memorial & Museum",
        notes: "Very moving experience, allow 2-3 hours",
        tag: "Culture",
        day: 2,
        latitude: "40.7115",
        longitude: "-74.0134"
      },
      {
        title: "Brooklyn Bridge Walk",
        time: "16:30",
        locationName: "Brooklyn Bridge",
        notes: "Walk from Manhattan to Brooklyn for best views",
        tag: "Sightseeing",
        day: 2,
        latitude: "40.7061",
        longitude: "-73.9969"
      },
      {
        title: "DUMBO & Brooklyn Bridge Park",
        time: "17:30",
        locationName: "DUMBO Brooklyn",
        notes: "Great views of Manhattan skyline and photo opportunities",
        tag: "Sightseeing",
        day: 2,
        latitude: "40.7033",
        longitude: "-73.9890"
      },
      {
        title: "High Line Park",
        time: "10:00",
        locationName: "High Line",
        notes: "Start at Gansevoort Street entrance, walk north",
        tag: "Sightseeing",
        day: 3,
        latitude: "40.7479",
        longitude: "-74.0047"
      },
      {
        title: "Chelsea Market",
        time: "11:30",
        locationName: "Chelsea Market",
        notes: "Food market with great variety for lunch",
        tag: "Food",
        day: 3,
        latitude: "40.7425",
        longitude: "-74.0061"
      },
      {
        title: "Empire State Building",
        time: "14:00",
        locationName: "Empire State Building",
        notes: "Book skip-the-line tickets. Best views in late afternoon",
        tag: "Sightseeing",
        day: 3,
        latitude: "40.7484",
        longitude: "-73.9857"
      },
      {
        title: "Shopping on Fifth Avenue",
        time: "16:00",
        locationName: "Fifth Avenue",
        notes: "From Empire State to Central Park - Macy's, Tiffany & Co, Apple Store",
        tag: "Shopping",
        day: 3,
        latitude: "40.7589",
        longitude: "-73.9851"
      }
    ],
    suggestedTodos: [
      "Book Broadway show tickets in advance",
      "Download NYC subway app (Citymapper)",
      "Bring comfortable walking shoes",
      "Check museum hours and book timed entry",
      "Download offline maps"
    ],
    notes: "New York is a walking city! Expect to walk 15,000+ steps per day. The subway is the fastest way to get around. Tipping is expected at restaurants (18-20%).",
    bestTimeToVisit: "April-June, September-November",
    budget: {
      low: 150,
      medium: 300,
      high: 500
    }
  },
  {
    id: "paris-romantic",
    title: "Romantic Paris",
    description: "A 4-day romantic escape through the City of Light with iconic landmarks and intimate experiences",
    duration: 4,
    city: "Paris",
    country: "France",
    tags: ["Romance", "Culture", "Food", "Art"],
    activities: [
      {
        title: "Arrive & Seine River Cruise",
        time: "15:00",
        locationName: "Pont Neuf",
        notes: "Perfect introduction to Paris landmarks from the water",
        tag: "Sightseeing",
        day: 1,
        latitude: "48.8566",
        longitude: "2.3412"
      },
      {
        title: "Dinner at Le Procope",
        time: "19:30",
        locationName: "Le Procope",
        notes: "Historic restaurant in Saint-Germain, oldest café in Paris",
        tag: "Food",
        day: 1,
        latitude: "48.8530",
        longitude: "2.3387"
      },
      {
        title: "Louvre Museum",
        time: "09:00",
        locationName: "Louvre Museum",
        notes: "Pre-book tickets! Focus on highlights: Mona Lisa, Venus de Milo",
        tag: "Culture",
        day: 2,
        latitude: "48.8606",
        longitude: "2.3376"
      },
      {
        title: "Tuileries Garden Stroll",
        time: "12:30",
        locationName: "Tuileries Garden",
        notes: "Beautiful gardens between Louvre and Place de la Concorde",
        tag: "Sightseeing",
        day: 2,
        latitude: "48.8634",
        longitude: "2.3275"
      },
      {
        title: "Lunch at Angelina",
        time: "13:30",
        locationName: "Angelina",
        notes: "Famous for hot chocolate and pastries since 1903",
        tag: "Food",
        day: 2,
        latitude: "48.8656",
        longitude: "2.3212"
      },
      {
        title: "Eiffel Tower",
        time: "16:00",
        locationName: "Eiffel Tower",
        notes: "Book elevator tickets in advance. Best photos from Trocadéro",
        tag: "Sightseeing",
        day: 2,
        latitude: "48.8584",
        longitude: "2.2945"
      },
      {
        title: "Sunset at Trocadéro",
        time: "18:00",
        locationName: "Trocadéro",
        notes: "Perfect spot for romantic Eiffel Tower photos at golden hour",
        tag: "Romance",
        day: 2,
        latitude: "48.8619",
        longitude: "2.2886"
      },
      {
        title: "Montmartre & Sacré-Cœur",
        time: "10:00",
        locationName: "Montmartre",
        notes: "Take the funicular up the hill, explore artist studios",
        tag: "Culture",
        day: 3,
        latitude: "48.8867",
        longitude: "2.3431"
      },
      {
        title: "Artist Square (Place du Tertre)",
        time: "11:30",
        locationName: "Place du Tertre",
        notes: "Get your portrait drawn by street artists",
        tag: "Romance",
        day: 3,
        latitude: "48.8865",
        longitude: "2.3407"
      },
      {
        title: "Lunch in Montmartre",
        time: "13:00",
        locationName: "Le Moulin de la Galette",
        notes: "Historic windmill restaurant with traditional French cuisine",
        tag: "Food",
        day: 3,
        latitude: "48.8853",
        longitude: "2.3393"
      },
      {
        title: "Latin Quarter Walk",
        time: "15:30",
        locationName: "Latin Quarter",
        notes: "Explore narrow medieval streets, bookshops, and cafés",
        tag: "Culture",
        day: 3,
        latitude: "48.8534",
        longitude: "2.3488"
      },
      {
        title: "Notre-Dame Island",
        time: "17:00",
        locationName: "Île de la Cité",
        notes: "Visit Sainte-Chapelle for stunning stained glass",
        tag: "Culture",
        day: 3,
        latitude: "48.8547",
        longitude: "2.3484"
      },
      {
        title: "Versailles Day Trip",
        time: "09:00",
        locationName: "Palace of Versailles",
        notes: "Take RER C train. Book timed entry tickets. Full day experience",
        tag: "Culture",
        day: 4,
        latitude: "48.8049",
        longitude: "2.1204"
      },
      {
        title: "Versailles Gardens",
        time: "14:00",
        locationName: "Gardens of Versailles",
        notes: "Rent bikes or golf cart to explore the vast gardens",
        tag: "Sightseeing",
        day: 4,
        latitude: "48.8048",
        longitude: "2.1203"
      }
    ],
    suggestedTodos: [
      "Learn basic French phrases",
      "Book restaurant reservations in advance",
      "Download Paris Metro app",
      "Buy museum pass for skip-the-line access",
      "Pack comfortable walking shoes"
    ],
    notes: "Paris rewards those who embrace the slower pace. Take time for long meals and café sitting. Most museums are closed on Mondays or Tuesdays.",
    bestTimeToVisit: "April-June, September-October",
    budget: {
      low: 120,
      medium: 250,
      high: 450
    }
  },
  {
    id: "tokyo-culture",
    title: "Tokyo Cultural Discovery",
    description: "5 days exploring Tokyo's perfect blend of ancient traditions and modern innovation",
    duration: 5,
    city: "Tokyo",
    country: "Japan",
    tags: ["Culture", "Food", "Technology", "Temples"],
    activities: [
      {
        title: "Senso-ji Temple",
        time: "09:00",
        locationName: "Senso-ji Temple",
        notes: "Tokyo's oldest temple in historic Asakusa district",
        tag: "Culture",
        day: 1,
        latitude: "35.7148",
        longitude: "139.7967"
      },
      {
        title: "Nakamise Shopping Street",
        time: "10:30",
        locationName: "Nakamise-dori",
        notes: "Traditional shopping street leading to temple",
        tag: "Shopping",
        day: 1,
        latitude: "35.7120",
        longitude: "139.7960"
      },
      {
        title: "Tokyo Skytree",
        time: "13:00",
        locationName: "Tokyo Skytree",
        notes: "World's second tallest structure, book fast-track tickets",
        tag: "Sightseeing",
        day: 1,
        latitude: "35.7101",
        longitude: "139.8107"
      },
      {
        title: "Sushi at Tsukiji Outer Market",
        time: "16:00",
        locationName: "Tsukiji Outer Market",
        notes: "Fresh sushi from the famous fish market vendors",
        tag: "Food",
        day: 1,
        latitude: "35.6654",
        longitude: "139.7707"
      },
      {
        title: "Meiji Shrine",
        time: "09:00",
        locationName: "Meiji Shrine",
        notes: "Peaceful Shinto shrine dedicated to Emperor Meiji",
        tag: "Culture",
        day: 2,
        latitude: "35.6762",
        longitude: "139.6993"
      },
      {
        title: "Harajuku & Takeshita Street",
        time: "11:00",
        locationName: "Takeshita Street",
        notes: "Colorful pop culture and fashion district",
        tag: "Culture",
        day: 2,
        latitude: "35.6702",
        longitude: "139.7066"
      },
      {
        title: "Shibuya Crossing",
        time: "14:00",
        locationName: "Shibuya Crossing",
        notes: "World's busiest pedestrian crossing, best viewed from Starbucks",
        tag: "Sightseeing",
        day: 2,
        latitude: "35.6598",
        longitude: "139.7006"
      },
      {
        title: "Robot Restaurant Show",
        time: "19:00",
        locationName: "Robot Restaurant",
        notes: "Unique Japanese entertainment experience in Shinjuku",
        tag: "Entertainment",
        day: 2,
        latitude: "35.6944",
        longitude: "139.7036"
      },
      {
        title: "teamLab Borderless",
        time: "10:00",
        locationName: "teamLab Borderless",
        notes: "Digital art museum - book tickets well in advance!",
        tag: "Art",
        day: 3,
        latitude: "35.6252",
        longitude: "139.7756"
      },
      {
        title: "Ginza Shopping",
        time: "15:00",
        locationName: "Ginza",
        notes: "Upscale shopping district with department stores and boutiques",
        tag: "Shopping",
        day: 3,
        latitude: "35.6724",
        longitude: "139.7656"
      },
      {
        title: "Kaiseki Dinner",
        time: "18:00",
        locationName: "Ginza Kyoboshi",
        notes: "Traditional multi-course Japanese dinner - reserve ahead",
        tag: "Food",
        day: 3,
        latitude: "35.6724",
        longitude: "139.7656"
      }
    ],
    suggestedTodos: [
      "Get JR Pass for unlimited train travel",
      "Download Google Translate with camera feature",
      "Learn basic bowing etiquette",
      "Bring cash - many places don't accept cards",
      "Book teamLab tickets online in advance"
    ],
    notes: "Japan runs on punctuality and respect. Remove shoes when entering homes/temples. Tipping is not customary and can be offensive.",
    bestTimeToVisit: "March-May (Cherry Blossom), September-November",
    budget: {
      low: 100,
      medium: 200,
      high: 400
    }
  },
  {
    id: "london-classics",
    title: "London Classics",
    description: "4 days covering London's most iconic sights, from royal palaces to modern attractions",
    duration: 4,
    city: "London",
    country: "UK",
    tags: ["History", "Culture", "Royal", "Museums"],
    activities: [
      {
        title: "Tower of London",
        time: "09:00",
        locationName: "Tower of London",
        notes: "See the Crown Jewels and learn about royal history",
        tag: "History",
        day: 1,
        latitude: "51.5081",
        longitude: "-0.0759"
      },
      {
        title: "Tower Bridge",
        time: "11:30",
        locationName: "Tower Bridge",
        notes: "Walk across the glass floor and enjoy Thames views",
        tag: "Sightseeing",
        day: 1,
        latitude: "51.5055",
        longitude: "-0.0754"
      },
      {
        title: "Borough Market Lunch",
        time: "13:00",
        locationName: "Borough Market",
        notes: "London's oldest food market with amazing variety",
        tag: "Food",
        day: 1,
        latitude: "51.5051",
        longitude: "-0.0905"
      },
      {
        title: "Tate Modern",
        time: "15:00",
        locationName: "Tate Modern",
        notes: "World-class contemporary art in former power station",
        tag: "Art",
        day: 1,
        latitude: "51.5076",
        longitude: "-0.0994"
      },
      {
        title: "Westminster Abbey",
        time: "09:30",
        locationName: "Westminster Abbey",
        notes: "Royal church where monarchs are crowned and buried",
        tag: "History",
        day: 2,
        latitude: "51.4994",
        longitude: "-0.1273"
      },
      {
        title: "Big Ben & Parliament",
        time: "11:00",
        locationName: "Houses of Parliament",
        notes: "Iconic clock tower and seat of UK government",
        tag: "Sightseeing",
        day: 2,
        latitude: "51.4995",
        longitude: "-0.1248"
      },
      {
        title: "Buckingham Palace",
        time: "12:30",
        locationName: "Buckingham Palace",
        notes: "Check changing of the guard schedule",
        tag: "Royal",
        day: 2,
        latitude: "51.5014",
        longitude: "-0.1419"
      },
      {
        title: "St. James's Park",
        time: "13:30",
        locationName: "St. James's Park",
        notes: "Beautiful royal park perfect for a stroll",
        tag: "Sightseeing",
        day: 2,
        latitude: "51.5023",
        longitude: "-0.1347"
      },
      {
        title: "British Museum",
        time: "10:00",
        locationName: "British Museum",
        notes: "Rosetta Stone, Egyptian mummies, and world artifacts",
        tag: "Culture",
        day: 3,
        latitude: "51.5194",
        longitude: "-0.1270"
      },
      {
        title: "Covent Garden",
        time: "14:00",
        locationName: "Covent Garden",
        notes: "Street performers, shops, and historic market",
        tag: "Shopping",
        day: 3,
        latitude: "51.5120",
        longitude: "-0.1226"
      },
      {
        title: "West End Show",
        time: "19:30",
        locationName: "West End",
        notes: "Book popular shows like Lion King or Hamilton in advance",
        tag: "Entertainment",
        day: 3,
        latitude: "51.5130",
        longitude: "-0.1347"
      }
    ],
    suggestedTodos: [
      "Get Oyster Card for public transport",
      "Book West End show tickets",
      "Check Changing of Guard schedule",
      "Download Citymapper app",
      "Bring umbrella (it's London!)"
    ],
    notes: "London has excellent public transport. Mind the gap! Pubs close early compared to other cities. Sunday roast is a must-try tradition.",
    bestTimeToVisit: "May-September",
    budget: {
      low: 80,
      medium: 180,
      high: 350
    }
  },
  {
    id: "rome-history",
    title: "Rome Historical Journey",
    description: "Explore 2,500 years of history through Rome's iconic landmarks and hidden gems",
    duration: 4,
    city: "Rome",
    country: "Italy",
    tags: ["History", "Culture", "Food", "Architecture"],
    activities: [
      {
        title: "Colosseum & Roman Forum",
        time: "09:00",
        locationName: "Colosseum",
        notes: "Book skip-the-line tickets. Start early to avoid crowds",
        tag: "History",
        day: 1,
        latitude: "41.8902",
        longitude: "12.4922"
      },
      {
        title: "Palatine Hill",
        time: "11:30",
        locationName: "Palatine Hill",
        notes: "Birthplace of Rome with stunning views",
        tag: "History",
        day: 1,
        latitude: "41.8893",
        longitude: "12.4875"
      },
      {
        title: "Lunch at Armando al Pantheon",
        time: "13:30",
        locationName: "Armando al Pantheon",
        notes: "Family-run restaurant since 1961, near the Pantheon",
        tag: "Food",
        day: 1,
        latitude: "41.8986",
        longitude: "12.4769"
      },
      {
        title: "Pantheon",
        time: "15:00",
        locationName: "Pantheon",
        notes: "Free entry, marvel at the engineering masterpiece",
        tag: "Architecture",
        day: 1,
        latitude: "41.8986",
        longitude: "12.4769"
      },
      {
        title: "Vatican Museums & Sistine Chapel",
        time: "09:00",
        locationName: "Vatican Museums",
        notes: "Pre-book tickets. Allow 3-4 hours minimum",
        tag: "Culture",
        day: 2,
        latitude: "41.9065",
        longitude: "12.4536"
      },
      {
        title: "St. Peter's Basilica",
        time: "14:00",
        locationName: "St. Peter's Basilica",
        notes: "Climb the dome for panoramic views (extra fee)",
        tag: "Architecture",
        day: 2,
        latitude: "41.9022",
        longitude: "12.4539"
      },
      {
        title: "Trastevere Evening",
        time: "18:00",
        locationName: "Trastevere",
        notes: "Charming neighborhood for dinner and evening stroll",
        tag: "Food",
        day: 2,
        latitude: "41.8890",
        longitude: "12.4695"
      }
    ],
    suggestedTodos: [
      "Download Roma Pass app for discounts",
      "Book Colosseum skip-the-line tickets",
      "Reserve Vatican Museums entry",
      "Comfortable walking shoes",
      "Portable phone charger",
      "Learn basic Italian phrases"
    ],
    notes: "Rome requires lots of walking on ancient cobblestones. Many sites are free on first Sunday of each month but expect crowds. Dress modestly for religious sites.",
    bestTimeToVisit: "April-May, September-October (mild weather, fewer crowds)",
    budget: {
      low: 80,
      medium: 120,
      high: 200
    }
  },
  {
    id: "bali-adventure",
    title: "Bali Adventure & Culture",
    description: "Perfect blend of temples, rice terraces, beaches, and Balinese culture",
    duration: 6,
    city: "Ubud",
    country: "Indonesia",
    tags: ["Adventure", "Culture", "Nature", "Relaxation"],
    activities: [
      {
        title: "Arrive & Ubud Monkey Forest",
        time: "15:00",
        locationName: "Sacred Monkey Forest Sanctuary",
        notes: "Keep bags closed, monkeys can grab items. Beautiful temple ruins",
        tag: "Nature",
        day: 1,
        latitude: "-8.5185",
        longitude: "115.2582"
      },
      {
        title: "Ubud Market & Palace",
        time: "09:00",
        locationName: "Ubud Traditional Market",
        notes: "Best time for fresh produce and local crafts",
        tag: "Culture",
        day: 2,
        latitude: "-8.5069",
        longitude: "115.2625"
      },
      {
        title: "Tegallalang Rice Terraces",
        time: "11:00",
        locationName: "Tegallalang Rice Terrace",
        notes: "Famous Instagram spot. Early morning has best light",
        tag: "Nature",
        day: 2,
        latitude: "-8.4341",
        longitude: "115.2737"
      },
      {
        title: "Coffee Plantation Tour",
        time: "14:00",
        locationName: "Bali Coffee Plantation",
        notes: "Try the famous Luwak coffee and various spices",
        tag: "Culture",
        day: 2,
        latitude: "-8.4168",
        longitude: "115.2871"
      },
      {
        title: "Mount Batur Sunrise Hike",
        time: "03:00",
        locationName: "Mount Batur",
        notes: "2-hour hike to summit. Bring warm clothes and flashlight",
        tag: "Adventure",
        day: 3,
        latitude: "-8.2425",
        longitude: "115.3751"
      },
      {
        title: "Natural Hot Springs",
        time: "08:30",
        locationName: "Toya Devasya Hot Springs",
        notes: "Relax after the hike with lake views",
        tag: "Relaxation",
        day: 3,
        latitude: "-8.2389",
        longitude: "115.3903"
      }
    ],
    suggestedTodos: [
      "Get travel insurance",
      "Download offline maps",
      "Rent scooter (international license needed)",
      "Pack mosquito repellent",
      "Comfortable hiking shoes",
      "Respectful temple clothing"
    ],
    notes: "Bali is perfect for digital nomads with good WiFi in Ubud. Rent a scooter for easy transport. Always negotiate prices at markets. Respect local customs at temples.",
    bestTimeToVisit: "April-October (dry season)",
    budget: {
      low: 30,
      medium: 60,
      high: 120
    }
  },
  {
    id: "barcelona-tapas",
    title: "Barcelona Food & Architecture",
    description: "Gaudi's masterpieces, incredible tapas, and vibrant Catalan culture",
    duration: 4,
    city: "Barcelona",
    country: "Spain",
    tags: ["Food", "Architecture", "Culture", "Art"],
    activities: [
      {
        title: "Sagrada Familia",
        time: "09:00",
        locationName: "Sagrada Familia",
        notes: "Pre-book timed entry. Audio guide highly recommended",
        tag: "Architecture",
        day: 1,
        latitude: "41.4036",
        longitude: "2.1744"
      },
      {
        title: "Park Güell",
        time: "11:30",
        locationName: "Park Güell",
        notes: "Gaudi's colorful mosaic park. Timed entry required",
        tag: "Architecture",
        day: 1,
        latitude: "41.4145",
        longitude: "2.1527"
      },
      {
        title: "Tapas in Gracia",
        time: "14:00",
        locationName: "Gracia Neighborhood",
        notes: "Local neighborhood with authentic tapas bars",
        tag: "Food",
        day: 1,
        latitude: "41.4037",
        longitude: "2.1560"
      },
      {
        title: "Gothic Quarter Walk",
        time: "10:00",
        locationName: "Gothic Quarter",
        notes: "Medieval streets, cathedral, and hidden plazas",
        tag: "Culture",
        day: 2,
        latitude: "41.3838",
        longitude: "2.1762"
      },
      {
        title: "La Boqueria Market",
        time: "12:00",
        locationName: "Mercat de la Boqueria",
        notes: "Famous food market on Las Ramblas",
        tag: "Food",
        day: 2,
        latitude: "41.3818",
        longitude: "2.1721"
      },
      {
        title: "Beach Time at Barceloneta",
        time: "15:00",
        locationName: "Barceloneta Beach",
        notes: "City beach with chiringuitos (beach bars)",
        tag: "Relaxation",
        day: 2,
        latitude: "41.3755",
        longitude: "2.1909"
      }
    ],
    suggestedTodos: [
      "Download Barcelona metro app",
      "Book Sagrada Familia tickets",
      "Reserve Park Güell entry",
      "Learn Spanish tapas vocabulary",
      "Comfortable walking shoes",
      "Sunscreen for beach day"
    ],
    notes: "Lunch is typically 2-4pm, dinner after 9pm. Many museums are free on Sunday afternoons. Pickpockets are common in tourist areas - stay alert.",
    bestTimeToVisit: "May-June, September-October (pleasant weather, fewer crowds)",
    budget: {
      low: 70,
      medium: 110,
      high: 180
    }
  },
  {
    id: "dubai-luxury",
    title: "Dubai Modern Marvels",
    description: "Futuristic architecture, luxury shopping, and desert adventures",
    duration: 5,
    city: "Dubai",
    country: "UAE",
    tags: ["Luxury", "Architecture", "Adventure", "Shopping"],
    activities: [
      {
        title: "Burj Khalifa Observation Deck",
        time: "16:00",
        locationName: "Burj Khalifa",
        notes: "Book sunset time for best views. Levels 124 & 125",
        tag: "Architecture",
        day: 1,
        latitude: "25.1972",
        longitude: "55.2744"
      },
      {
        title: "Dubai Mall & Aquarium",
        time: "18:30",
        locationName: "Dubai Mall",
        notes: "World's largest shopping mall with incredible aquarium",
        tag: "Shopping",
        day: 1,
        latitude: "25.1975",
        longitude: "55.2796"
      },
      {
        title: "Desert Safari",
        time: "15:00",
        locationName: "Dubai Desert",
        notes: "Dune bashing, camel riding, BBQ dinner under stars",
        tag: "Adventure",
        day: 2,
        latitude: "24.8607",
        longitude: "55.6095"
      },
      {
        title: "Dubai Marina Walk",
        time: "10:00",
        locationName: "Dubai Marina",
        notes: "Stunning waterfront with skyscrapers and yachts",
        tag: "Architecture",
        day: 3,
        latitude: "25.0777",
        longitude: "55.1340"
      },
      {
        title: "Jumeirah Beach",
        time: "14:00",
        locationName: "Jumeirah Beach",
        notes: "Perfect beach with Burj Al Arab views",
        tag: "Relaxation",
        day: 3,
        latitude: "25.2048",
        longitude: "55.2708"
      }
    ],
    suggestedTodos: [
      "Check visa requirements",
      "Download Dubai Metro app",
      "Book Burj Khalifa tickets",
      "Reserve desert safari",
      "Pack modest clothing for malls",
      "Sunscreen and hat"
    ],
    notes: "Dubai is very modern and tourist-friendly. Metro is efficient and air-conditioned. Tipping 10-15% is standard. Alcohol is available in licensed venues.",
    bestTimeToVisit: "November-March (cooler weather)",
    budget: {
      low: 100,
      medium: 200,
      high: 400
    }
  },
  {
    id: "amsterdam-canals",
    title: "Amsterdam Canals & Culture",
    description: "Bike through canal districts, world-class museums, and vibrant neighborhoods",
    duration: 3,
    city: "Amsterdam",
    country: "Netherlands",
    tags: ["Culture", "History", "Art", "Cycling"],
    activities: [
      {
        title: "Canal Ring Bike Tour",
        time: "10:00",
        locationName: "Amsterdam Canal Ring",
        notes: "Rent bikes early. Follow cycling rules and watch for trams",
        tag: "Cycling",
        day: 1,
        latitude: "52.3676",
        longitude: "4.9041"
      },
      {
        title: "Anne Frank House",
        time: "13:00",
        locationName: "Anne Frank House",
        notes: "Pre-book online only. No photos inside. Very moving experience",
        tag: "History",
        day: 1,
        latitude: "52.3752",
        longitude: "4.8840"
      },
      {
        title: "Jordaan District",
        time: "15:30",
        locationName: "Jordaan",
        notes: "Charming neighborhood with cafes, galleries, and markets",
        tag: "Culture",
        day: 1,
        latitude: "52.3744",
        longitude: "4.8826"
      },
      {
        title: "Van Gogh Museum",
        time: "09:00",
        locationName: "Van Gogh Museum",
        notes: "Book timed entry. World's largest Van Gogh collection",
        tag: "Art",
        day: 2,
        latitude: "52.3584",
        longitude: "4.8811"
      },
      {
        title: "Vondelpark",
        time: "12:00",
        locationName: "Vondelpark",
        notes: "Perfect for picnic and people watching",
        tag: "Relaxation",
        day: 2,
        latitude: "52.3579",
        longitude: "4.8686"
      },
      {
        title: "Red Light District Evening",
        time: "19:00",
        locationName: "Red Light District",
        notes: "Historic area with unique atmosphere. Respect photography rules",
        tag: "Culture",
        day: 2,
        latitude: "52.3731",
        longitude: "4.8956"
      }
    ],
    suggestedTodos: [
      "Book Anne Frank House online",
      "Reserve Van Gogh Museum tickets",
      "Download cycling route apps",
      "Pack rain jacket",
      "Comfortable shoes for walking",
      "Learn basic Dutch phrases"
    ],
    notes: "Cycling is the best way to see Amsterdam. Be very careful of trams and follow bike lane rules. Many museums accept credit cards. Coffee shops sell cannabis legally.",
    bestTimeToVisit: "April-September (warmer weather, longer days)",
    budget: {
      low: 80,
      medium: 120,
      high: 200
    }
  }
];

export function getTemplateById(id: string): TripTemplate | undefined {
  return tripTemplates.find(template => template.id === id);
}

export function getTemplatesByTag(tag: string): TripTemplate[] {
  return tripTemplates.filter(template => 
    template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

export function getAllTemplates(): TripTemplate[] {
  return tripTemplates;
}