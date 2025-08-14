/**
 * Batch fetch all categories at once and cache them
 */
import { logger } from '../utils/logger';
import { osmCache } from './osmCache';
import { overpassManager } from './overpassServers';

interface RealPlace {
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  tourism?: string;
  amenity?: string;
}

interface PlaceCollection {
  restaurants: RealPlace[];
  attractions: RealPlace[];
  cafes: RealPlace[];
}

/**
 * Batch fetch all place categories in a single Overpass query
 * This reduces API calls from 3+ to just 1
 */
export async function batchFetchAndCache(
  city: string, 
  country: string
): Promise<PlaceCollection> {
  logger.info(`[OSMBatch] Fetching places for ${city}, ${country}`);

  // Check cache first
  const cached = osmCache.get(city, country);
  if (cached) {
    return {
      restaurants: cached.restaurants,
      attractions: cached.attractions,
      cafes: cached.cafes
    };
  }

  try {
    // Get city bounding box first
    const bbox = await getCityBoundingBox(city, country);
    if (!bbox) {
      logger.warn(`[OSMBatch] Could not find bounding box for ${city}, ${country}`);
      return { restaurants: [], attractions: [], cafes: [] };
    }

    // Create a single combined Overpass query for all categories
    const overpassQuery = `
      [out:json][timeout:25];
      (
        // Restaurants
        node["amenity"="restaurant"](${bbox});
        way["amenity"="restaurant"](${bbox});
        
        // Cafes
        node["amenity"="cafe"](${bbox});
        way["amenity"="cafe"](${bbox});
        
        // Tourist attractions
        node["tourism"~"attraction|museum|viewpoint|gallery|zoo|aquarium"](${bbox});
        way["tourism"~"attraction|museum|viewpoint|gallery|zoo|aquarium"](${bbox});
        
        // Historic sites
        node["historic"](${bbox});
        way["historic"](${bbox});
        
        // Leisure activities
        node["leisure"~"park|water_park|theme_park"](${bbox});
        way["leisure"~"park|water_park|theme_park"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;

    // Fetch with retry and server rotation
    const places = await fetchWithRetry(overpassQuery);
    
    // Categorize the results
    const categorized = categorizePlaces(places);
    
    // Cache the results
    osmCache.set(city, country, categorized);
    
    logger.info(`[OSMBatch] Fetched and cached ${categorized.restaurants.length} restaurants, ${categorized.attractions.length} attractions, ${categorized.cafes.length} cafes`);
    
    return categorized;
    
  } catch (error) {
    logger.error(`[OSMBatch] Error fetching places:`, error);
    
    // Try fallback data if available
    const fallback = getFallbackData(city, country);
    if (fallback) {
      osmCache.set(city, country, fallback);
      return fallback;
    }
    
    return { restaurants: [], attractions: [], cafes: [] };
  }
}

/**
 * Get city bounding box from Nominatim
 */
async function getCityBoundingBox(city: string, country: string): Promise<string | null> {
  const query = encodeURIComponent(`${city}, ${country}`);
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const response = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'Remvana/1.0' }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    const bbox = data[0].boundingbox;
    // Format: south,west,north,east
    return `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`;
    
  } catch (error) {
    logger.error(`[OSMBatch] Error getting bounding box:`, error);
    return null;
  }
}

/**
 * Fetch from Overpass with retry logic and server rotation
 */
async function fetchWithRetry(query: string, maxRetries = 3): Promise<any[]> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const server = overpassManager.getNextServer();
    logger.info(`[OSMBatch] Attempt ${attempt + 1}/${maxRetries} using ${server}`);
    
    try {
      const response = await fetch(server, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Success! Report it and return
      overpassManager.reportSuccess(server);
      return data.elements || [];
      
    } catch (error) {
      lastError = error;
      logger.warn(`[OSMBatch] Server ${server} failed:`, error);
      overpassManager.reportFailure(server);
      
      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.info(`[OSMBatch] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Categorize places from Overpass response
 */
function categorizePlaces(elements: any[]): PlaceCollection {
  const restaurants: RealPlace[] = [];
  const attractions: RealPlace[] = [];
  const cafes: RealPlace[] = [];
  
  for (const element of elements) {
    if (!element.tags?.name) continue;
    
    const place: RealPlace = {
      name: element.tags.name,
      lat: element.lat || element.center?.lat,
      lon: element.lon || element.center?.lon
    };
    
    if (!place.lat || !place.lon) continue;
    
    // Categorize based on tags
    if (element.tags.amenity === 'restaurant') {
      place.cuisine = element.tags.cuisine;
      restaurants.push(place);
    } else if (element.tags.amenity === 'cafe') {
      cafes.push(place);
    } else if (element.tags.tourism || element.tags.historic || element.tags.leisure) {
      place.tourism = element.tags.tourism || element.tags.historic || element.tags.leisure;
      attractions.push(place);
    }
  }
  
  // Remove duplicates and limit results
  return {
    restaurants: deduplicatePlaces(restaurants).slice(0, 30),
    attractions: deduplicatePlaces(attractions).slice(0, 30),
    cafes: deduplicatePlaces(cafes).slice(0, 20)
  };
}

/**
 * Remove duplicate places by name
 */
function deduplicatePlaces(places: RealPlace[]): RealPlace[] {
  const seen = new Set<string>();
  return places.filter(place => {
    const key = place.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get fallback data for popular cities
 */
function getFallbackData(city: string, country: string): PlaceCollection | null {
  // This would be imported from a data file in production
  const fallbackData: Record<string, PlaceCollection> = {
    'sigmaringen_germany': {
      restaurants: [
        { name: "King's Garden", lat: 48.0892132, lon: 9.2120122, cuisine: "chinese" },
        { name: "Restaurant Gutshof Käppeler", lat: 48.091753, lon: 9.1065245, cuisine: "regional" },
        { name: "Gasthof Adler", lat: 48.0895, lon: 9.2155, cuisine: "german" }
      ],
      attractions: [
        { name: "Sigmaringen Castle", lat: 48.0877, lon: 9.2167, tourism: "castle" },
        { name: "Schloßblick", lat: 48.0882, lon: 9.2143, tourism: "viewpoint" },
        { name: "Donau River Walk", lat: 48.0871, lon: 9.2189, tourism: "attraction" }
      ],
      cafes: [
        { name: "Café Seelos", lat: 48.0884, lon: 9.2171 },
        { name: "Bäckerei-Café Mayer", lat: 48.0891, lon: 9.2134 }
      ]
    },
    'paris_france': {
      restaurants: [
        { name: "Le Jules Verne", lat: 48.8584, lon: 2.2945, cuisine: "french" },
        { name: "L'Ami Jean", lat: 48.8486, lon: 2.3024, cuisine: "bistro" },
        { name: "Breizh Café", lat: 48.8566, lon: 2.3622, cuisine: "creperie" }
      ],
      attractions: [
        { name: "Eiffel Tower", lat: 48.8584, lon: 2.2945, tourism: "attraction" },
        { name: "Louvre Museum", lat: 48.8606, lon: 2.3376, tourism: "museum" },
        { name: "Notre-Dame Cathedral", lat: 48.8530, lon: 2.3499, tourism: "cathedral" }
      ],
      cafes: [
        { name: "Café de Flore", lat: 48.8540, lon: 2.3333 },
        { name: "Les Deux Magots", lat: 48.8540, lon: 2.3336 }
      ]
    }
  };
  
  const key = `${city.toLowerCase()}_${country.toLowerCase()}`.replace(/\s+/g, '_');
  return fallbackData[key] || null;
}