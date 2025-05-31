import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapMarker, MapRoute } from "@/lib/types";

// Import the Mapbox CSS
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
      console.log('Mapbox token configured:', MAPBOX_TOKEN ? 'Yes' : 'No');
      console.log('Map center coordinates:', center);
      
      // Add a delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new map instance with error handling
      let map: mapboxgl.Map;
      
      // Wrap in try-catch to handle Mapbox GL internal errors
      try {
        console.log('Creating Mapbox map with:', { center, zoom, hasContainer: !!container });
        
        map = new mapboxgl.Map({
          container,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center as [number, number],
          zoom: (typeof zoom === 'number' && !isNaN(zoom)) ? zoom : 12,
          attributionControl: false,
          trackResize: false // Disable automatic resize tracking to prevent errors
        });
        
        console.log('Mapbox map created successfully');
        
      } catch (mapboxError) {
        console.error('Mapbox GL initialization failed:', mapboxError);
        console.error('Error details:', {
          message: mapboxError?.message || 'Unknown error',
          stack: mapboxError?.stack || 'No stack trace',
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
          geometry: route.geometry
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
      }, 100);
    }
  }, []);

  return {
    initializeMap,
    addMarkers,
    addRoutes,
    flyToLocation,
    resizeMap
  };
}