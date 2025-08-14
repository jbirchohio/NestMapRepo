// Test if our Overpass service actually works
import { findRealPlaces } from './server/services/overpassService.js';

async function test() {
  console.log('Testing Overpass service...\n');
  
  try {
    const restaurants = await findRealPlaces('Sigmaringen', 'Germany', 'restaurant', 5);
    console.log(`Found ${restaurants.length} restaurants:`);
    restaurants.forEach(r => {
      console.log(`- ${r.name} at ${r.lat}, ${r.lon}`);
    });
    
    const attractions = await findRealPlaces('Sigmaringen', 'Germany', 'tourism', 5);
    console.log(`\nFound ${attractions.length} attractions:`);
    attractions.forEach(a => {
      console.log(`- ${a.name} at ${a.lat}, ${a.lon}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();