import { useCallback } from 'react';
import { MapMarker } from '@/lib/types';

interface DirectionsRoute {
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  duration: number;
  distance: number;
}

export function useMapboxDirections() {
  const fetchRouteDirections = useCallback(async (
    markers: MapMarker[],
    mode: 'driving' | 'walking' | 'cycling' | 'transit' = 'walking'
  ): Promise<DirectionsRoute | null> => {
    if (markers.length < 2) return null;

    try {
      // Sort markers by time
      const sortedMarkers = [...markers].sort((a, b) => {
        const timeA = a.activity?.time || "00:00";
        const timeB = b.activity?.time || "00:00";
        return timeA.localeCompare(timeB);
      });

      // Build waypoints string
      const waypoints = sortedMarkers
        .map(marker => `${marker.longitude},${marker.latitude}`)
        .join(';');

      // Map mode - Mapbox doesn't have transit, so use driving as fallback
      const mapboxMode = mode === 'transit' ? 'driving' : mode;

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${mapboxMode}/${waypoints}?` +
        `geometries=geojson&overview=full&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );

      if (!response.ok) {
        console.error('Directions API error:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        return {
          geometry: data.routes[0].geometry,
          duration: data.routes[0].duration,
          distance: data.routes[0].distance
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching directions:', error);
      return null;
    }
  }, []);

  return { fetchRouteDirections };
}