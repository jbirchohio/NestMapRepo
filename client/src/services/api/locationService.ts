import { getApiClient } from './apiClient';

export interface LocationSuggestion {
  id: string;
  name: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type?: string;
  address?: string;
}

export interface LocationDetails extends LocationSuggestion {
  timezone?: string;
  photos?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  categories?: string[];
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  openingHours?: {
    openNow: boolean;
    periods?: Array<{
      close: { day: number; time: string };
      open: { day: number; time: string };
    }>;
    weekdayText?: string[];
  };
  contact?: {
    phone?: string;
    website?: string;
  };
}

export interface SearchLocationParams {
  query: string;
  limit?: number;
  sessionToken?: string;
  locationBias?: {
    rectangle: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
  };
}

class LocationService {
  private static instance: LocationService;
  private basePath = '/locations';

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public async searchLocations(
    params: SearchLocationParams,
    config?: RequestConfig
  ): Promise<LocationSuggestion[]> {
    return getApiClient().get<LocationSuggestion[]>(
      `${this.basePath}/search`,
      { ...config, params }
    );
  }

  public async getLocationDetails(
    placeId: string,
    config?: RequestConfig
  ): Promise<LocationDetails> {
    return getApiClient().get<LocationDetails>(
      `${this.basePath}/${placeId}`,
      config
    );
  }

  public async getPlacePhoto(
    photoReference: string,
    maxWidth = 400,
    config?: RequestConfig
  ): Promise<string> {
    return getApiClient().get<string>(
      `${this.basePath}/photos/${photoReference}`,
      {
        ...config,
        params: { maxWidth },
        responseType: 'blob',
      }
    );
  }

  public async getAutocompletePredictions(
    input: string,
    sessionToken: string,
    config?: RequestConfig
  ): Promise<LocationSuggestion[]> {
    return getApiClient().get<LocationSuggestion[]>(
      `${this.basePath}/autocomplete`,
      {
        ...config,
        params: { input, sessionToken },
      }
    );
  }

  public async getReverseGeocode(
    lat: number,
    lng: number,
    config?: RequestConfig
  ): Promise<LocationSuggestion> {
    return getApiClient().get<LocationSuggestion>(
      `${this.basePath}/reverse`,
      {
        ...config,
        params: { lat, lng },
      }
    );
  }
}

export const locationService = LocationService.getInstance();

// Add this type if not already defined in your project
type RequestConfig = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'document' | 'text' | 'stream';
  [key: string]: any;
};
