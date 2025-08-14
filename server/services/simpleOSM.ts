/**
 * Simplified OpenStreetMap service that actually works
 */

import { logger } from '../utils/logger';
import { osmCache } from './osmCache';

interface RealPlace {
  name: string;
  lat: number;
  lon: number;
  type?: string;
  address?: string;
  cuisine?: string;
}

/**
 * Get real places from OpenStreetMap with caching
 */
export async function getRealPlaces(
  city: string,
  country: string,
  category: 'restaurant' | 'tourism' | 'cafe'
): Promise<RealPlace[]> {
  logger.info(`[OSM] Getting ${category} for ${city}, ${country}`);
  
  // Check cache first
  const cached = osmCache.get(city, country);
  if (cached) {
    if (category === 'restaurant') return cached.restaurants;
    if (category === 'tourism') return cached.attractions;
    if (category === 'cafe') return cached.cafes;
  }
  
  try {
    // Step 1: Get city bounding box
    const cityQuery = encodeURIComponent(`${city}, ${country}`);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${cityQuery}&format=json&limit=1`;
    
    const cityResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'Remvana/1.0' }
    });
    
    if (!cityResponse.ok) {
      logger.error(`[OSM] Failed to get city data: ${cityResponse.status}`);
      return [];
    }
    
    const cityData = await cityResponse.json();
    
    if (!cityData || cityData.length === 0) {
      logger.error(`[OSM] City not found: ${city}, ${country}`);
      return [];
    }
    
    const bbox = cityData[0].boundingbox;
    logger.info(`[OSM] Found city bounds: ${bbox.join(', ')}`);
    
    // Step 2: Build Overpass query
    let overpassQuery = '';
    
    switch (category) {
      case 'restaurant':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
        
      case 'tourism':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            node["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
        
      case 'cafe':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="cafe"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            node["amenity"="bakery"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["amenity"="cafe"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
    }
    
    // Step 3: Query Overpass API
    const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' }
    });
    
    if (!overpassResponse.ok) {
      logger.error(`[OSM] Overpass API failed: ${overpassResponse.status}`);
      return [];
    }
    
    const overpassData = await overpassResponse.json();
    
    // Step 4: Parse results
    const places: RealPlace[] = [];
    
    for (const element of overpassData.elements) {
      if (element.tags && element.tags.name) {
        const place: RealPlace = {
          name: element.tags.name,
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
          type: element.tags.amenity || element.tags.tourism || element.tags.historic
        };
        
        // Add address if available
        if (element.tags['addr:street']) {
          place.address = `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`.trim();
        }
        
        // Add cuisine for restaurants
        if (element.tags.cuisine) {
          place.cuisine = element.tags.cuisine;
        }
        
        places.push(place);
        
        // Limit results
        if (places.length >= 20) break;
      }
    }
    
    logger.info(`[OSM] Found ${places.length} ${category} places`);
    return places;
    
  } catch (error) {
    logger.error(`[OSM] Error fetching places:`, error);
    return [];
  }
}

/**
 * Format places for AI prompt
 */
export function formatPlacesForPrompt(places: RealPlace[]): string {
  return places.map(p => {
    let line = `- ${p.name}`;
    if (p.address) line += ` (${p.address})`;
    if (p.cuisine) line += ` - ${p.cuisine} cuisine`;
    line += ` [GPS: ${p.lat}, ${p.lon}]`;
    return line;
  }).join('\n');
}