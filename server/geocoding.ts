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
    
    // CRITICAL: Extract just the street address if it looks like "Business Name, Address"
    // Mapbox geocodes addresses better without business names
    let addressOnly = cleanLocationName;
    
    // Pattern 1: "Business Name, 123 Street Name" -> "123 Street Name"
    const addressMatch = cleanLocationName.match(/,\s*(\d+\s+[^,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir|plaza|highway|hwy|parkway|pkwy)[^,]*)/i);
    if (addressMatch) {
      addressOnly = addressMatch[1];
      console.log(`[GEOCODE] Extracted address: "${addressOnly}" from "${cleanLocationName}"`);
      cleanLocationName = addressOnly;
    } else {
      // Pattern 2: If it starts with text before a number, try removing the business name
      const simpleAddressMatch = cleanLocationName.match(/^[^0-9,]+,\s*(\d+.+)/);
      if (simpleAddressMatch) {
        addressOnly = simpleAddressMatch[1];
        console.log(`[GEOCODE] Extracted address: "${addressOnly}" from "${cleanLocationName}"`);
        cleanLocationName = addressOnly;
      }
    }
    
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

    console.log(`[GEOCODE] Input: "${locationName}" → Clean: "${cleanLocationName}" → Query: "${searchQuery}"`);

    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Add proximity bias to search near the city if we have context
    let proximityParam = '';
    if (cityContext && cityContext.toLowerCase().includes('new york')) {
      // NYC coordinates for proximity bias
      proximityParam = '&proximity=-74.006,40.7128';
    }
    
    // CHANGED: Prioritize address type for better results
    // Only fall back to POI and place if address doesn't work
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=address,poi,place${proximityParam}&language=en`;

    console.log(`[GEOCODE] API URL: ${url.replace(mapboxToken, 'HIDDEN')}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      console.log(`[GEOCODE] Found ${data.features.length} results for "${searchQuery}"`);
      
      // Debug: Log all features
      data.features.forEach((f: any, i: number) => {
        console.log(`[GEOCODE]   ${i}: ${f.place_name} (${f.place_type?.join(',')}) [${f.center?.[1]}, ${f.center?.[0]}]`);
      });
      
      // CRITICAL FIX: Don't just take the first result!
      // Prefer specific locations over generic city results
      let bestFeature = null;
      let bestScore = -1;
      
      const cityLower = cityContext?.toLowerCase() || '';
      
      // Score each feature based on relevance and type
      for (const feature of data.features) {
        let score = 0;
        
        // PENALIZE generic place results (cities/regions)
        // These are usually fallback results when specific location isn't found
        if (feature.place_type?.includes('place') && 
            feature.place_type.length === 1 &&
            feature.text?.toLowerCase() === cityLower) {
          score -= 100;  // Heavy penalty for generic city result
        }
        
        // HIGHEST priority for POIs (actual businesses/landmarks)
        if (feature.place_type?.includes('poi')) {
          score += 50;
        }
        
        // HIGH priority for addresses
        if (feature.place_type?.includes('address')) {
          score += 30;
        }
        
        // Bonus if place name includes the location we're searching for
        const searchTerms = cleanLocationName.toLowerCase().split(/[\s,]+/);
        const placeLower = feature.place_name?.toLowerCase() || '';
        for (const term of searchTerms) {
          if (term.length > 3 && placeLower.includes(term)) {
            score += 10;
          }
        }
        
        // Bonus if in the right city
        if (cityContext && placeLower.includes(cityLower)) {
          score += 5;
        }
        
        // Use Mapbox relevance score
        if (feature.relevance) {
          score += feature.relevance * 10;
        }
        
        console.log(`[GEOCODE]   Score for ${feature.place_name}: ${score}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestFeature = feature;
        }
      }
      
      // If we only found generic city results (negative score), 
      // don't use them - return null instead
      if (bestScore < 0) {
        console.log(`[GEOCODE] Only found generic city result for "${locationName}" - returning null`);
        return null;
      }
      
      if (bestFeature.center && Array.isArray(bestFeature.center) && bestFeature.center.length >= 2) {
        const [lng, lat] = bestFeature.center;
        
        console.log(`[GEOCODE] Selected: "${bestFeature.place_name}" at ${lat}, ${lng}`);
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