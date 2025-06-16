
interface DisasterEvent {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  coordinates: [number, number];
}

/**
 * Very small set of city to coordinate mappings for demo purposes.
 * In production, this should be replaced with a real geocoding service.
 */
const cityMap: Record<string, { latitude: number; longitude: number }> = {
  'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
  'New York': { latitude: 40.7128, longitude: -74.006 },
  'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
  London: { latitude: 51.5074, longitude: -0.1278 },
  Paris: { latitude: 48.8566, longitude: 2.3522 },
  Tokyo: { latitude: 35.6762, longitude: 139.6503 },
  Berlin: { latitude: 52.52, longitude: 13.405 },
};

export async function fetchEarthquakeAlerts(
  city: string,
  startDate: string,
  endDate: string,
  radiusKm = 300
): Promise<DisasterEvent[]> {
  const coords = cityMap[city];
  if (!coords) {
    throw new Error('Unsupported city for disaster monitoring.');
  }

  const url =
    `https://earthquake.usgs.gov/fdsnws/events/1/query?format=geojson&starttime=${startDate}` +
    `&endtime=${endDate}&latitude=${coords.latitude}&longitude=${coords.longitude}` +
    `&maxradiuskm=${radiusKm}&minmagnitude=4.5`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  if (!data.features) return [];

  return data.features.map((f: any) => ({
    id: f.id,
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString(),
    coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]]
  }));
}

