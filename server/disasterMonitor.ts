interface DisasterEvent {
    id: string;
    magnitude: number;
    place: string;
    time: string;
    coordinates: [
        number,
        number
    ];
}
interface Coordinates {
    latitude: number;
    longitude: number;
}
async function fetchCityCoordinates(city: string): Promise<Coordinates> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&` +
        `q=${encodeURIComponent(city)}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": "NestMap/1.0 (+https://example.com)"
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to geocode city: ${response.status}`);
    }
    const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
    }>;
    if (results.length === 0) {
        throw new Error("City not found for disaster monitoring");
    }
    return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon)
    };
}
export async function fetchEarthquakeAlerts(city: string, startDate: string, endDate: string, radiusKm = 300): Promise<DisasterEvent[]> {
    const coords = await fetchCityCoordinates(city);
    const url = `https://earthquake.usgs.gov/fdsnws/events/1/query?format=geojson&starttime=${startDate}` +
        `&endtime=${endDate}&latitude=${coords.latitude}&longitude=${coords.longitude}` +
        `&maxradiuskm=${radiusKm}&minmagnitude=4.5`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`USGS API error: ${response.status}`);
    }
    const data = (await response.json()) as any;
    if (!data.features)
        return [];
    return data.features.map((f: any) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: new Date(f.properties.time).toISOString(),
        coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]]
    }));
}
