/**
 * Overpass API service for finding real places from OpenStreetMap
 * This is FREE and returns REAL places with exact coordinates
 */

import { logger } from '../utils/logger';

interface Place {
  name: string;
  lat: number;
  lon: number;
  type: string;
  address?: string;
  cuisine?: string;
  tourism?: string;
  amenity?: string;
}

/**
 * Query Overpass API for real places in a city
 */
export async function findRealPlaces(
  city: string,
  country: string,
  category: 'restaurant' | 'tourism' | 'cafe' | 'hotel',
  limit: number = 10
): Promise<Place[]> {
  try {
    logger.info(`[OVERPASS] Fetching ${category} for ${city}, ${country}`);
    // Build Overpass query based on category
    let query = '';
    const bbox = await getCityBoundingBox(city, country);
    
    if (!bbox) {
      logger.error(`Could not find bounding box for ${city}, ${country}`);
      return [];
    }

    switch (category) {
      case 'restaurant':
        query = `
          [out:json][timeout:25];
          (
            node["amenity"="restaurant"](${bbox});
            way["amenity"="restaurant"](${bbox});
          );
          out body;
          >;
          out skel qt;
        `;
        break;
      case 'tourism':
        query = `
          [out:json][timeout:25];
          (
            node["tourism"](${bbox});
            way["tourism"](${bbox});
            node["historic"](${bbox});
            way["historic"](${bbox});
          );
          out body;
          >;
          out skel qt;
        `;
        break;
      case 'cafe':
        query = `
          [out:json][timeout:25];
          (
            node["amenity"="cafe"](${bbox});
            way["amenity"="cafe"](${bbox});
            node["amenity"="bakery"](${bbox});
          );
          out body;
          >;
          out skel qt;
        `;
        break;
      case 'hotel':
        query = `
          [out:json][timeout:25];
          (
            node["tourism"="hotel"](${bbox});
            way["tourism"="hotel"](${bbox});
            node["tourism"="guest_house"](${bbox});
          );
          out body;
          >;
          out skel qt;
        `;
        break;
    }

    // Query Overpass API
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    if (!response.ok) {
      logger.error(`Overpass API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const places: Place[] = [];

    // Parse results
    for (const element of data.elements) {
      if (element.tags && element.tags.name) {
        places.push({
          name: element.tags.name,
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
          type: element.tags.amenity || element.tags.tourism || element.tags.historic || 'place',
          address: formatAddress(element.tags),
          cuisine: element.tags.cuisine,
          tourism: element.tags.tourism,
          amenity: element.tags.amenity
        });
      }

      if (places.length >= limit) break;
    }

    logger.info(`Found ${places.length} real places in ${city} for category ${category}`);
    return places;

  } catch (error) {
    logger.error('Overpass API error:', error);
    return [];
  }
}

/**
 * Get city bounding box from Nominatim (OpenStreetMap geocoding)
 */
async function getCityBoundingBox(city: string, country: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${city}, ${country}`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Remvana Travel App'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0 && data[0].boundingbox) {
      const bbox = data[0].boundingbox;
      // Format: south,west,north,east
      return `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`;
    }

    return null;
  } catch (error) {
    logger.error('Nominatim error:', error);
    return null;
  }
}

/**
 * Format address from OSM tags
 */
function formatAddress(tags: any): string | undefined {
  const parts = [];
  
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Search for a specific place by name
 */
export async function geocodePlace(
  placeName: string,
  city: string,
  country: string
): Promise<{ lat: number; lon: number; address?: string } | null> {
  try {
    const query = encodeURIComponent(`${placeName}, ${city}, ${country}`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Remvana Travel App'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        address: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    logger.error('Geocoding error:', error);
    return null;
  }
}