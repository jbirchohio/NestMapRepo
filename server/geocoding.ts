/**
 * Server-side geocoding service using Mapbox
 */

interface GeocodeResult {
  latitude: string;
  longitude: string;
  address?: string;
}

/**
 * Geocode a location name to get coordinates
 */
export async function geocodeLocation(
  locationName: string, 
  cityContext?: string
): Promise<GeocodeResult | null> {
  try {
    const mapboxToken = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
    
    if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token') {
      console.error('Mapbox token not configured');
      return null;
    }

    // Clean up location name - remove common prefixes
    let cleanLocationName = locationName
      .replace(/^(visit|experience|explore|see|tour|go to|check out)\s+/i, '')
      .replace(/^the\s+/i, '')
      .replace(/^local\s+/i, '')  // Remove "Local" prefix
      .replace(/\s+spot$/i, '')   // Remove "spot" suffix
      .trim();
    
    // Don't geocode if it's a generic placeholder
    if (cleanLocationName.toLowerCase() === 'custom location' || 
        cleanLocationName.toLowerCase() === 'enter your own') {
      console.log(`Skipping geocoding for placeholder: "${locationName}"`);
      return null;
    }
    
    // Build search query with city context if provided
    let searchQuery = cleanLocationName;
    if (cityContext && !cleanLocationName.toLowerCase().includes(cityContext.toLowerCase())) {
      searchQuery = `${cleanLocationName}, ${cityContext}`;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Add proximity bias to search near the city if we have context
    let proximityParam = '';
    if (cityContext && cityContext.toLowerCase().includes('new york')) {
      // NYC coordinates for proximity bias
      proximityParam = '&proximity=-74.006,40.7128';
    }
    
    // Use types parameter to prefer POIs over regions
    // Include 'place' for neighborhoods but prioritize poi and address
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=poi,address,place${proximityParam}&language=en`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // If city context is provided, prefer results that include the city
      let bestFeature = data.features[0];
      let bestScore = 0;
      
      if (cityContext) {
        const cityLower = cityContext.toLowerCase();
        
        // Score each feature based on relevance
        for (const feature of data.features) {
          let score = 0;
          
          // Higher score if place name includes the city
          if (feature.place_name && feature.place_name.toLowerCase().includes(cityLower)) {
            score += 10;
          }
          
          // Higher score for POIs (most specific)
          if (feature.place_type && feature.place_type.includes('poi')) {
            score += 5;
          }
          
          // Higher score for addresses
          if (feature.place_type && feature.place_type.includes('address')) {
            score += 3;
          }
          
          // Higher relevance score from Mapbox
          if (feature.relevance) {
            score += feature.relevance * 2;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestFeature = feature;
          }
        }
      }
      
      if (bestFeature.center && Array.isArray(bestFeature.center) && bestFeature.center.length >= 2) {
        const [lng, lat] = bestFeature.center;
        
        console.log(`Geocoded "${locationName}" → "${cleanLocationName}" to ${lat}, ${lng} (${bestFeature.place_name})`);
        
        return {
          latitude: lat.toString(),
          longitude: lng.toString(),
          address: bestFeature.place_name || searchQuery
        };
      }
    }

    console.log(`No geocoding results found for: ${searchQuery}`);
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}