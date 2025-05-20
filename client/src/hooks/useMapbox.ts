import { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapMarker, MapRoute } from "@/lib/types";
import { MAPBOX_STYLE_URL } from "@/lib/constants";

// Hard-coded Mapbox token for development
const MAPBOX_TOKEN = "pk.eyJ1IjoicmV0bW91c2VyIiwiYSI6ImNtOXJtOHZ0MjA0dTgycG9ocDA3dXNpMGIifQ.WHYwcRzR3g8djNiBsVw1vg";

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

  // Get trip destination coordinates for better geocoding context
  const getTripDestinationCoordinates = useCallback((): { longitude?: number, latitude?: number, city?: string } => {
    // Try to get coordinates from URL if we're in a trip view
    const path = window.location.pathname;
    const tripMatch = path.match(/\/trip\/(\d+)/);
    
    // If we're in a trip view with a trip ID
    if (tripMatch && tripMatch[1]) {
      // Check if the trip data is in localStorage (we'll store it there in the TripPlanner component)
      const tripData = localStorage.getItem(`trip_${tripMatch[1]}`);
      if (tripData) {
        try {
          const trip = JSON.parse(tripData);
          if (trip.longitude && trip.latitude) {
            return {
              longitude: parseFloat(trip.longitude), 
              latitude: parseFloat(trip.latitude),
              city: trip.city
            };
          }
        } catch (e) {
          console.error("Error parsing trip data from localStorage:", e);
        }
      }
    }
    
    // Default to NYC if no trip context available
    return { longitude: -73.9857, latitude: 40.7484, city: "New York City" };
  }, []);
  
  // Geocode a location name to coordinates with improved accuracy for POIs and landmarks
  const geocodeLocation = useCallback(async (locationName: string): Promise<{ longitude: number, latitude: number, fullAddress?: string } | null> => {
    try {
      // Get trip context for better geocoding
      const tripContext = getTripDestinationCoordinates();
      
      // Augment the search term if it doesn't already include the city
      let searchTerm = locationName;
      if (tripContext.city) {
        const cityTerms = tripContext.city.toLowerCase().split(/[ ,]+/);
        const searchLower = searchTerm.toLowerCase();
        
        // Check if search already includes city name
        const hasCityReference = cityTerms.some(term => 
          term.length > 2 && searchLower.includes(term)
        );
        
        // If search doesn't have city reference, append city
        if (!hasCityReference && searchTerm.split(",").length === 1) {
          searchTerm = `${searchTerm}, ${tripContext.city}`;
        }
      }
      
      // Define bounding box (bbox) around trip destination for more relevant results
      // Format: [min_longitude, min_latitude, max_longitude, max_latitude]
      let bbox = undefined;
      if (tripContext.longitude && tripContext.latitude) {
        // Create a bbox that's roughly 20km on each side of the destination
        const offset = 0.18; // ~20km at most latitudes
        bbox = [
          tripContext.longitude - offset,
          tripContext.latitude - offset,
          tripContext.longitude + offset,
          tripContext.latitude + offset
        ].join(',');
      }
      
      // Use a more comprehensive query for places 
      const queryParams = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        types: 'poi,address', // Include both POIs and addresses in first query
        limit: '10',
        language: 'en'
      });
      
      // Add bbox if available for more precise contextual results
      if (bbox) {
        queryParams.append('bbox', bbox);
      } 
      // Otherwise use proximity if we have coordinates
      else if (tripContext.longitude && tripContext.latitude) {
        queryParams.append('proximity', `${tripContext.longitude},${tripContext.latitude}`);
      }
      
      // First query - focused on POIs near the trip destination
      const poiQuery = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?${queryParams.toString()}`;
      
      // Second query - include more specific searches for places like Leo House that might not register as POIs
      const fallbackParams = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        types: 'poi,place,address',
        limit: '8',
        language: 'en',
        // Ensure the geocoder knows we want exact matches
        fuzzyMatch: 'false',
        // Set a higher autocomplete value for better prediction
        autocomplete: 'true'
      });
      
      if (tripContext.longitude && tripContext.latitude) {
        fallbackParams.append('proximity', `${tripContext.longitude},${tripContext.latitude}`);
      }
      
      const fallbackQuery = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?${fallbackParams.toString()}`;
      
      // Debug the queries being sent
      console.log("GEOCODE DEBUG - POI Query:", {
        searchTerm,
        url: poiQuery,
        params: Object.fromEntries(queryParams.entries()),
        tripContext
      });
      
      // Try POI search first
      let response = await fetch(poiQuery);
      let data = await response.json();
      
      console.log("GEOCODE RESPONSE - POI Result:", {
        features: data.features?.length || 0,
        firstResult: data.features?.length > 0 ? data.features[0].place_name : 'none',
        allTypes: data.features?.map((f: any) => f.place_type).flat().filter((v: any, i: number, a: any) => a.indexOf(v) === i) || []
      });
      
      // If no POIs found, try broader search
      if (!data.features || data.features.length === 0) {
        console.log("GEOCODE DEBUG - Fallback Query:", {
          searchTerm, 
          url: fallbackQuery,
          params: Object.fromEntries(fallbackParams.entries()),
        });
        
        response = await fetch(fallbackQuery);
        data = await response.json();
        
        console.log("GEOCODE RESPONSE - Fallback Result:", {
          features: data.features?.length || 0,
          firstResult: data.features?.length > 0 ? data.features[0].place_name : 'none',
          allTypes: data.features?.map((f: any) => f.place_type).flat().filter((v: any, i: number, a: any) => a.indexOf(v) === i) || []
        });
      }
      
      if (data.features && data.features.length > 0) {
        // Score and rank the features based on relevance
        const scoredFeatures = data.features.map((feature: any) => {
          let score = 0;
          
          // Parse search words, ignoring common terms
          const searchWords = searchTerm.toLowerCase()
            .replace(/\b(the|a|an|in|of|at|by|for|with|hotel|inn|motel)\b/g, '')
            .split(/[ ,]+/)
            .filter((w: string) => w.length > 2);
          
          // Get feature name and type
          const featureName = feature.text.toLowerCase();
          const featureType = feature.place_type?.[0] || '';
          
          // Strongly prefer POIs
          if (featureType === 'poi') score += 25;
          if (featureType === 'place') score += 15;
          
          // Prefer items with relevance higher than 0.8 (Mapbox score)
          if (feature.relevance > 0.8) score += feature.relevance * 20;
          
          // Prefer landmarks or known places
          if (feature.properties?.category?.includes('landmark')) score += 20;
          
          // Prefer exact name matches (e.g., "Empire State Building")
          searchWords.forEach((word: string) => {
            if (featureName.includes(word)) {
              score += 5;
              
              // Extra points for words at the beginning
              if (featureName.startsWith(word)) score += 10;
            }
          });
          
          // Slightly prefer results in the same city as trip context
          if (tripContext.city && 
              feature.place_name.toLowerCase().includes(tripContext.city.toLowerCase())) {
            score += 10;
          }
          
          return { feature, score };
        });
        
        // Sort by score descending
        scoredFeatures.sort((a: any, b: any) => b.score - a.score);
        
        // Use the highest scoring feature
        const bestMatch = scoredFeatures[0].feature;
        
        const [longitude, latitude] = bestMatch.center;
        const fullAddress = bestMatch.place_name;
        
        console.log("Location found:", { 
          input: searchTerm,
          matched: fullAddress,
          coordinates: [longitude, latitude],
          allResults: data.features.slice(0, 5).map((f: any) => f.place_name),
          score: scoredFeatures[0].score
        });
        
        return { longitude, latitude, fullAddress };
      }
      
      return null;
    } catch (error) {
      console.error("Error geocoding location:", error);
      return null;
    }
  }, [getTripDestinationCoordinates]);

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
