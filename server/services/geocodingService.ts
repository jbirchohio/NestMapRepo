import { logger } from '../utils/logger';
import fetch from 'node-fetch';
import { geocodeCacheService } from './geocodeCacheService';

interface GeocodedLocation {
  latitude: string;
  longitude: string;
  formattedAddress?: string;
}

export class GeocodingService {
  private mapboxToken: string;

  constructor() {
    this.mapboxToken = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';
    if (!this.mapboxToken) {
      logger.warn('No Mapbox token configured - geocoding will be unavailable');
    }
  }

  /**
   * Geocode a location name to coordinates using Mapbox
   */
  async geocodeLocation(locationName: string, cityContext?: string): Promise<GeocodedLocation | null> {
    if (!locationName) {
      return null;
    }

    // Check cache first
    const cached = geocodeCacheService.get(locationName, cityContext);
    if (cached !== undefined) {
      // Cache hit (could be null if location wasn't found previously)
      return cached;
    }

    if (!this.mapboxToken) {
      logger.warn('Cannot geocode - no Mapbox token');
      return null;
    }

    try {
      // Add city context if provided for better results
      const searchQuery = cityContext 
        ? `${locationName}, ${cityContext}`
        : locationName;

      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.mapboxToken}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        logger.error(`Mapbox geocoding failed: ${response.statusText}`);
        // Cache the failure to avoid repeated failed requests
        geocodeCacheService.set(locationName, null, cityContext);
        return null;
      }

      const data = await response.json() as any;
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        
        const result = {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          formattedAddress: feature.place_name
        };

        // Cache successful result
        geocodeCacheService.set(locationName, result, cityContext);
        return result;
      }

      logger.warn(`No geocoding results found for: ${locationName}`);
      // Cache the "not found" result to avoid repeated lookups
      geocodeCacheService.set(locationName, null, cityContext);
      return null;
    } catch (error) {
      logger.error('Geocoding error:', error);
      // Don't cache errors - they might be temporary
      return null;
    }
  }

  /**
   * Geocode multiple locations in batch with deduplication
   */
  async geocodeMultiple(
    locations: Array<{ name: string; cityContext?: string }>
  ): Promise<Map<string, GeocodedLocation | null>> {
    const results = new Map<string, GeocodedLocation | null>();
    
    // Deduplicate locations first
    const uniqueLocations = new Map<string, { name: string; cityContext?: string }>();
    for (const loc of locations) {
      const key = `${loc.name}:${loc.cityContext || ''}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, loc);
      }
    }
    
    logger.info(`Batch geocoding: ${locations.length} locations, ${uniqueLocations.size} unique`);
    
    // Check cache for all locations first
    const toGeocode: Array<{ name: string; cityContext?: string }> = [];
    for (const loc of uniqueLocations.values()) {
      const cached = geocodeCacheService.get(loc.name, loc.cityContext);
      if (cached !== undefined) {
        results.set(loc.name, cached);
      } else {
        toGeocode.push(loc);
      }
    }
    
    if (toGeocode.length === 0) {
      logger.info('All locations found in cache');
      return results;
    }
    
    logger.info(`${results.size} locations from cache, ${toGeocode.length} need geocoding`);
    
    // Process uncached locations in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < toGeocode.length; i += batchSize) {
      const batch = toGeocode.slice(i, i + batchSize);
      
      const promises = batch.map(async (loc) => {
        const result = await this.geocodeLocation(loc.name, loc.cityContext);
        results.set(loc.name, result);
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        return result;
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }

  /**
   * Try to geocode using AI as fallback if Mapbox fails
   */
  async geocodeWithFallback(locationName: string, cityContext?: string): Promise<GeocodedLocation | null> {
    // Check cache first (includes both Mapbox and AI results)
    const cached = geocodeCacheService.get(locationName, cityContext);
    if (cached !== undefined) {
      return cached;
    }

    // Try Mapbox first (will also check cache internally)
    const mapboxResult = await this.geocodeLocation(locationName, cityContext);
    if (mapboxResult) {
      return mapboxResult;
    }

    // If Mapbox fails and we have OpenAI, try to get approximate coordinates
    if (process.env.OPENAI_API_KEY) {
      try {
        const { callOpenAI } = await import('../openai');
        
        const prompt = `Find the approximate latitude and longitude coordinates for: ${locationName}${cityContext ? ` in ${cityContext}` : ''}.
        
Return ONLY a JSON object with this exact format:
{
  "latitude": "number",
  "longitude": "number"
}

If you cannot find the location, return:
{
  "latitude": null,
  "longitude": null
}`;

        const response = await callOpenAI(prompt, { 
          temperature: 0.1, 
          max_tokens: 100 
        });
        
        try {
          const coords = JSON.parse(response);
          if (coords.latitude && coords.longitude) {
            const result = {
              latitude: coords.latitude.toString(),
              longitude: coords.longitude.toString()
            };
            // Cache AI result
            geocodeCacheService.set(locationName, result, cityContext);
            logger.info(`AI geocoded and cached: ${locationName}`);
            return result;
          }
        } catch (parseError) {
          logger.error('Failed to parse AI geocoding response:', parseError);
        }
      } catch (error) {
        logger.error('AI geocoding fallback failed:', error);
      }
    }

    // Cache the failure to avoid repeated attempts
    geocodeCacheService.set(locationName, null, cityContext);
    return null;
  }
}

export const geocodingService = new GeocodingService();