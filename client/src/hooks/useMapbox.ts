import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapMarker, MapRoute } from "@/lib/types";
import { mapLogger } from "@/lib/logger";

// Import the Mapbox CSS
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Configuration constants (extracted from magic numbers)
const MAP_CONFIG = {
  DEFAULT_CENTER: [-74.006, 40.7128] as [number, number], // NYC coordinates
  DEFAULT_ZOOM: 12,
  DOM_READY_DELAY: 100, // milliseconds
  RESIZE_DELAY: 100, // milliseconds
} as const;

class MapboxError extends Error {
  code?: string;
  status?: number;
  
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'MapboxError';
    this.code = code;
    this.status = status;
  }
}

export default function useMapbox() {
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const initializeMap = useCallback(async (
    container: HTMLDivElement,
    center: [number, number],
    zoom: number
  ): Promise<void> => {
    if (mapInstance.current) return;
    
    try {
      // Check if token is available
      if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === '') {
        throw new MapboxError('Mapbox token not configured. Please check your environment variables.');
      }
      
      // Validate coordinates with strict checking
      if (!Array.isArray(center) || center.length !== 2 || 
          typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
          isNaN(center[0]) || isNaN(center[1])) {
        mapLogger.warn('Invalid coordinates provided, using default center');
        center = MAP_CONFIG.DEFAULT_CENTER;
      }
      
      // Set the access token
      mapboxgl.accessToken = MAPBOX_TOKEN;
      mapLogger.info('Mapbox initialization started');
      
      // Add a delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, MAP_CONFIG.DOM_READY_DELAY));
      
      // Create a new map instance with error handling
      let map: mapboxgl.Map;
      
      // Wrap in try-catch to handle Mapbox GL internal errors
      try {
        mapLogger.debug('Creating Mapbox map', { center, zoom, hasContainer: !!container });
        
        map = new mapboxgl.Map({
          container,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center as [number, number],
          zoom: (typeof zoom === 'number' && !isNaN(zoom)) ? zoom : MAP_CONFIG.DEFAULT_ZOOM,
          attributionControl: false,
          trackResize: false // Disable automatic resize tracking to prevent errors
        });
        
        mapLogger.info('Mapbox map created successfully');
        
      } catch (mapboxError) {
        const error = mapboxError as MapboxError;
        mapLogger.error('Mapbox GL initialization failed', error);
        
        // Create a more descriptive error
        const descriptiveError = new MapboxError(
          `Failed to initialize Mapbox: ${error.message}. Please check your Mapbox token and network connection.`
        );
        descriptiveError.code = error.code;
        descriptiveError.status = error.status;
        
        throw descriptiveError;
      }
      
      // Add error handler for the map
      map.on('error', (e) => {
        mapLogger.error('Mapbox GL runtime error', e.error);
        // Don't throw runtime errors - just log them
      });
      
      // Wait for map to load before adding controls
      map.on('load', () => {
        try {
          map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        } catch (controlError) {
          mapLogger.warn('Failed to add navigation controls', controlError);
        }
      });
      
      // Store the map instance
      mapInstance.current = map;
      
    } catch (error) {
      mapLogger.error('Error initializing Mapbox', error);
      
      // Re-throw the error so it can be caught by error boundary
      if (error instanceof MapboxError) {
        throw error;
      } else {
        throw new MapboxError(`Map initialization failed: ${(error as Error).message}`);
      }
    }
  }, []);

  const addMarkers = useCallback((markers: MapMarker[], onMarkerClick?: (marker: MapMarker) => void) => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers only if they have valid coordinates
    markers.forEach((markerData) => {
      if (typeof markerData.longitude !== 'number' || typeof markerData.latitude !== 'number' ||
          isNaN(markerData.longitude) || isNaN(markerData.latitude)) {
        console.warn('Invalid marker coordinates, skipping:', markerData);
        return;
      }

      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23${markerData.color || 'ff0000'}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>')`;
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.cursor = 'pointer';

      // Create and add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.longitude, markerData.latitude])
        .addTo(mapInstance.current!);

      // Add click handler
      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(markerData));
      }

      markersRef.current.push(marker);
    });
  }, []);

  const addRoutes = useCallback((routes: MapRoute[]) => {
    if (!mapInstance.current || !routes.length) return;

    routes.forEach((route, index) => {
      const sourceId = `route-${index}`;
      const layerId = `route-layer-${index}`;

      // Remove existing route if it exists
      if (mapInstance.current!.getLayer(layerId)) {
        mapInstance.current!.removeLayer(layerId);
      }
      if (mapInstance.current!.getSource(sourceId)) {
        mapInstance.current!.removeSource(sourceId);
      }

      // Add route source
      mapInstance.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry || {
            type: 'LineString',
            coordinates: route.coordinates
          }
        }
      });

      // Add route layer
      mapInstance.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': route.color || '#3b82f6',
          'line-width': 3
        }
      });
    });
  }, []);

  const flyToLocation = useCallback((center: [number, number], zoom?: number) => {
    if (!mapInstance.current) return;
    
    mapInstance.current.flyTo({
      center,
      zoom: zoom || mapInstance.current.getZoom(),
      essential: true
    });
  }, []);

  const resizeMap = useCallback(() => {
    if (mapInstance.current) {
      // Small delay to ensure container has been resized
      setTimeout(() => {
        mapInstance.current?.resize();
      }, MAP_CONFIG.RESIZE_DELAY);
    }
  }, []);

  const geocodeLocation = useCallback(async (searchQuery: string): Promise<{
    latitude: number;
    longitude: number;
    fullAddress: string;
  } | null> => {
    if (!MAPBOX_TOKEN || !searchQuery) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        
        return {
          latitude,
          longitude,
          fullAddress: feature.place_name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }, []);

  return {
    initializeMap,
    addMarkers,
    addRoutes,
    flyToLocation,
    resizeMap,
    geocodeLocation
  };
}
