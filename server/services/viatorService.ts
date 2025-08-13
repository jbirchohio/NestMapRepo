/**
 * Viator API Integration Service
 * Docs: https://docs.viator.com/partner-api/merchant/
 */

interface ViatorSearchParams {
  destId?: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  topX?: string;
  sortOrder?: string;
}

interface ViatorProduct {
  productCode: string;
  productName: string;
  primaryImageURL: string;
  duration?: string;
  fromPrice: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  cancellationPolicy?: string;
}

const VIATOR_API_KEY = process.env.VIATOR_API_KEY;
const VIATOR_PARTNER_ID = process.env.VIATOR_PARTNER_ID || 'P00263344';
const VIATOR_MCID = process.env.VIATOR_MCID || '42383';
const VIATOR_API_URL = 'https://api.viator.com/partner';

export class ViatorService {
  private headers = {
    'Accept': 'application/json;version=2.0',
    'Accept-Language': 'en-US',
    'exp-api-key': VIATOR_API_KEY || '',
    'Content-Type': 'application/json'
  };

  // Simple in-memory cache for destination IDs
  private destinationCache = new Map<string, { id: number; timestamp: number }>();
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Extract the best image URL from the images array
   */
  private getImageUrl(images: any[]): string {
    if (!images || images.length === 0) return '';
    
    const firstImage = images[0];
    if (!firstImage.variants || firstImage.variants.length === 0) return '';
    
    // Try to find a medium-sized image (480x320 or similar)
    const preferred = firstImage.variants.find((v: any) => v.width === 480 && v.height === 320);
    if (preferred) return preferred.url;
    
    // Otherwise return the largest image
    return firstImage.variants[firstImage.variants.length - 2]?.url || '';
  }

  /**
   * Format duration object into a readable string
   */
  private formatDuration(duration: any): string {
    if (!duration) return '';
    
    if (duration.fixedDurationInMinutes) {
      const hours = Math.floor(duration.fixedDurationInMinutes / 60);
      const minutes = duration.fixedDurationInMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim() : `${minutes}m`;
    }
    
    if (duration.variableDurationFromMinutes && duration.variableDurationToMinutes) {
      const fromHours = Math.floor(duration.variableDurationFromMinutes / 60);
      const toHours = Math.floor(duration.variableDurationToMinutes / 60);
      return `${fromHours}-${toHours} hours`;
    }
    
    return '';
  }

  /**
   * Search for destinations by name and get destination ID
   */
  async searchDestinations(query: string): Promise<any> {
    try {
      // Use the destination lookup endpoint
      const requestBody = {
        destName: query
      };

      const response = await fetch(`${VIATOR_API_URL}/v1/taxonomy/destinations/lookup`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Fallback to search if lookup fails
        return this.searchDestinationsFallback(query);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      // Try fallback search
      return this.searchDestinationsFallback(query);
    }
  }

  /**
   * Fallback destination search using the list endpoint
   */
  private async searchDestinationsFallback(query: string): Promise<any> {
    try {
      const response = await fetch(`${VIATOR_API_URL}/v1/taxonomy/destinations`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Viator API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter destinations by query - check multiple fields
      const normalizedQuery = query.toLowerCase().replace(/-/g, ' ');
      return data.data.filter((dest: any) => {
        const destName = dest.destinationName?.toLowerCase() || '';
        const lookupId = dest.lookupId?.toLowerCase() || '';
        const parentName = dest.parentDestinationName?.toLowerCase() || '';
        
        return destName.includes(normalizedQuery) || 
               lookupId.includes(normalizedQuery) ||
               parentName.includes(normalizedQuery);
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get destination ID for a city name (with caching)
   */
  async getDestinationId(cityName: string): Promise<number | null> {
    try {
      const cacheKey = cityName.toLowerCase();
      
      // Check cache first
      const cached = this.destinationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        return cached.id;
      }
      
      // Search for destination
      const destinations = await this.searchDestinations(cityName);
      
      if (destinations && destinations.length > 0) {
        // Return the first matching destination ID
        // Prefer exact matches over partial matches
        const exactMatch = destinations.find((d: any) => 
          d.destinationName?.toLowerCase() === cityName.toLowerCase()
        );
        
        let destinationId: number;
        
        if (exactMatch) {
          destinationId = exactMatch.destinationId;
        } else {
          // Return the first result if no exact match
          destinationId = destinations[0].destinationId;
        }
        
        // Cache the result
        this.destinationCache.set(cacheKey, {
          id: destinationId,
          timestamp: Date.now()
        });
        
        return destinationId;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Search for activities/products
   */
  async searchActivities(params: ViatorSearchParams): Promise<ViatorProduct[]> {
    try {
      // console.log('Viator searchActivities called with params:', params);
      
      // For now, use New York as default destination
      // TODO: Get proper destId based on location
      const destId = params.destId || 684; // 684 is New York
      
      // Build request body according to ProductSearchRequest schema
      const requestBody = {
        filtering: {
          destination: destId.toString() // destination goes inside filtering
        },
        sorting: {
          sort: 'TRAVELER_RATING',
          order: 'DESCENDING'
        },
        pagination: {
          start: 1,
          count: parseInt(params.topX?.split('-')[1] || '12') || 12
        },
        currency: 'USD'
      };

      const url = `${VIATOR_API_URL}/products/search`;
      // Removed verbose logging to prevent Railway rate limits
      // console.log('Viator API URL:', url);
      // console.log('Viator API request body:', JSON.stringify(requestBody));
      // console.log('Viator API headers:', this.headers);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      // Removed verbose logging to prevent log spam
      // console.log('Viator API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Viator API error response:', errorText);
        
        // Return empty array instead of throwing to avoid breaking the UI
        return [];
      }

      const data = await response.json();
      // Removed verbose data logging - was causing Railway rate limits
      // console.log('Viator API response data:', JSON.stringify(data, null, 2));
      
      // Handle both data.data and data.products
      const products = data.data || data.products || [];
      
      // Filter products by search query if provided
      let filteredProducts = products;
      if (params.searchQuery) {
        const searchWords = params.searchQuery.toLowerCase().split(' ').filter(w => w.length > 2);
        filteredProducts = products.filter((product: any) => {
          const title = (product.title || product.productName || '').toLowerCase();
          const description = (product.description || '').toLowerCase();
          const combined = title + ' ' + description;
          
          // Check if any search word appears in the title or description
          return searchWords.some(word => combined.includes(word));
        });
      }
      
      // Don't slice here since we're already limiting in the API request
      return filteredProducts.map((product: any) => {
        return {
          productCode: product.productCode || product.id || product.code || 'NO_CODE',
          productName: product.title || product.productName || 'Unnamed Activity',
          primaryImageURL: this.getImageUrl(product.images),
          duration: this.formatDuration(product.duration),
          fromPrice: product.pricing?.summary?.fromPrice || product.fromPrice || 0,
          currency: product.pricing?.currency || product.currency || 'USD',
          rating: product.reviews?.combinedAverageRating || product.rating || 0,
          reviewCount: product.reviews?.totalReviews || product.reviewCount || 0,
          cancellationPolicy: product.flags?.includes('FREE_CANCELLATION') ? 'Free cancellation' : 'Check details'
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get product details
   */
  async getProductDetails(productCode: string): Promise<any> {
    try {
      const response = await fetch(`${VIATOR_API_URL}/products/${productCode}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Viator API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate affiliate link for a product
   */
  generateAffiliateLink(productCode: string): string {
    // Viator affiliate links format with partner tracking
    const affiliateLink = `https://www.viator.com/tours/${productCode}?pid=${VIATOR_PARTNER_ID}&mcid=${VIATOR_MCID}&medium=link&medium_version=selector`;
    
    // Log affiliate link generation for tracking
    // console.log('Viator affiliate link generated:', {
    //   productCode,
    //   partnerId: VIATOR_PARTNER_ID,
    //   mcid: VIATOR_MCID,
    //   link: affiliateLink,
    //   timestamp: new Date().toISOString()
    // });
    
    return affiliateLink;
  }

  /**
   * Search activities by location and activity name
   */
  async searchByLocationAndActivity(
    latitude: number, 
    longitude: number, 
    activityName: string
  ): Promise<ViatorProduct[]> {
    try {
      // Improved coordinate-based destination mapping
      let destId = null;
      
      // Check major US cities based on coordinates
      if (latitude >= 40.4 && latitude <= 41.0 && longitude >= -74.5 && longitude <= -73.5) {
        destId = 687; // New York City
      } else if (latitude >= 41.5 && latitude <= 42.2 && longitude >= -88.5 && longitude <= -87.2) {
        destId = 689; // Chicago
      } else if (latitude >= 25.7 && latitude <= 26.0 && longitude >= -80.3 && longitude <= -80.1) {
        destId = 11104; // Miami
      } else if (latitude >= 34.0 && latitude <= 34.2 && longitude >= -118.5 && longitude <= -118.2) {
        destId = 645; // Los Angeles
      } else if (latitude >= 37.7 && latitude <= 37.9 && longitude >= -122.6 && longitude <= -122.3) {
        destId = 651; // San Francisco
      } else if (latitude >= 36.0 && latitude <= 36.3 && longitude >= -115.3 && longitude <= -115.0) {
        destId = 684; // Las Vegas
      } else if (latitude >= 47.5 && latitude <= 47.8 && longitude >= -122.5 && longitude <= -122.2) {
        destId = 704; // Seattle
      } else if (latitude >= 42.2 && latitude <= 42.5 && longitude >= -71.2 && longitude <= -70.9) {
        destId = 663; // Boston
      } else if (latitude >= 38.8 && latitude <= 39.0 && longitude >= -77.2 && longitude <= -76.9) {
        destId = 657; // Washington DC
      } else if (latitude >= 29.6 && latitude <= 29.9 && longitude >= -95.6 && longitude <= -95.2) {
        destId = 671; // Houston
      } else if (latitude >= 39.6 && latitude <= 39.9 && longitude >= -105.2 && longitude <= -104.8) {
        destId = 666; // Denver
      } else if (latitude >= 33.3 && latitude <= 33.6 && longitude >= -112.3 && longitude <= -111.9) {
        destId = 660; // Phoenix
      } else if (latitude >= 32.6 && latitude <= 32.9 && longitude >= -117.3 && longitude <= -117.0) {
        destId = 702; // San Diego
      } else if (latitude >= 35.9 && latitude <= 36.3 && longitude >= -87.0 && longitude <= -86.5) {
        destId = 700; // Nashville
      } else if (latitude >= 28.4 && latitude <= 28.7 && longitude >= -81.5 && longitude <= -81.2) {
        destId = 664; // Orlando
      }
      
      if (!destId) {
        console.log(`Warning: No Viator destination mapping for coordinates (${latitude}, ${longitude}). Skipping search.`);
        return [];
      }
      
      console.log(`Mapped coordinates (${latitude}, ${longitude}) to destination ID: ${destId}`);
      
      return this.searchActivities({
        destId,
        searchQuery: activityName,
        topX: '1-5',
        sortOrder: 'TRAVELER_RATING'
      });
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const viatorService = new ViatorService();