import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapMarker, MapRoute } from "@/lib/types";

// Import the Mapbox CSS
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Check if token is the placeholder value
if (MAPBOX_TOKEN === 'pk.your_mapbox_token' || !MAPBOX_TOKEN) {
  console.warn('Mapbox token not configured. Please set VITE_MAPBOX_TOKEN in your .env file.');
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
        console.error('Mapbox token not configured');
        return;
      }
      
      // Validate coordinates with strict checking
      if (!Array.isArray(center) || center.length !== 2 || 
          typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
          isNaN(center[0]) || isNaN(center[1])) {
        center = [-74.006, 40.7128]; // Default to NYC
      }
      
      // Set the access token
      mapboxgl.accessToken = MAPBOX_TOKEN;
      // Mapbox configuration and initialization
      
      // Add a delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new map instance with error handling
      let map: mapboxgl.Map;
      
      // Wrap in try-catch to handle Mapbox GL internal errors
      try {
        // Creating Mapbox map with provided options
        
        map = new mapboxgl.Map({
          container,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center as [number, number],
          zoom: (typeof zoom === 'number' && !isNaN(zoom)) ? zoom : 12,
          attributionControl: false,
          trackResize: false // Disable automatic resize tracking to prevent errors
        });
        
        // Mapbox map initialized successfully
        
      } catch (mapboxError) {
        console.error('Mapbox GL initialization failed:', mapboxError);
        console.error('Error details:', {
          message: (mapboxError as any)?.message || 'Unknown error',
          stack: (mapboxError as any)?.stack || 'No stack trace',
          center,
          zoom,
          containerExists: !!container
        });
        // Don't throw - just return silently to prevent React crashes
        return;
      }
      
      // Add error handler for the map
      map.on('error', (e) => {
        console.error('Mapbox GL error:', e.error);
        // Don't throw - just log the error
      });
      
      // Wait for map to load before adding controls
      map.on('load', () => {
        try {
          map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        } catch (controlError) {
          console.warn('Failed to add navigation controls:', controlError);
        }
      });
      
      // Store the map instance
      mapInstance.current = map;
      
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      console.error('Failed to initialize map:', error);
      // Don't throw - just return to prevent React crashes
      return;
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
      el.style.position = 'relative';
      el.style.width = '40px';
      el.style.height = '40px';
      
      // Create the pin icon
      const pin = document.createElement('div');
      pin.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23${(markerData as any).color || 'ef4444'}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>')`;
      pin.style.width = '40px';
      pin.style.height = '40px';
      pin.style.backgroundSize = 'contain';
      pin.style.backgroundRepeat = 'no-repeat';
      pin.style.cursor = 'pointer';
      
      // Create label with the marker letter
      const label = document.createElement('div');
      label.textContent = markerData.label || '';
      label.style.position = 'absolute';
      label.style.top = '8px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.color = 'white';
      label.style.fontSize = '14px';
      label.style.fontWeight = 'bold';
      label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
      label.style.pointerEvents = 'none';
      
      el.appendChild(pin);
      el.appendChild(label);

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
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    
    // Ensure map is loaded before manipulating styles
    if (!map.loaded()) {
      map.once('load', () => {
        addRoutes(routes); // Retry once loaded
      });
      return;
    }

    try {
      // First, remove all existing routes
      const style = map.getStyle();
      if (style && style.layers) {
        // Remove all route layers
        style.layers.forEach((layer: any) => {
          if (layer.id && layer.id.startsWith('route-layer-')) {
            if (map.getLayer(layer.id)) {
              map.removeLayer(layer.id);
            }
          }
        });
      }
      
      // Remove all route sources
      if (style && style.sources) {
        Object.keys(style.sources).forEach(sourceId => {
          if (sourceId.startsWith('route-')) {
            if (map.getSource(sourceId)) {
              map.removeSource(sourceId);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error removing existing routes:', error);
    }

    // If no new routes, stop here (this clears all routes)
    if (!routes.length) return;

    routes.forEach((route, index) => {
      try {
        const sourceId = `route-${index}`;
        const layerId = `route-layer-${index}`;

        // Remove existing route if it exists
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }

        // Add route source
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates
            }
          }
        });

        // Add route layer
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': (route as any).color || '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.7,
            'line-dasharray': [0, 2]
          }
        });
      } catch (error) {
        console.warn(`Error adding route ${index}:`, error);
      }
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
      }, 100);
    }
  }, []);

  const geocodeLocation = useCallback(async (searchQuery: string, isCity?: boolean): Promise<{
    latitude: number;
    longitude: number;
    fullAddress: string;
  } | null> => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_mapbox_token' || !searchQuery) {
      console.warn('Mapbox geocoding unavailable: token not configured');
      return null;
    }
    
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