// Test what OSM actually returns for our generate-weekend endpoint
const fetch = require('node-fetch');

async function getRealPlaces(city, country, category) {
  console.log(`\nFetching ${category} for ${city}, ${country}...`);
  
  try {
    // Step 1: Get city bounding box
    const cityQuery = encodeURIComponent(`${city}, ${country}`);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${cityQuery}&format=json&limit=1`;
    
    const cityResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'Remvana/1.0' }
    });
    
    if (!cityResponse.ok) {
      console.error(`Failed to get city data: ${cityResponse.status}`);
      return [];
    }
    
    const cityData = await cityResponse.json();
    
    if (!cityData || cityData.length === 0) {
      console.error(`City not found: ${city}, ${country}`);
      return [];
    }
    
    const bbox = cityData[0].boundingbox;
    console.log(`Found city bounds: ${bbox.join(', ')}`);
    
    // Step 2: Build Overpass query
    let overpassQuery = '';
    
    switch (category) {
      case 'restaurant':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
        
      case 'tourism':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            node["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
        
      case 'cafe':
        overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="cafe"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            node["amenity"="bakery"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["amenity"="cafe"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          );
          out body;
        `;
        break;
    }
    
    // Step 3: Query Overpass API
    const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' }
    });
    
    if (!overpassResponse.ok) {
      console.error(`Overpass API failed: ${overpassResponse.status}`);
      return [];
    }
    
    const overpassData = await overpassResponse.json();
    
    // Step 4: Parse results
    const places = [];
    
    for (const element of overpassData.elements) {
      if (element.tags && element.tags.name) {
        const place = {
          name: element.tags.name,
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
          type: element.tags.amenity || element.tags.tourism || element.tags.historic,
          address: element.tags['addr:street'] ? 
            `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`.trim() : 
            undefined,
          cuisine: element.tags.cuisine
        };
        
        places.push(place);
        
        // Limit results
        if (places.length >= 20) break;
      }
    }
    
    console.log(`Found ${places.length} ${category} places`);
    return places;
    
  } catch (error) {
    console.error(`Error fetching places:`, error);
    return [];
  }
}

async function testWeekendGeneration() {
  console.log('Testing what OSM returns for Sigmaringen, Germany...\n');
  
  // Fetch real places in parallel (same as the endpoint does)
  const [restaurants, attractions, cafes] = await Promise.all([
    getRealPlaces('Sigmaringen', 'Germany', 'restaurant'),
    getRealPlaces('Sigmaringen', 'Germany', 'tourism'),
    getRealPlaces('Sigmaringen', 'Germany', 'cafe')
  ]);
  
  console.log('\n=== RESTAURANTS ===');
  restaurants.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.name}`);
    if (r.cuisine) console.log(`   Cuisine: ${r.cuisine}`);
    console.log(`   GPS: ${r.lat}, ${r.lon}`);
    if (r.address) console.log(`   Address: ${r.address}`);
  });
  
  console.log('\n=== ATTRACTIONS ===');
  attractions.slice(0, 5).forEach((a, i) => {
    console.log(`${i+1}. ${a.name}`);
    console.log(`   Type: ${a.type}`);
    console.log(`   GPS: ${a.lat}, ${a.lon}`);
  });
  
  console.log('\n=== CAFES ===');
  cafes.slice(0, 5).forEach((c, i) => {
    console.log(`${i+1}. ${c.name}`);
    console.log(`   Type: ${c.type}`);
    console.log(`   GPS: ${c.lat}, ${c.lon}`);
  });
  
  console.log('\n=== WHAT WEEKEND GENERATOR WOULD USE ===');
  console.log('Day 1 (Friday):');
  if (restaurants[0]) console.log(`  - Dinner at ${restaurants[0].name} (GPS: ${restaurants[0].lat}, ${restaurants[0].lon})`);
  
  console.log('\nDay 2 (Saturday):');
  if (attractions[0]) console.log(`  - Visit ${attractions[0].name} (GPS: ${attractions[0].lat}, ${attractions[0].lon})`);
  if (restaurants[1]) console.log(`  - Lunch at ${restaurants[1].name} (GPS: ${restaurants[1].lat}, ${restaurants[1].lon})`);
  if (attractions[1]) console.log(`  - Explore ${attractions[1].name} (GPS: ${attractions[1].lat}, ${attractions[1].lon})`);
  if (cafes[0]) console.log(`  - Coffee at ${cafes[0].name} (GPS: ${cafes[0].lat}, ${cafes[0].lon})`);
  if (restaurants[2]) console.log(`  - Dinner at ${restaurants[2].name} (GPS: ${restaurants[2].lat}, ${restaurants[2].lon})`);
  
  console.log('\nDay 3 (Sunday):');
  if (attractions[2]) console.log(`  - Morning at ${attractions[2].name} (GPS: ${attractions[2].lat}, ${attractions[2].lon})`);
  if (restaurants[3]) console.log(`  - Farewell lunch at ${restaurants[3].name} (GPS: ${restaurants[3].lat}, ${restaurants[3].lon})`);
}

testWeekendGeneration().catch(console.error);