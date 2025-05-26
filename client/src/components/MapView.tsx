import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import useMapbox from '@/hooks/useMapbox';
import { MapMarker as LibMapMarker, MapRoute as LibMapRoute } from '@/lib/types';

export interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  title: string;
  description?: string;
  color?: string;
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
}

interface MapViewProps {
  markers: MapMarker[];
  routes?: MapRoute[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MapView({
  markers,
  routes = [],
  center = [-74.006, 40.7128],
  zoom = 13,
  onMarkerClick
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { initializeMap, addMarkers, addRoutes, isInitialized } = useMapbox();

  useEffect(() => {
    if (mapContainer.current) {
      console.log('Map initialization started');
      initializeMap(mapContainer.current, center, zoom);
    }
  }, [initializeMap, center, zoom]);

  useEffect(() => {
    if (isInitialized && markers.length > 0) {
      // Convert to lib format that the hook expects
      const libMarkers: LibMapMarker[] = markers.map((marker, index) => ({
        id: marker.id,
        longitude: marker.longitude,
        latitude: marker.latitude,
        locationName: marker.title,
        description: marker.description,
        label: String.fromCharCode(65 + index) // A, B, C, etc.
      }));
      
      addMarkers(libMarkers, onMarkerClick ? (libMarker) => {
        const originalMarker = markers.find(m => m.id === libMarker.id);
        if (originalMarker) onMarkerClick(originalMarker);
      } : undefined);
    }
  }, [isInitialized, markers, addMarkers, onMarkerClick]);

  useEffect(() => {
    if (isInitialized && routes.length > 0) {
      // Convert to lib format
      const libRoutes: LibMapRoute[] = routes.map(route => ({
        id: route.id,
        coordinates: route.coordinates,
        color: route.color,
        duration: 0,
        distance: 0
      }));
      
      addRoutes(libRoutes);
    }
  }, [isInitialized, routes, addRoutes]);

  return (
    <section className="relative w-full h-full overflow-hidden map-container">
      <div className="w-full h-full bg-[hsl(var(--muted))]">
        <div 
          className="w-full h-full" 
          ref={mapContainer} 
          id="map"
        >
          {/* Mapbox map will be rendered here */}
        </div>
      </div>
    </section>
  );
}