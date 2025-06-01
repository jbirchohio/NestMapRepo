// Simple script to test the location search API
import fetch from "node-fetch";

async function testLocationSearch(query) {
  console.log(`Testing location search for: "${query}"`);
  
  try {
    // Call the API endpoint
    const response = await fetch("http://localhost:5000/api/ai/find-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ searchQuery: query }),
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));
    
    // Now try to get coordinates with Mapbox
    if (data.address) {
      const address = data.address || 
                     (data.name + ", " + 
                     (data.city || "New York City") + ", " + 
                     (data.region || "NY"));
      
      console.log(`\nGetting coordinates for address: "${address}"`);
      
      // We need to use the MAPBOX_TOKEN from environment
      const mapboxToken = process.env.MAPBOX_TOKEN;
      if (!mapboxToken) {
        console.error("MAPBOX_TOKEN environment variable not set");
        return;
      }
      
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;
      const mapboxResponse = await fetch(mapboxUrl);
      
      if (!mapboxResponse.ok) {
        throw new Error(`Mapbox API returned status ${mapboxResponse.status}`);
      }
      
      const mapboxData = await mapboxResponse.json();
      
      if (mapboxData.features && mapboxData.features.length > 0) {
        const feature = mapboxData.features[0];
        console.log("Mapbox Response:", JSON.stringify({
          name: feature.text,
          place_name: feature.place_name,
          center: feature.center,
        }, null, 2));
      } else {
        console.log("No results from Mapbox");
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Test with different locations
async function runTests() {
  await testLocationSearch("Leo House Hotel");
  console.log("\n-----------------------------------------\n");
  
  await testLocationSearch("Empire State Building");
  console.log("\n-----------------------------------------\n");
  
  await testLocationSearch("Central Park");
}

runTests();