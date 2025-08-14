require('dotenv').config();

async function testGeocode() {
  const mapboxToken = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN;
  
  const locations = [
    'Sigmaringen Castle, Sigmaringen, Germany',
    'Sigmaringen, Germany',
    'Café am Markt, Sigmaringen, Germany',
    'Danube River Promenade, Sigmaringen, Germany'
  ];
  
  for (const location of locations) {
    console.log(`\n=== Testing: ${location} ===`);
    
    const encodedQuery = encodeURIComponent(location);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=place,poi,address&country=de&language=en`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        console.log(`Found ${data.features.length} results:`);
        
        for (let i = 0; i < Math.min(3, data.features.length); i++) {
          const f = data.features[i];
          console.log(`  ${i+1}. ${f.place_name}`);
          console.log(`     Coords: ${f.center[1]}, ${f.center[0]}`);
          console.log(`     Type: ${f.place_type.join(', ')}`);
        }
        
        const best = data.features[0];
        console.log(`\nBest match: ${best.center[1]}, ${best.center[0]}`);
        console.log(`Expected for Sigmaringen: ~48.08, ~9.21`);
        
        const lat = best.center[1];
        const lon = best.center[0];
        const distance = Math.sqrt(Math.pow(lat - 48.08, 2) + Math.pow(lon - 9.21, 2));
        if (distance > 1) {
          console.log(`⚠️  WARNING: Result is ${distance.toFixed(1)} degrees away from expected location!`);
        }
      } else {
        console.log('No results found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  // Now test WITHOUT country filter
  console.log('\n\n=== Testing WITHOUT country filter ===');
  const testLocation = 'Sigmaringen Castle';
  const encodedQuery = encodeURIComponent(testLocation);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&types=place,poi,address&language=en`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      console.log(`Found ${data.features.length} results for "${testLocation}":`);
      
      for (let i = 0; i < data.features.length; i++) {
        const f = data.features[i];
        console.log(`  ${i+1}. ${f.place_name}`);
        console.log(`     Coords: ${f.center[1]}, ${f.center[0]}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGeocode();