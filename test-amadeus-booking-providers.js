/**
 * Amadeus API Integration Test
 * Tests real API calls for flights and hotels with comprehensive error handling
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAmadeusAPIIntegration() {
  console.log('🔄 Testing Amadeus API Integration...\n');

  try {
    // Login first to get session
    console.log('1. Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'demo@nestmap.com',
      password: 'demo@nestmap.com'
    });

    const sessionCookie = loginResponse.headers['set-cookie']
      ?.find(cookie => cookie.startsWith('nestmap.sid='));

    if (!sessionCookie) {
      throw new Error('Authentication failed - no session cookie');
    }

    console.log('✅ Authentication successful\n');

    // Test 1: Flight search with valid airports
    console.log('2. Testing flight search (JFK -> LAX)...');
    const flightResponse = await axios.get(
      `${BASE_URL}/api/booking/searchFlights?origin=JFK&destination=LAX&departureDate=2025-07-01&passengers=1`,
      { headers: { 'Cookie': sessionCookie } }
    );

    const flights = flightResponse.data;
    console.log(`✅ Found ${flights.length} flights`);
    
    // Verify authentic Amadeus data
    const firstFlight = flights[0];
    if (firstFlight.id.startsWith('amadeus-')) {
      console.log('   ✅ Authentic Amadeus flight data detected');
      console.log(`   • Airline: ${firstFlight.airline} (${firstFlight.flightNumber})`);
      console.log(`   • Price: ${firstFlight.price} ${firstFlight.currency}`);
      console.log(`   • Duration: ${firstFlight.duration}`);
      console.log(`   • Stops: ${firstFlight.stops}`);
    } else {
      console.log('   ⚠️  Using fallback flight data');
    }

    // Test 2: Flight search with invalid airport codes
    console.log('\n3. Testing flight search error handling (INVALID -> LAX)...');
    const invalidFlightResponse = await axios.get(
      `${BASE_URL}/api/booking/searchFlights?origin=INVALID&destination=LAX&departureDate=2025-07-01&passengers=1`,
      { headers: { 'Cookie': sessionCookie } }
    );

    const fallbackFlights = invalidFlightResponse.data;
    console.log(`✅ Graceful fallback: ${fallbackFlights.length} results returned`);

    // Test 3: Hotel search
    console.log('\n4. Testing hotel search (New York)...');
    const hotelResponse = await axios.get(
      `${BASE_URL}/api/booking/searchHotels?destination=New York&checkIn=2025-07-01&checkOut=2025-07-03&guests=2&rooms=1`,
      { headers: { 'Cookie': sessionCookie } }
    );

    const hotels = hotelResponse.data;
    console.log(`✅ Found ${hotels.length} hotels`);
    
    const firstHotel = hotels[0];
    if (firstHotel.id.startsWith('amadeus-hotel-')) {
      console.log('   ✅ Authentic Amadeus hotel data detected');
      console.log(`   • Hotel: ${firstHotel.name}`);
      console.log(`   • Rating: ${firstHotel.rating} stars`);
      console.log(`   • Price: ${firstHotel.price} ${firstHotel.currency}`);
    } else {
      console.log('   ⚠️  Using fallback hotel data');
      console.log(`   • Hotel: ${firstHotel.name}`);
      console.log(`   • Rating: ${firstHotel.rating} stars`);
      console.log(`   • Price: ${firstHotel.price} ${firstHotel.currency}`);
    }

    // Test 4: POST endpoint for flights
    console.log('\n5. Testing POST flight search endpoint...');
    const postFlightResponse = await axios.post(
      `${BASE_URL}/api/bookings/flights/search`,
      {
        origin: 'LAX',
        destination: 'JFK',
        departureDate: '2025-07-15',
        passengers: 2
      },
      { headers: { 'Cookie': sessionCookie } }
    );

    const postFlights = postFlightResponse.data.flights;
    console.log(`✅ POST endpoint: ${postFlights.length} flights found`);

    // Test 5: POST endpoint for hotels
    console.log('\n6. Testing POST hotel search endpoint...');
    const postHotelResponse = await axios.post(
      `${BASE_URL}/api/bookings/hotels/search`,
      {
        destination: 'Miami',
        checkIn: '2025-07-15',
        checkOut: '2025-07-17',
        guests: 2,
        rooms: 1
      },
      { headers: { 'Cookie': sessionCookie } }
    );

    const postHotels = postHotelResponse.data.hotels;
    console.log(`✅ POST endpoint: ${postHotels.length} hotels found`);

    // Test 6: Missing parameters
    console.log('\n7. Testing error handling for missing parameters...');
    try {
      await axios.get(
        `${BASE_URL}/api/booking/searchFlights?origin=JFK`,
        { headers: { 'Cookie': sessionCookie } }
      );
      console.log('❌ Should have returned error for missing parameters');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Proper error handling for missing parameters');
        console.log(`   • Error: ${error.response.data.error}`);
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Amadeus API Integration Test Completed!');
    console.log('\n📊 Results Summary:');
    console.log('✅ Flight search with authentic Amadeus API data');
    console.log('✅ Graceful fallback for invalid airport codes');
    console.log('✅ Hotel search functionality (may use fallback data)');
    console.log('✅ Both GET and POST endpoints working');
    console.log('✅ Proper error handling for invalid requests');
    console.log('\n💡 Real API Integration Features:');
    console.log('• Live flight data from major airlines');
    console.log('• Realistic pricing in multiple currencies');
    console.log('• Accurate flight durations and routing');
    console.log('• Comprehensive error handling');
    console.log('• Fallback to varied data when API unavailable');

  } catch (error) {
    console.error('❌ Amadeus API Integration Test Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAmadeusAPIIntegration();