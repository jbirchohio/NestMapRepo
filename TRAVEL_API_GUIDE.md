# Travel API Integration Guide

## Recommended Approach for Remvana

### Phase 1: Search & Compare (No Payment Handling)

1. **Amadeus Self-Service API** (Best overall option)
   - Sign up: https://developers.amadeus.com
   - Free tier: 1,000 calls/month
   - Pricing: ~$0.001-0.10 per call after free tier
   - Features: Hotels, Flights, Activities, Car Rentals
   
2. **Implementation Strategy**:
   ```javascript
   // Search hotels
   GET /api/hotels/search
   → Call Amadeus API
   → Return results with prices
   → Include deep links to booking sites
   
   // User clicks "Book"
   → Redirect to hotel/airline website
   → They handle payment
   → You track via affiliate ID
   ```

### Phase 2: Earn Revenue (Affiliate Programs)

1. **Join Affiliate Networks**:
   - Booking.com: 4-6% commission
   - Hotels.com: 3-5% commission  
   - Skyscanner: Variable CPC
   - TripAdvisor: 50% of their commission

2. **Integration Example**:
   ```javascript
   // Add your affiliate ID to URLs
   const bookingUrl = `https://booking.com/hotel/...?aid=YOUR_AFFILIATE_ID`
   ```

### Phase 3: Advanced Booking (Future)

If you want in-app booking later:
- **Stripe Connect**: Handle payments, distribute to suppliers
- **Duffel**: Full booking API (flights)
- **TravelgateX**: Hotel wholesaler API

## Cost Comparison Table

| API | Search Cost | Booking Cost | Free Tier | Payment Handling |
|-----|------------|--------------|-----------|------------------|
| Amadeus | $0.001-0.10 | Redirect only | 1K/month | No |
| Google Hotels | $0.032-0.035 | N/A | Pay-as-you-go | No |
| Booking.com | Free | Free (commission) | Unlimited | They handle |
| Duffel | Free search | ~$5-10/booking | None | Yes |

## Quick Start Code

### 1. Environment Variables
```bash
# .env
AMADEUS_CLIENT_ID=your_id
AMADEUS_CLIENT_SECRET=your_secret
BOOKING_AFFILIATE_ID=your_affiliate_id
```

### 2. Hotel Search Endpoint
```typescript
// server/routes/hotels.ts
import Amadeus from 'amadeus';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

router.get('/hotels/search', async (req, res) => {
  const { cityCode, checkIn, checkOut } = req.query;
  
  try {
    const response = await amadeus.shopping.hotelOffers.get({
      cityCode,
      checkInDate: checkIn,
      checkOutDate: checkOut
    });
    
    // Add affiliate links
    const hotelsWithLinks = response.data.map(hotel => ({
      ...hotel,
      bookingLink: `https://booking.com/search?location=${cityCode}&checkin=${checkIn}&aid=${process.env.BOOKING_AFFILIATE_ID}`
    }));
    
    res.json({ hotels: hotelsWithLinks });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});
```

### 3. Frontend Integration
```typescript
// Show results with booking buttons
{hotels.map(hotel => (
  <Card key={hotel.id}>
    <h3>{hotel.name}</h3>
    <p>${hotel.price.total}</p>
    <Button 
      onClick={() => window.open(hotel.bookingLink, '_blank')}
      className="bg-green-600"
    >
      Book on Booking.com →
    </Button>
  </Card>
))}
```

## Recommended Implementation Path

1. **Week 1**: Set up Amadeus API for hotel search
2. **Week 2**: Add flight search (Amadeus or Skyscanner)
3. **Week 3**: Implement affiliate tracking
4. **Week 4**: Add "save to trip" functionality

## Important Notes

- **Never handle payment info** unless you're PCI compliant
- **Start with affiliate model** - easier and risk-free
- **Track conversions** with URL parameters
- **Be transparent** - tell users they're leaving your site
- **Cache API responses** to reduce costs

## Cost Saving Tips

1. **Cache searches** for 5-15 minutes
2. **Use pagination** - don't load all results
3. **Implement search filters** to reduce API calls
4. **Show "popular hotels"** from cached data
5. **Rate limit users** to prevent abuse