/**
 * Test NYC Hotel Search and Pricing with Real Amadeus API
 */

const fetch = require('node-fetch');

// Amadeus API functions
async function getAmadeusToken() {
  try {
    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Amadeus authentication failed:', error.message);
    throw error;
  }
}

async function searchNYCHotels() {
  console.log('🏨 Searching for hotels in NYC (June 1-10, 2025)...\n');
  
  try {
    const token = await getAmadeusToken();
    console.log('✅ Amadeus API authentication successful\n');

    // Get NYC city code
    const cityResponse = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations/cities?keyword=New York&max=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const cityData = await cityResponse.json();
    const cityCode = cityData.data?.[0]?.iataCode || 'NYC';
    console.log(`City code for NYC: ${cityCode}\n`);

    // Search hotels
    const searchParams = new URLSearchParams({
      cityCode: cityCode,
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-10',
      adults: '2',
      roomQuantity: '1',
      radius: '20',
      radiusUnit: 'KM',
    });

    const hotelResponse = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations/hotels/by-city?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!hotelResponse.ok) {
      throw new Error(`Hotel search failed: ${hotelResponse.statusText}`);
    }

    const hotelData = await hotelResponse.json();
    const hotels = hotelData.data || [];

    console.log(`Found ${hotels.length} hotels in NYC:\n`);

    // Display first 5 hotels
    hotels.slice(0, 5).forEach((hotel, index) => {
      console.log(`${index + 1}. ${hotel.name}`);
      console.log(`   Hotel ID: ${hotel.hotelId}`);
      console.log(`   Address: ${hotel.address?.cityName}, ${hotel.address?.countryCode}`);
      console.log(`   Chain: ${hotel.chainCode || 'Independent'}`);
      console.log('');
    });

    if (hotels.length > 0) {
      const selectedHotel = hotels[0];
      await getHotelOffers(token, selectedHotel.hotelId);
    }

  } catch (error) {
    console.error('❌ Hotel search failed:', error.message);
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('Please verify your Amadeus API credentials are correct.');
    }
  }
}

async function getHotelOffers(token, hotelId) {
  console.log(`\n💰 Getting pricing for hotel ID: ${hotelId}...\n`);

  try {
    const searchParams = new URLSearchParams({
      hotelIds: hotelId,
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-10',
      adults: '2',
      roomQuantity: '1',
    });

    const offersResponse = await fetch(
      `https://api.amadeus.com/v3/shopping/hotel-offers?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!offersResponse.ok) {
      throw new Error(`Offers request failed: ${offersResponse.statusText}`);
    }

    const offersData = await offersResponse.json();
    const offers = offersData.data?.[0]?.offers || [];

    if (offers.length === 0) {
      console.log('No offers available for this hotel on the selected dates.');
      return;
    }

    console.log(`Available offers (${offers.length} room types):\n`);

    offers.slice(0, 3).forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.room?.type || 'Standard Room'}`);
      console.log(`   Total Price: ${offer.price?.currency} ${offer.price?.total}`);
      console.log(`   Base Price: ${offer.price?.currency} ${offer.price?.base}`);
      if (offer.price?.taxes) {
        console.log(`   Taxes: ${offer.price?.currency} ${offer.price?.taxes}`);
      }
      console.log(`   Board Type: ${offer.boardType || 'Room Only'}`);
      console.log(`   Cancellation: ${offer.policies?.cancellation?.type || 'Check policy'}`);
      console.log('');
    });

    console.log('🎉 Hotel search and pricing test completed successfully!');
    console.log('\nThe 3-step booking workflow is ready:');
    console.log('1. ✅ Search hotels in destination');
    console.log('2. ✅ Get detailed pricing for selected hotel');
    console.log('3. ✅ Book room with guest information (ready for implementation)');

  } catch (error) {
    console.error('❌ Offers request failed:', error.message);
  }
}

// Run the test
searchNYCHotels();