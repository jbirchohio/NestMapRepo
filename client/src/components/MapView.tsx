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
  return (
    <div 
      className="w-full h-full relative" 
      style={{ 
        backgroundColor: 'red',
        minHeight: '100vh',
        border: '3px solid blue'
      }}
    >
      <h2 style={{ color: 'white', padding: '20px' }}>MAP CONTAINER - FULL HEIGHT TEST</h2>
      <div 
        id="map"
        style={{ 
          width: '100%',
          height: 'calc(100vh - 200px)',
          backgroundColor: 'green',
          border: '2px solid yellow'
        }}
      >
        {/* Mapbox map will be rendered here */}
        <p style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
          Container should now fill remaining screen height!
        </p>
      </div>
    </div>
  );
}