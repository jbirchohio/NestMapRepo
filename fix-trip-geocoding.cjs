const { Client } = require('pg');
require('dotenv').config();

async function geocodeLocation(locationName, cityContext, countryContext) {
  const mapboxToken = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    console.error('No Mapbox token found');
    return null;
  }

  // Build search query with city and country context
  let searchQuery = locationName;
  
  if (cityContext && !locationName.toLowerCase().includes(cityContext.toLowerCase())) {
    searchQuery = `${locationName}, ${cityContext}`;
  }
  
  if (countryContext && !searchQuery.toLowerCase().includes(countryContext.toLowerCase())) {
    searchQuery = `${searchQuery}, ${countryContext}`;
  }

  console.log(`Geocoding: ${searchQuery}`);

  const encodedQuery = encodeURIComponent(searchQuery);
  
  // Get country code
  let countryParam = '';
  if (countryContext) {
    const countryMap = {
      'germany': 'de',
      'deutschland': 'de',
      'france': 'fr',
      'italy': 'it',
      'spain': 'es',
      'united kingdom': 'gb',
      'uk': 'gb',
      'united states': 'us',
      'usa': 'us'
    };
    
    const countryLower = countryContext.toLowerCase();
    for (const [name, code] of Object.entries(countryMap)) {
      if (countryLower.includes(name)) {
        countryParam = `&country=${code}`;
        break;
      }
    }
  }
  
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=place,poi,address${countryParam}&language=en`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const cityLower = cityContext?.toLowerCase() || '';
      
      // Find best match that's actually in the right city
      let bestFeature = null;
      let bestScore = -1000;
      
      for (const feature of data.features) {
        let score = 0;
        const placeLower = feature.place_name?.toLowerCase() || '';
        const textLower = feature.text?.toLowerCase() || '';
        
        // Huge bonus for being in the right city
        if (cityContext && placeLower.includes(cityLower)) {
          score += 100;
        } else if (cityContext && !feature.place_type?.includes('place')) {
          score -= 200;  // Penalty for wrong city
        }
        
        // Check if this IS the city we're looking for
        if (feature.place_type?.includes('place') && 
            feature.place_type.length === 1 &&
            textLower === cityLower) {
          score += 50;
        }
        
        // Bonus for POIs and addresses
        if (feature.place_type?.includes('poi')) score += 50;
        if (feature.place_type?.includes('address')) score += 30;
        
        // Bonus for relevance
        if (feature.relevance) score += feature.relevance * 10;
        
        if (score > bestScore) {
          bestScore = score;
          bestFeature = feature;
        }
      }
      
      // If we found nothing good, try to at least get the city
      if (bestScore < 0 && cityContext) {
        const cityQuery = `${cityContext}${countryContext ? ', ' + countryContext : ''}`;
        const encodedCityQuery = encodeURIComponent(cityQuery);
        const cityUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCityQuery}.json?access_token=${mapboxToken}&limit=1&types=place${countryParam}&language=en`;
        
        const cityResponse = await fetch(cityUrl);
        const cityData = await cityResponse.json();
        
        if (cityData.features && cityData.features.length > 0) {
          bestFeature = cityData.features[0];
          console.log(`  Using city center fallback`);
        }
      }
      
      if (bestFeature && bestFeature.center) {
        const [lng, lat] = bestFeature.center;
        console.log(`  → ${lat}, ${lng} (${bestFeature.place_name})`);
        return { latitude: lat, longitude: lng };
      }
    }
    
    console.log(`  → No results found`);
    return null;
  } catch (error) {
    console.error('Error geocoding:', error);
    return null;
  }
}

async function fixTripGeocoding() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // First, fix the trip city coordinates
    console.log('\n=== Fixing Trip 120 City Coordinates ===');
    const cityCoords = await geocodeLocation('Sigmaringen', null, 'Germany');
    
    if (cityCoords) {
      await client.query(`
        UPDATE trips 
        SET city_latitude = $1, city_longitude = $2
        WHERE id = 120
      `, [cityCoords.latitude, cityCoords.longitude]);
      
      console.log(`Updated trip city coords to: ${cityCoords.latitude}, ${cityCoords.longitude}`);
    }
    
    // Get trip details for context
    const tripResult = await client.query(`
      SELECT id, title, city, country
      FROM trips 
      WHERE id = 120
    `);
    
    const trip = tripResult.rows[0];
    const city = trip.city;
    const country = trip.country;
    
    // Get all activities
    const activitiesResult = await client.query(`
      SELECT id, title, location_name
      FROM activities 
      WHERE trip_id = 120
      ORDER BY date, time
    `);
    
    console.log(`\n=== Fixing ${activitiesResult.rows.length} Activities ===\n`);
    
    for (const activity of activitiesResult.rows) {
      console.log(`Activity: ${activity.title}`);
      console.log(`  Location: ${activity.location_name}`);
      
      // Skip if no location name
      if (!activity.location_name || activity.location_name === 'N/A') {
        console.log('  → Skipping (no location)');
        continue;
      }
      
      // Geocode the location
      const coords = await geocodeLocation(activity.location_name, city, country);
      
      if (coords) {
        await client.query(`
          UPDATE activities 
          SET latitude = $1, longitude = $2
          WHERE id = $3
        `, [coords.latitude.toString(), coords.longitude.toString(), activity.id]);
        
        console.log(`  ✓ Updated coordinates`);
      } else {
        console.log(`  ✗ Could not geocode`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n=== Geocoding Fix Complete ===');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixTripGeocoding();