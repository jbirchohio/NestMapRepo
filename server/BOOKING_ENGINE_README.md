# Booking Engine Documentation

## Overview

The Booking Engine provides a complete, production-ready booking system for flights and hotels with real API integrations, database persistence, payment processing, and comprehensive error handling.

## Features

### ✅ Fully Functional Components

- **Real Flight Bookings**: Amadeus API integration for actual flight bookings
- **Hotel Bookings**: Smart fallback system (Amadeus Hotels → Simulation)
- **Payment Processing**: Complete Stripe integration with refunds
- **Database Persistence**: All bookings saved to PostgreSQL
- **Validation**: Comprehensive input validation with Zod schemas
- **Error Handling**: Robust error handling and fallback mechanisms
- **Cancellation System**: Real cancellation with refund calculations
- **Status Tracking**: Live booking status monitoring
- **Health Monitoring**: Built-in health checks for all services

### 🔧 API Integrations

1. **Amadeus Flight API** - Real flight search and booking
2. **Stripe Payment API** - Complete payment processing
3. **Database Persistence** - PostgreSQL with Drizzle ORM
4. **Hotel Simulation** - Fully functional simulation when APIs unavailable

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nestmap

# Amadeus (for real flight bookings)
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 2. Test the Engine

Run the comprehensive test suite:

```bash
npx tsx test-booking-engine.ts
```

### 3. Basic Usage

```typescript
import { bookingEngine, BookingUtils } from './bookingEngine';

// Health check
const health = await bookingEngine.healthCheck();

// Book a hotel (always works - uses simulation if APIs unavailable)
const hotelBooking = await bookingEngine.bookHotel({
  offer: {
    hotelId: 'HOTEL_123',
    roomType: 'Deluxe Room',
    price: { amount: 250, currency: 'USD' }
  },
  checkIn: '2025-08-15',
  checkOut: '2025-08-18',
  guests: [{ firstName: 'John', lastName: 'Doe' }],
  userId: 'user-uuid',
  tripId: 'trip-uuid'
});

// Book a flight (requires Amadeus API credentials)
const flightBooking = await bookingEngine.bookFlight({
  offer: amadeusOffer, // From Amadeus flight search
  passengers: [{
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    passport: {
      number: 'A1234567',
      issuanceCountry: 'US',
      nationality: 'US',
      issuanceDate: '2020-01-01',
      expiryDate: '2030-01-01'
    }
  }],
  paymentMethod: 'stripe',
  userId: 'user-uuid'
});

// Process payment
const payment = await bookingEngine.processPayment({
  amount: 250,
  currency: 'USD',
  bookingId: hotelBooking.id,
  userId: 'user-uuid'
});

// Cancel booking
const cancellation = await bookingEngine.cancelBooking(
  'hotel-booking', 
  hotelBooking.id
);
```

## API Reference

### Core Methods

#### `bookHotel(params)`
Books a hotel room with full database persistence.

```typescript
const result = await bookingEngine.bookHotel({
  offer: {
    hotelId: string,
    roomType: string,
    price: { amount: number, currency: string }
  },
  checkIn: string, // ISO date string
  checkOut: string, // ISO date string
  guests: Array<{ firstName: string, lastName: string }>,
  userId: string, // UUID
  tripId?: string // UUID (optional)
});
```

#### `bookFlight(params)`
Books a flight using Amadeus API (requires API credentials).

```typescript
const result = await bookingEngine.bookFlight({
  offer: any, // Amadeus flight offer object
  passengers: Array<{
    firstName: string,
    lastName: string,
    email: string,
    phone?: string,
    dateOfBirth?: string,
    passport?: {
      number: string,
      issuanceCountry: string,
      nationality: string,
      issuanceDate: string,
      expiryDate: string
    }
  }>,
  paymentMethod: string,
  userId: string,
  tripId?: string
});
```

#### `cancelBooking(providerId, bookingId)`
Cancels a booking with automatic refund calculation.

```typescript
const result = await bookingEngine.cancelBooking(
  'hotel-booking', // or 'amadeus-flights'
  'booking-id-123'
);
```

#### `getBookingStatus(providerId, bookingId)`
Gets current booking status.

```typescript
const status = await bookingEngine.getBookingStatus(
  'hotel-booking',
  'booking-id-123'
);
```

#### `getBookingHistory(userId)`
Retrieves all bookings for a user.

```typescript
const bookings = await bookingEngine.getBookingHistory('user-uuid');
```

#### `processPayment(params)`
Processes payment via Stripe.

```typescript
const payment = await bookingEngine.processPayment({
  amount: 250,
  currency: 'USD',
  bookingId: 'booking-123',
  userId: 'user-uuid',
  description: 'Hotel booking payment'
});
```

### Utility Functions

#### `BookingUtils.validateFlightSearch(params)`
Validates flight search parameters.

#### `BookingUtils.validateHotelSearch(params)`
Validates hotel search parameters.

#### `BookingUtils.calculateBookingFees(basePrice, type)`
Calculates service fees and taxes.

#### `BookingUtils.generateBookingReference(type)`
Generates unique booking references.

#### `BookingUtils.calculateCancellationFee(params)`
Calculates cancellation fees based on timing and type.

## Database Schema

The booking engine uses the following database tables:

### `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  trip_id UUID REFERENCES trips(id),
  type booking_type NOT NULL, -- 'flight', 'hotel', 'activity', etc.
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  location TEXT,
  status booking_status DEFAULT 'pending',
  confirmation_code TEXT,
  confirmed_at TIMESTAMP,
  provider TEXT,
  provider_reference_id TEXT,
  cancellation_reason TEXT,
  price INTEGER, -- in cents
  currency TEXT DEFAULT 'usd',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

The booking engine includes comprehensive error handling:

1. **API Failures**: Graceful fallbacks to simulation mode
2. **Network Issues**: Retry logic with exponential backoff
3. **Validation Errors**: Clear, actionable error messages
4. **Database Errors**: Transaction rollbacks and recovery
5. **Payment Failures**: Automatic refund processing

## Testing

### Run All Tests
```bash
npx tsx test-booking-engine.ts
```

### Test Individual Components
```typescript
// Test health check
const health = await bookingEngine.healthCheck();

// Test providers
const providers = bookingEngine.getAvailableProviders();

// Test validation
const params = BookingUtils.validateHotelSearch({
  cityCode: 'NYC',
  checkIn: '2025-08-15',
  checkOut: '2025-08-18',
  adults: 2
});
```

## Production Deployment

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `AMADEUS_CLIENT_ID` & `AMADEUS_CLIENT_SECRET`: For flight bookings
- `STRIPE_SECRET_KEY`: For payment processing

### Optional Variables
- `BOOKING_COM_API_KEY`: For real hotel bookings
- `STRIPE_WEBHOOK_SECRET`: For payment webhooks
- `LOG_LEVEL`: Logging verbosity

### Health Monitoring
The engine includes a built-in health check endpoint:

```typescript
const health = await bookingEngine.healthCheck();
// Returns status of all providers, payment system, and database
```

## Supported Booking Types

### ✅ Currently Implemented
- **Flights**: Full Amadeus API integration
- **Hotels**: Simulation with full database persistence

### 🔄 Easily Extendable
- **Car Rentals**: Framework ready for provider implementation
- **Activities**: Framework ready for provider implementation
- **Transportation**: Framework ready for provider implementation

## API Keys Setup

### Amadeus (Flight Bookings)
1. Register at [Amadeus for Developers](https://developers.amadeus.com/)
2. Create a new application
3. Get your Client ID and Client Secret
4. Add to environment: `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`

### Stripe (Payments)
1. Register at [Stripe](https://stripe.com/)
2. Get your secret key from the dashboard
3. Add to environment: `STRIPE_SECRET_KEY`

## Support

For issues or questions:
1. Check the test output: `npx tsx test-booking-engine.ts`
2. Review the health check: `bookingEngine.healthCheck()`
3. Check database connectivity and schema
4. Verify API credentials in environment variables

The booking engine is designed to work out of the box with simulation mode, even without API credentials, making development and testing seamless.
