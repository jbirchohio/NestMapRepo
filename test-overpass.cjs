async function testOverpass() {
  const city = 'Sigmaringen';
  const country = 'Germany';
  
  console.log(`\nFetching real places in ${city}, ${country}...`);
  
  // Get city bounding box
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', ' + country)}&format=json&limit=1`;
  
  try {
    const cityResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'Remvana Test' }
    });
    
    const cityData = await cityResponse.json();
    
    if (cityData.length > 0) {
      const bbox = cityData[0].boundingbox;
      console.log(`City found at: ${cityData[0].lat}, ${cityData[0].lon}`);
      console.log(`Bounding box: ${bbox.join(', ')}`);
      
      // Query for restaurants
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          way["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        );
        out body;
        >;
        out skel qt;
      `;
      
      console.log('\nQuerying Overpass API for restaurants...');
      
      const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const overpassData = await overpassResponse.json();
      
      console.log(`\nFound ${overpassData.elements.length} elements`);
      
      // Show first 10 restaurants
      let count = 0;
      for (const element of overpassData.elements) {
        if (element.tags && element.tags.name && count < 10) {
          console.log(`\n${++count}. ${element.tags.name}`);
          console.log(`   Type: ${element.tags.amenity || 'unknown'}`);
          console.log(`   Cuisine: ${element.tags.cuisine || 'not specified'}`);
          console.log(`   Coords: ${element.lat || element.center?.lat}, ${element.lon || element.center?.lon}`);
          if (element.tags['addr:street']) {
            console.log(`   Address: ${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`);
          }
        }
      }
      
      // Now try tourist attractions
      const tourismQuery = `
        [out:json][timeout:25];
        (
          node["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          way["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          node["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        );
        out body;
        >;
        out skel qt;
      `;
      
      console.log('\n\nQuerying for tourist attractions...');
      
      const tourismResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: tourismQuery,
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const tourismData = await tourismResponse.json();
      
      console.log(`Found ${tourismData.elements.length} tourist elements`);
      
      // Show first 10 attractions
      count = 0;
      for (const element of tourismData.elements) {
        if (element.tags && element.tags.name && count < 10) {
          console.log(`\n${++count}. ${element.tags.name}`);
          console.log(`   Type: ${element.tags.tourism || element.tags.historic || 'place'}`);
          console.log(`   Coords: ${element.lat || element.center?.lat}, ${element.lon || element.center?.lon}`);
        }
      }
      
    } else {
      console.log('City not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testOverpass();