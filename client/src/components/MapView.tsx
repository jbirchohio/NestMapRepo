import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientActivity, MapMarker, MapRoute } from "@/lib/types";
import useMapbox from "@/hooks/useMapbox";
import { DEFAULT_MAP_SETTINGS } from "@/lib/constants";

interface MapViewProps {
  markers: MapMarker[];
  routes?: MapRoute[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MapView({
  markers = [],
  routes = [],
  center = DEFAULT_MAP_SETTINGS.center,
  zoom = DEFAULT_MAP_SETTINGS.zoom,
  onMarkerClick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { initializeMap, addMarkers, addRoutes, flyToLocation, resizeMap } = useMapbox();
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapContainer.current && !isMapReady) {
      initializeMap(mapContainer.current, center, zoom).then(() => {
        setIsMapReady(true);
      });
    }
  }, [mapContainer, center, zoom, initializeMap, isMapReady]);

  // Force map resize when container dimensions change
  useEffect(() => {
    if (isMapReady && mapContainer.current) {
      const resizeObserver = new ResizeObserver(() => {
        // Trigger map resize after a small delay to ensure container is fully rendered
        setTimeout(() => {
          const mapInstance = (window as any).mapboxMap;
          if (mapInstance && mapInstance.resize) {
            mapInstance.resize();
          }
        }, 100);
      });

      resizeObserver.observe(mapContainer.current);
      return () => resizeObserver.disconnect();
    }
  }, [isMapReady]);

  // Update markers when they change
  useEffect(() => {
    if (isMapReady && markers.length > 0) {
      addMarkers(markers, onMarkerClick);
    }
  }, [isMapReady, markers, addMarkers, onMarkerClick]);

  // Update routes when they change
  useEffect(() => {
    if (isMapReady && routes.length > 0) {
      addRoutes(routes);
    }
  }, [isMapReady, routes, addRoutes]);

  const handleZoomIn = () => {
    if (isMapReady) {
      flyToLocation(center, zoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (isMapReady) {
      flyToLocation(center, zoom - 1);
    }
  };

  const handleLocate = () => {
    if (isMapReady && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        flyToLocation([longitude, latitude], 14);
      });
    }
  };

  return (
    <section className="relative w-full h-full overflow-hidden map-container" style={{height: '100%', minHeight: '400px', position: 'relative'}}>
      <div className="w-full h-full bg-[hsl(var(--muted))]" style={{height: '100%', minHeight: '400px', position: 'relative'}}>
        <div className="absolute inset-0" ref={mapContainer} id="map" style={{width: '100%', height: '100%', minHeight: '400px', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
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
            onClick={handleLocate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>

        {/* Map Footer Info */}
        {markers.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-[hsl(var(--card))] bg-opacity-90 dark:bg-opacity-90 p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Route Overview</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {markers.length} stops
                  {routes.length > 0 && routes[0]?.distance && 
                    ` · ${(routes[0].distance / 1609.34).toFixed(1)} miles total`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-[hsl(var(--primary))]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Add Button (only shown on mobile) */}
        <div className="absolute bottom-20 right-4 md:hidden">
          <Button 
            className="bg-[hsl(var(--primary))] text-white p-4 rounded-full shadow-lg" 
            size="icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
}
