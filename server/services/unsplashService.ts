import { logger } from '../utils/logger';
import fetch from 'node-fetch';

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
    download: string;
  };
  description?: string;
  alt_description?: string;
}

interface UnsplashImageResult {
  coverImage: string;
  thumbnailImage: string;
  contentImage: string;
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  photoUrl: string;
}

class UnsplashService {
  private accessKey: string;
  private baseUrl = 'https://api.unsplash.com';

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
    if (!this.accessKey) {
      logger.warn('Unsplash API key not configured - using fallback images');
    }
  }

  /**
   * Search for destination photos on Unsplash
   */
  async searchDestinationPhotos(destination: string): Promise<UnsplashImageResult> {
    if (!this.accessKey) {
      // Return fallback if no API key
      return this.getFallbackImage(destination);
    }

    try {
      // Search for photos with the destination name
      const searchQueries = [
        `${destination} city`,
        `${destination} skyline`,
        `${destination} landmark`,
        `${destination} tourism`,
        destination
      ];

      let photo: UnsplashPhoto | null = null;

      // Try different search queries until we find a good photo
      for (const query of searchQueries) {
        const searchUrl = `${this.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
        
        const response = await fetch(searchUrl, {
          headers: {
            'Authorization': `Client-ID ${this.accessKey}`,
            'Accept-Version': 'v1'
          }
        });

        if (!response.ok) {
          logger.error(`Unsplash API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json() as any;
        
        if (data.results && data.results.length > 0) {
          photo = data.results[0];
          break;
        }
      }

      if (!photo) {
        logger.warn(`No photos found for destination: ${destination}`);
        return this.getFallbackImage(destination);
      }

      // Track the download for Unsplash guidelines (required by API terms)
      this.trackDownload(photo.links.download);

      return {
        coverImage: `${photo.urls.raw}&w=1200&h=630&fit=crop&q=80`,
        thumbnailImage: `${photo.urls.raw}&w=400&h=300&fit=crop&q=80`,
        contentImage: `${photo.urls.raw}&w=800&h=450&fit=crop&q=80`,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          profileUrl: `${photo.user.links.html}?utm_source=remvana&utm_medium=referral`
        },
        photoUrl: `${photo.links.html}?utm_source=remvana&utm_medium=referral`
      };
    } catch (error) {
      logger.error('Unsplash search error:', error);
      return this.getFallbackImage(destination);
    }
  }

  /**
   * Track photo download per Unsplash API guidelines
   */
  private async trackDownload(downloadUrl: string): Promise<void> {
    try {
      await fetch(`${downloadUrl}&client_id=${this.accessKey}`, {
        method: 'GET',
        headers: {
          'Accept-Version': 'v1'
        }
      });
    } catch (error) {
      logger.error('Failed to track Unsplash download:', error);
    }
  }

  /**
   * Get a specific photo by ID
   */
  async getPhotoById(photoId: string): Promise<UnsplashImageResult | null> {
    if (!this.accessKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/photos/${photoId}`, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1'
        }
      });

      if (!response.ok) {
        return null;
      }

      const photo = await response.json() as UnsplashPhoto;

      // Track the download
      this.trackDownload(photo.links.download);

      return {
        coverImage: `${photo.urls.raw}&w=1200&h=630&fit=crop&q=80`,
        thumbnailImage: `${photo.urls.raw}&w=400&h=300&fit=crop&q=80`,
        contentImage: `${photo.urls.raw}&w=800&h=450&fit=crop&q=80`,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          profileUrl: `${photo.user.links.html}?utm_source=remvana&utm_medium=referral`
        },
        photoUrl: `${photo.links.html}?utm_source=remvana&utm_medium=referral`
      };
    } catch (error) {
      logger.error('Unsplash getPhotoById error:', error);
      return null;
    }
  }

  /**
   * Fallback image when API is not available
   */
  private getFallbackImage(destination: string): UnsplashImageResult {
    // Use a gradient as fallback
    const fallbackUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%239333ea'/%3E%3Cstop offset='100%25' style='stop-color:%23ec4899'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='630' fill='url(%23a)'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='white' font-family='sans-serif' font-size='48' font-weight='bold'%3E${encodeURIComponent(destination)}%3C/text%3E%3C/svg%3E`;

    return {
      coverImage: fallbackUrl,
      thumbnailImage: fallbackUrl,
      contentImage: fallbackUrl,
      photographer: {
        name: 'Remvana',
        username: 'remvana',
        profileUrl: '#'
      },
      photoUrl: '#'
    };
  }
}

export const unsplashService = new UnsplashService();