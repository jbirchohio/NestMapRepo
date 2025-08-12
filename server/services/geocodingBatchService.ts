import { logger } from '../utils/logger';
import fetch from 'node-fetch';
import { geocodeCacheService } from './geocodeCacheService';
import PQueue from 'p-queue';

interface GeocodedLocation {
  latitude: string;
  longitude: string;
  formattedAddress?: string;
}

interface BatchGeocodingRequest {
  id: string;
  locationName: string;
  cityContext?: string;
}

interface BatchGeocodingResult {
  id: string;
  location: GeocodedLocation | null;
  fromCache: boolean;
}

/**
 * Optimized batch geocoding service with rate limiting and caching
 */
export class GeocodingBatchService {
  private mapboxToken: string;
  private queue: PQueue;
  private batchBuffer: Map<string, BatchGeocodingRequest[]>;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY_MS = 1000; // Collect requests for 1 second before processing
  private readonly RATE_LIMIT_DELAY_MS = 100; // 10 requests per second max

  constructor() {
    this.mapboxToken = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || '';
    if (!this.mapboxToken) {
      logger.warn('No Mapbox token configured - geocoding will be unavailable');
    }

    // Create a queue with concurrency limit to avoid rate limiting
    this.queue = new PQueue({
      concurrency: 3, // Process 3 geocoding requests in parallel
      interval: 1000, // Per second
      intervalCap: 10 // Max 10 per second
    });

    this.batchBuffer = new Map();
  }

  /**
   * Process multiple locations efficiently with batching and caching
   */
  async processBatch(requests: BatchGeocodingRequest[]): Promise<BatchGeocodingResult[]> {
    const results: BatchGeocodingResult[] = [];
    const uncachedRequests: BatchGeocodingRequest[] = [];

    // Step 1: Check cache for all requests
    for (const req of requests) {
      const cached = geocodeCacheService.get(req.locationName, req.cityContext);
      if (cached !== undefined) {
        results.push({
          id: req.id,
          location: cached,
          fromCache: true
        });
      } else {
        uncachedRequests.push(req);
      }
    }

    logger.info(`Batch geocoding: ${requests.length} total, ${results.length} from cache, ${uncachedRequests.length} to process`);

    if (uncachedRequests.length === 0) {
      return results;
    }

    // Step 2: Deduplicate uncached requests
    const uniqueLocations = new Map<string, BatchGeocodingRequest[]>();
    for (const req of uncachedRequests) {
      const key = `${req.locationName}:${req.cityContext || ''}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, []);
      }
      uniqueLocations.get(key)!.push(req);
    }

    // Step 3: Process unique locations with rate limiting
    const geocodingPromises = Array.from(uniqueLocations.entries()).map(([key, reqs]) =>
      this.queue.add(async () => {
        const firstReq = reqs[0];
        const location = await this.geocodeSingle(firstReq.locationName, firstReq.cityContext);

        // Apply result to all requests with the same location
        for (const req of reqs) {
          results.push({
            id: req.id,
            location,
            fromCache: false
          });
        }

        return location;
      })
    );

    await Promise.all(geocodingPromises);

    return results;
  }

  /**
   * Geocode a single location with Mapbox
   */
  private async geocodeSingle(locationName: string, cityContext?: string): Promise<GeocodedLocation | null> {
    if (!this.mapboxToken) {
      return null;
    }

    try {
      const searchQuery = cityContext
        ? `${locationName}, ${cityContext}`
        : locationName;

      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.mapboxToken}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        logger.error(`Mapbox geocoding failed for ${locationName}: ${response.statusText}`);
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

        geocodeCacheService.set(locationName, result, cityContext);
        return result;
      }

      logger.debug(`No geocoding results found for: ${locationName}`);
      geocodeCacheService.set(locationName, null, cityContext);
      return null;
    } catch (error) {
      logger.error(`Geocoding error for ${locationName}:`, error);
      return null;
    }
  }

  /**
   * Queue a location for batch geocoding (collects requests for efficient processing)
   */
  async queueForGeocoding(request: BatchGeocodingRequest): Promise<BatchGeocodingResult> {
    return new Promise((resolve) => {
      const key = `${request.locationName}:${request.cityContext || ''}`;

      // Check cache first
      const cached = geocodeCacheService.get(request.locationName, request.cityContext);
      if (cached !== undefined) {
        resolve({
          id: request.id,
          location: cached,
          fromCache: true
        });
        return;
      }

      // Add to batch buffer
      if (!this.batchBuffer.has(key)) {
        this.batchBuffer.set(key, []);
      }

      this.batchBuffer.get(key)!.push({
        ...request,
        callback: resolve
      } as any);

      // Reset timer to process batch
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      this.batchTimer = setTimeout(() => {
        this.processBatchBuffer();
      }, this.BATCH_DELAY_MS);
    });
  }

  /**
   * Process all buffered requests
   */
  private async processBatchBuffer() {
    if (this.batchBuffer.size === 0) return;

    const allRequests: any[] = [];
    for (const requests of this.batchBuffer.values()) {
      allRequests.push(...requests);
    }

    this.batchBuffer.clear();
    this.batchTimer = null;

    // Process in chunks
    for (let i = 0; i < allRequests.length; i += this.BATCH_SIZE) {
      const chunk = allRequests.slice(i, i + this.BATCH_SIZE);
      const batchRequests = chunk.map((r: any) => ({
        id: r.id,
        locationName: r.locationName,
        cityContext: r.cityContext
      }));

      const results = await this.processBatch(batchRequests);

      // Call callbacks with results
      for (const req of chunk) {
        const result = results.find(r => r.id === req.id);
        if (result && req.callback) {
          req.callback(result);
        }
      }
    }
  }

  /**
   * Optimize geocoding for template activities
   */
  async geocodeTemplateActivities(activities: Array<{
    id: string;
    locationName?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  }>, cityContext?: string): Promise<Map<string, GeocodedLocation | null>> {
    const results = new Map<string, GeocodedLocation | null>();
    const toGeocode: BatchGeocodingRequest[] = [];

    // Filter activities that need geocoding
    for (const activity of activities) {
      if (activity.locationName && (!activity.latitude || !activity.longitude)) {
        toGeocode.push({
          id: activity.id,
          locationName: activity.locationName,
          cityContext
        });
      } else if (activity.latitude && activity.longitude) {
        // Already has coordinates
        results.set(activity.id, {
          latitude: activity.latitude,
          longitude: activity.longitude
        });
      }
    }

    if (toGeocode.length === 0) {
      return results;
    }

    // Process batch
    const geocoded = await this.processBatch(toGeocode);

    for (const result of geocoded) {
      results.set(result.id, result.location);
    }

    return results;
  }

  /**
   * Preload cache with common locations
   */
  async preloadCommonLocations(locations: string[], cityContext?: string) {
    const uncached = locations.filter(loc =>
      geocodeCacheService.get(loc, cityContext) === undefined
    );

    if (uncached.length === 0) {
      logger.info('All common locations already cached');
      return;
    }

    logger.info(`Preloading ${uncached.length} common locations`);

    const requests = uncached.map((loc, i) => ({
      id: `preload-${i}`,
      locationName: loc,
      cityContext
    }));

    await this.processBatch(requests);
    logger.info('Common locations preloaded to cache');
  }

  /**
   * Clear the queue and pending batches
   */
  clear() {
    this.queue.clear();
    this.batchBuffer.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.size,
      queuePending: this.queue.pending,
      batchBufferSize: this.batchBuffer.size,
      cacheStats: geocodeCacheService.getStats()
    };
  }
}

export const geocodingBatchService = new GeocodingBatchService();