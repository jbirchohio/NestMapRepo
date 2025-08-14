// Simple test of OpenStreetMap/Overpass API
const fetch = require('node-fetch');

async function testOSM() {
  console.log('Testing OpenStreetMap for real places in Sigmaringen...\n');
  
  // First get city bounding box
  const cityQuery = encodeURIComponent('Sigmaringen, Germany');
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${cityQuery}&format=json&limit=1`;
  
  console.log('1. Getting city boundaries...');
  const cityResponse = await fetch(nominatimUrl, {
    headers: { 'User-Agent': 'Remvana Test' }
  });
  
  const cityData = await cityResponse.json();
  
  if (cityData.length === 0) {
    console.log('City not found!');
    return;
  }
  
  const bbox = cityData[0].boundingbox;
  console.log(`   Found: ${cityData[0].display_name}`);
  console.log(`   Bounds: ${bbox.join(', ')}\n`);
  
  // Now search for restaurants
  console.log('2. Searching for REAL restaurants...');
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
      way["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
    );
    out body;
  `;
  
  const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: overpassQuery,
    headers: { 'Content-Type': 'text/plain' }
  });
  
  const overpassData = await overpassResponse.json();
  
  // Filter to get only named places
  const restaurants = overpassData.elements
    .filter(e => e.tags && e.tags.name)
    .slice(0, 10);
  
  console.log(`   Found ${restaurants.length} real restaurants:\n`);
  
  restaurants.forEach((r, i) => {
    console.log(`   ${i+1}. ${r.tags.name}`);
    if (r.tags.cuisine) console.log(`      Cuisine: ${r.tags.cuisine}`);
    console.log(`      GPS: ${r.lat || r.center?.lat}, ${r.lon || r.center?.lon}`);
    if (r.tags['addr:street']) {
      console.log(`      Address: ${r.tags['addr:housenumber'] || ''} ${r.tags['addr:street']}`);
    }
    console.log('');
  });
  
  // Search for tourist attractions
  console.log('3. Searching for REAL tourist attractions...');
  const tourismQuery = `
    [out:json][timeout:25];
    (
      node["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
      way["tourism"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
      node["historic"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
    );
    out body;
  `;
  
  const tourismResponse = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: tourismQuery,
    headers: { 'Content-Type': 'text/plain' }
  });
  
  const tourismData = await tourismResponse.json();
  
  const attractions = tourismData.elements
    .filter(e => e.tags && e.tags.name)
    .slice(0, 10);
  
  console.log(`   Found ${attractions.length} real attractions:\n`);
  
  attractions.forEach((a, i) => {
    console.log(`   ${i+1}. ${a.tags.name}`);
    console.log(`      Type: ${a.tags.tourism || a.tags.historic || 'place'}`);
    console.log(`      GPS: ${a.lat || a.center?.lat}, ${a.lon || a.center?.lon}`);
    console.log('');
  });
  
  console.log('\n✅ These are REAL places with EXACT coordinates!');
  console.log('The problem is our code isn\'t using this data properly.');
}

testOSM().catch(console.error);