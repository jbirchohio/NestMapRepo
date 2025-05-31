import { Button } from "@/components/ui/button";
import { MapMarker, MapRoute } from "@/lib/types";

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
  center,
  zoom,
  onMarkerClick,
}: MapViewProps) {
  
  return (
    <section className="relative w-full h-full overflow-hidden map-container" style={{height: '100%', position: 'relative'}}>
      <div className="w-full h-full bg-slate-100 dark:bg-slate-800" style={{height: '100%', position: 'relative'}}>
        {/* Temporary placeholder until we fix Mapbox */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
          <div className="text-center p-8">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Map View</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {markers.length > 0 ? `${markers.length} locations planned` : 'Add activities to see them on the map'}
            </p>
            {markers.length > 0 && (
              <div className="mt-4 space-y-2">
                {markers.slice(0, 3).map((marker, index) => (
                  <div 
                    key={marker.id}
                    className="bg-white dark:bg-slate-700 rounded p-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600"
                    onClick={() => onMarkerClick?.(marker)}
                  >
                    {index + 1}. {marker.label || 'Activity'}
                  </div>
                ))}
                {markers.length > 3 && (
                  <div className="text-xs text-slate-400">
                    +{markers.length - 3} more locations
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="bg-white hover:bg-white dark:bg-slate-700 dark:hover:bg-slate-600 shadow-md rounded-full"
            disabled
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-white hover:bg-white dark:bg-slate-700 dark:hover:bg-slate-600 shadow-md rounded-full"
            disabled
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>

        {/* Map Footer Info */}
        {markers.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-700 bg-opacity-90 dark:bg-opacity-90 p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Route Overview</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {markers.length} stops planned
                  {routes && routes.length > 0 && routes[0]?.distance && 
                    ` · ${(routes[0].distance / 1609.34).toFixed(1)} miles total`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}