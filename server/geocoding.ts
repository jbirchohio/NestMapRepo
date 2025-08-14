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
  cityContext?: string,
  countryContext?: string
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
    
    // Build search query with city and country context if provided
    let searchQuery = cleanLocationName;
    
    // CRITICAL: Always include city context for location-specific searches
    // This helps Mapbox find the right location in the right city
    if (cityContext && !cleanLocationName.toLowerCase().includes(cityContext.toLowerCase())) {
      searchQuery = `${cleanLocationName}, ${cityContext}`;
    }
    
    // Add country context for better international results
    if (countryContext && !searchQuery.toLowerCase().includes(countryContext.toLowerCase())) {
      searchQuery = `${searchQuery}, ${countryContext}`;
    }

    console.log(`[GEOCODE] Input: "${locationName}" → Clean: "${cleanLocationName}" → Query: "${searchQuery}"`);

    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use country code for better results instead of proximity bias
    let countryParam = '';
    if (countryContext) {
      // Map country names to ISO codes for Mapbox
      const countryMap: { [key: string]: string } = {
        'germany': 'de',
        'deutschland': 'de',
        'france': 'fr',
        'italy': 'it',
        'spain': 'es',
        'united kingdom': 'gb',
        'uk': 'gb',
        'united states': 'us',
        'usa': 'us',
        'canada': 'ca',
        'australia': 'au',
        'japan': 'jp',
        'china': 'cn',
        'netherlands': 'nl',
        'belgium': 'be',
        'switzerland': 'ch',
        'austria': 'at',
        'poland': 'pl',
        'portugal': 'pt',
        'greece': 'gr',
        'sweden': 'se',
        'norway': 'no',
        'denmark': 'dk',
        'finland': 'fi'
      };
      
      const countryLower = countryContext.toLowerCase();
      for (const [name, code] of Object.entries(countryMap)) {
        if (countryLower.includes(name)) {
          countryParam = `&country=${code}`;
          break;
        }
      }
    }
    
    // Use place,poi,address order for better landmark results
    // Add country filter if available
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=place,poi,address${countryParam}&language=en`;

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
      const countryLower = countryContext?.toLowerCase() || '';
      
      // Score each feature based on relevance and type
      for (const feature of data.features) {
        let score = 0;
        
        const placeLower = feature.place_name?.toLowerCase() || '';
        const textLower = feature.text?.toLowerCase() || '';
        
        // CRITICAL: Check if this result is actually in the right city
        // This is the most important factor for location-specific searches
        if (cityContext && cityLower) {
          // Check if the full place name includes the city
          if (placeLower.includes(cityLower)) {
            score += 100;  // Huge bonus for being in the right city
            console.log(`[GEOCODE]   ✓ In correct city: ${cityLower}`);
          } else {
            // If we're looking for a specific location in a city, heavily penalize wrong cities
            if (!feature.place_type?.includes('place')) {
              score -= 200;  // Heavy penalty for being in wrong city
              console.log(`[GEOCODE]   ✗ Wrong city (looking for ${cityLower})`);
            }
          }
        }
        
        // Special handling for when we're searching for the city itself
        if (feature.place_type?.includes('place') && 
            feature.place_type.length === 1) {
          // This is a city/place result
          if (textLower === cityLower || 
              (cityContext && textLower === cityContext.toLowerCase())) {
            // This IS the city we're looking for
            score += 50;
            console.log(`[GEOCODE]   ✓ This is the target city`);
          } else {
            // This is some other city - not what we want
            score -= 100;
            console.log(`[GEOCODE]   ✗ Wrong city result`);
          }
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
        for (const term of searchTerms) {
          if (term.length > 3 && placeLower.includes(term)) {
            score += 10;
          }
        }
        
        // STRONG bonus if in the right country (critical for international geocoding)
        if (countryContext && placeLower.includes(countryLower)) {
          score += 25;
        }
        
        // PENALTY for results in wrong country
        const wrongCountries = ['united states', 'usa', 'united kingdom', 'uk', 'canada'];
        if (countryContext && countryLower.includes('germany')) {
          for (const wrongCountry of wrongCountries) {
            if (placeLower.includes(wrongCountry)) {
              score -= 50;
              break;
            }
          }
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
      
      // If we only found results with negative scores (wrong cities),
      // try to at least geocode the city itself as a fallback
      if (bestScore < 0 && cityContext) {
        console.log(`[GEOCODE] No good matches found - falling back to city coordinates for ${cityContext}`);
        
        // Make a new request just for the city
        const cityQuery = `${cityContext}${countryContext ? ', ' + countryContext : ''}`;
        const encodedCityQuery = encodeURIComponent(cityQuery);
        const cityUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCityQuery}.json?access_token=${mapboxToken}&limit=1&types=place${countryParam}&language=en`;
        
        try {
          const cityResponse = await fetch(cityUrl);
          const cityData = await cityResponse.json();
          
          if (cityData.features && cityData.features.length > 0) {
            const cityFeature = cityData.features[0];
            if (cityFeature.center && Array.isArray(cityFeature.center) && cityFeature.center.length >= 2) {
              const [lng, lat] = cityFeature.center;
              console.log(`[GEOCODE] Using city center fallback: ${lat}, ${lng}`);
              
              return {
                latitude: lat.toString(),
                longitude: lng.toString(),
                address: `${cleanLocationName}, ${cityFeature.place_name}`
              };
            }
          }
        } catch (error) {
          console.error('[GEOCODE] Error getting city fallback:', error);
        }
        
        // If even city geocoding fails, return null
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