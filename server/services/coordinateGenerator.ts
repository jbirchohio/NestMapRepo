/**
 * Generate realistic coordinates for activities when geocoding fails
 * Uses city center as base and distributes activities around it
 */

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface ActivityLocation {
  title: string;
  locationName: string;
  tag?: string;
  latitude?: string | null;
  longitude?: string | null;
}

/**
 * Generate distributed coordinates for activities around a city center
 * This ensures activities don't all pile up at the same location
 */
export function generateDistributedCoordinates(
  activities: ActivityLocation[],
  cityCenter: Coordinate,
  cityName: string
): ActivityLocation[] {
  console.log(`[COORD-GEN] Generating distributed coordinates for ${activities.length} activities around ${cityName}`);
  
  // Define zones based on activity types
  const zones: Record<string, { offsetLat: number; offsetLng: number; radius: number }> = {
    'food': { offsetLat: 0.01, offsetLng: -0.01, radius: 0.015 },      // Food zone - slightly north-west
    'sightseeing': { offsetLat: 0, offsetLng: 0, radius: 0.02 },      // Central zone
    'culture': { offsetLat: -0.008, offsetLng: 0.008, radius: 0.012 }, // Cultural zone - slightly south-east
    'entertainment': { offsetLat: 0.005, offsetLng: 0.005, radius: 0.01 }, // Entertainment - slightly north-east
    'nightlife': { offsetLat: 0.003, offsetLng: -0.003, radius: 0.008 },   // Nightlife - compact area
    'activity': { offsetLat: 0, offsetLng: 0, radius: 0.025 },        // Default - wider spread
  };
  
  // Track used coordinates to avoid exact duplicates
  const usedCoords = new Set<string>();
  
  return activities.map((activity, index) => {
    // If activity already has valid coordinates, keep them
    if (activity.latitude && activity.longitude && 
        activity.latitude !== 'null' && activity.longitude !== 'null') {
      return activity;
    }
    
    // Determine zone based on tag or title keywords
    let zone = zones['activity']; // default
    const tag = activity.tag?.toLowerCase() || '';
    const titleLower = activity.title?.toLowerCase() || '';
    
    if (tag in zones) {
      zone = zones[tag];
    } else if (titleLower.includes('restaurant') || titleLower.includes('food') || 
               titleLower.includes('breakfast') || titleLower.includes('lunch') || 
               titleLower.includes('dinner') || titleLower.includes('coffee')) {
      zone = zones['food'];
    } else if (titleLower.includes('museum') || titleLower.includes('gallery') || 
               titleLower.includes('theater') || titleLower.includes('theatre')) {
      zone = zones['culture'];
    } else if (titleLower.includes('bar') || titleLower.includes('club') || 
               titleLower.includes('nightlife')) {
      zone = zones['nightlife'];
    }
    
    // Generate coordinates within the zone
    let lat: number, lng: number;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      // Use golden ratio for better distribution
      const goldenAngle = 137.5 * (index + attempts);
      const angleRad = (goldenAngle * Math.PI) / 180;
      
      // Vary radius slightly for each activity
      const radiusVariation = 0.3 + (0.7 * Math.random());
      const radius = zone.radius * radiusVariation;
      
      // Calculate offset from zone center
      const offsetFromZone = {
        lat: radius * Math.cos(angleRad) * 0.7, // Flatten the circle a bit (cities are often wider than tall)
        lng: radius * Math.sin(angleRad)
      };
      
      // Final coordinates
      lat = cityCenter.latitude + zone.offsetLat + offsetFromZone.lat;
      lng = cityCenter.longitude + zone.offsetLng + offsetFromZone.lng;
      
      // Add small random jitter to prevent exact overlaps
      lat += (Math.random() - 0.5) * 0.001;
      lng += (Math.random() - 0.5) * 0.001;
      
      attempts++;
    } while (usedCoords.has(`${lat.toFixed(5)},${lng.toFixed(5)}`) && attempts < maxAttempts);
    
    // Mark these coordinates as used
    usedCoords.add(`${lat.toFixed(5)},${lng.toFixed(5)}`);
    
    console.log(`[COORD-GEN] Generated coords for "${activity.title}": ${lat.toFixed(6)}, ${lng.toFixed(6)} (zone: ${tag || 'default'})`);
    
    return {
      ...activity,
      latitude: lat.toString(),
      longitude: lng.toString()
    };
  });
}

/**
 * Get rough city center coordinates as fallback
 * This is a last resort when Mapbox fails completely
 */
export function getCityCenter(cityName: string): Coordinate | null {
  const cityCenters: Record<string, Coordinate> = {
    'nashville': { latitude: 36.1627, longitude: -86.7816 },
    'new york': { latitude: 40.7128, longitude: -74.0060 },
    'los angeles': { latitude: 34.0522, longitude: -118.2437 },
    'chicago': { latitude: 41.8781, longitude: -87.6298 },
    'houston': { latitude: 29.7604, longitude: -95.3698 },
    'miami': { latitude: 25.7617, longitude: -80.1918 },
    'denver': { latitude: 39.7392, longitude: -104.9903 },
    'seattle': { latitude: 47.6062, longitude: -122.3321 },
    'san francisco': { latitude: 37.7749, longitude: -122.4194 },
    'boston': { latitude: 42.3601, longitude: -71.0589 },
    'atlanta': { latitude: 33.7490, longitude: -84.3880 },
    'austin': { latitude: 30.2672, longitude: -97.7431 },
    'portland': { latitude: 45.5152, longitude: -122.6784 },
    'las vegas': { latitude: 36.1699, longitude: -115.1398 },
    'orlando': { latitude: 28.5383, longitude: -81.3792 },
    'san diego': { latitude: 32.7157, longitude: -117.1611 },
    'philadelphia': { latitude: 39.9526, longitude: -75.1652 },
    'phoenix': { latitude: 33.4484, longitude: -112.0740 },
    'dallas': { latitude: 32.7767, longitude: -96.7970 },
    'washington': { latitude: 38.9072, longitude: -77.0369 },
    'washington dc': { latitude: 38.9072, longitude: -77.0369 },
    'myrtle beach': { latitude: 33.6891, longitude: -78.8867 },
  };
  
  const cityLower = cityName.toLowerCase().trim();
  
  // Try exact match first
  if (cityCenters[cityLower]) {
    return cityCenters[cityLower];
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(cityCenters)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return coords;
    }
  }
  
  console.log(`[COORD-GEN] No predefined center for "${cityName}"`);
  return null;
}