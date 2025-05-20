import { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapMarker, MapRoute } from "@/lib/types";
import { MAPBOX_STYLE_URL } from "@/lib/constants";

// Mapbox access token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoibmVzdG1hcHVzZXIiLCJhIjoiY2wxMjM0NTY3ODkwazNrcGp5NnZ0OXFociJ9.abcdefghijk123456";

export default function useMapbox() {
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string | number]: mapboxgl.Marker }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the Mapbox instance
  const initializeMap = useCallback(async (
    container: HTMLElement,
    center: [number, number],
    zoom: number
  ): Promise<void> => {
    if (mapInstance.current) return;
    
    try {
      // Set the access token
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      // Create a new map instance
      const map = new mapboxgl.Map({
        container,
        style: MAPBOX_STYLE_URL,
        center,
        zoom,
        attributionControl: false,
      });
      
      // Add zoom and rotation controls
      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Wait for map to load
      await new Promise<void>((resolve) => {
        map.on('load', () => {
          resolve();
        });
      });
      
      mapInstance.current = map;
      setIsInitialized(true);
      
      return;
    } catch (error) {
      console.error("Error initializing Mapbox:", error);
      throw error;
    }
  }, []);

  // Add markers to the map
  const addMarkers = useCallback((
    markers: MapMarker[],
    onMarkerClick?: (marker: MapMarker) => void
  ): void => {
    if (!mapInstance.current || !isInitialized) return;
    
    // Clear previous markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Create a function to generate custom marker element
    const createMarkerElement = (label: string) => {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = 'hsl(16, 100%, 50%)'; // accent color
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.innerHTML = label;
      return el;
    };
    
    // Add markers for each location
    markers.forEach((marker) => {
      const { id, latitude, longitude, label } = marker;
      
      // Create custom marker element with label
      const el = createMarkerElement(label || 'X');
      
      // Create the marker
      const mapboxMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(mapInstance.current!);
      
      // Add click handler if provided
      if (onMarkerClick) {
        mapboxMarker.getElement().addEventListener('click', () => {
          onMarkerClick(marker);
        });
      }
      
      // Store reference to the marker
      markersRef.current[id] = mapboxMarker;
    });
    
    // If there are markers, fit the map to show all of them
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(marker => {
        bounds.extend([marker.longitude, marker.latitude]);
      });
      
      mapInstance.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 15,
      });
    }
  }, [isInitialized]);

  // Add routes to the map
  const addRoutes = useCallback((routes: MapRoute[]): void => {
    if (!mapInstance.current || !isInitialized) return;
    
    // Remove existing routes
    routes.forEach((_, index) => {
      if (mapInstance.current!.getLayer(`route-${index}`)) {
        mapInstance.current!.removeLayer(`route-${index}`);
      }
      if (mapInstance.current!.getSource(`route-${index}`)) {
        mapInstance.current!.removeSource(`route-${index}`);
      }
    });
    
    // Add new routes
    routes.forEach((route, index) => {
      // Skip if no coordinates or only one point
      if (!route.coordinates || route.coordinates.length < 2) return;
      
      // Create GeoJSON source for the route
      if (!mapInstance.current!.getSource(`route-${index}`)) {
        mapInstance.current!.addSource(`route-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates,
            },
          },
        });
      } else {
        // Update existing source if it exists
        const source = mapInstance.current!.getSource(`route-${index}`) as mapboxgl.GeoJSONSource;
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        });
      }
      
      // Create a line layer for the route
      if (!mapInstance.current!.getLayer(`route-${index}`)) {
        mapInstance.current!.addLayer({
          id: `route-${index}`,
          type: 'line',
          source: `route-${index}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#4571E6', // primary color
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });
      }
    });
  }, [isInitialized]);

  // Geocode a location name to coordinates
  const geocodeLocation = useCallback(async (locationName: string): Promise<{ longitude: number, latitude: number } | null> => {
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return { longitude, latitude };
      }
      
      return null;
    } catch (error) {
      console.error("Error geocoding location:", error);
      return null;
    }
  }, []);

  // Fly to a location
  const flyToLocation = useCallback((center: [number, number], zoom: number): void => {
    if (!mapInstance.current || !isInitialized) return;
    
    mapInstance.current.flyTo({
      center,
      zoom,
      essential: true,
    });
  }, [isInitialized]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return {
    initializeMap,
    addMarkers,
    addRoutes,
    geocodeLocation,
    flyToLocation,
    isInitialized,
  };
}
