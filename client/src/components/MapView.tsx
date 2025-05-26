import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useMapbox } from '@/hooks/useMapbox';

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
  center = [-74.006, 40.7128], // Default to NYC
  zoom = 13,
  onMarkerClick
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  
  const { initializeMap, addMarkers, addRoutes, setMapCenter, zoomIn, zoomOut } = useMapbox({
    container: mapContainer,
    center,
    zoom,
    onMarkerClick
  });

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    if (markers.length > 0) {
      addMarkers(markers);
    }
  }, [markers, addMarkers]);

  useEffect(() => {
    if (routes.length > 0) {
      addRoutes(routes);
    }
  }, [routes, addRoutes]);

  useEffect(() => {
    setMapCenter(center);
  }, [center, setMapCenter]);

  const handleZoomIn = () => {
    try {
      zoomIn();
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  };

  const handleZoomOut = () => {
    try {
      zoomOut();
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  };

  const handleRecenter = () => {
    try {
      setMapCenter(center);
    } catch (error) {
      console.error('Error recentering map:', error);
    }
  };

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

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="bg-white hover:bg-white dark:bg-[hsl(var(--card))] dark:hover:bg-[hsl(var(--card))] shadow-md rounded-full"
            onClick={handleZoomIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-white hover:bg-white dark:bg-[hsl(var(--card))] dark:hover:bg-[hsl(var(--card))] shadow-md rounded-full"
            onClick={handleZoomOut}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-white hover:bg-white dark:bg-[hsl(var(--card))] dark:hover:bg-[hsl(var(--card))] shadow-md rounded-full"
            onClick={handleRecenter}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
}