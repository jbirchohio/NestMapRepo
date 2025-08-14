const osmBatch = require('./server/dist/services/osmBatchFetch');

async function test() {
  console.log('Testing OSM batch fetch with cache...');
  
  try {
    console.log('\n1. Testing Berlin (should hit cache or fetch)...');
    const berlinResult = await osmBatch.batchFetchAndCache('Berlin', 'Germany');
    console.log(`Berlin results: ${berlinResult.restaurants.length} restaurants, ${berlinResult.attractions.length} attractions, ${berlinResult.cafes.length} cafes`);
    
    console.log('\n2. Testing Berlin again (should hit cache)...');
    const berlinCached = await osmBatch.batchFetchAndCache('Berlin', 'Germany');
    console.log(`Berlin cached: ${berlinCached.restaurants.length} restaurants, ${berlinCached.attractions.length} attractions, ${berlinCached.cafes.length} cafes`);
    
    console.log('\n3. Testing Paris (new fetch)...');
    const parisResult = await osmBatch.batchFetchAndCache('Paris', 'France');
    console.log(`Paris results: ${parisResult.restaurants.length} restaurants, ${parisResult.attractions.length} attractions, ${parisResult.cafes.length} cafes`);
    
    console.log('\nCache test complete!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();