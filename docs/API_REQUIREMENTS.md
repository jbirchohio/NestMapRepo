# API Requirements for Remvana

This document lists all the external APIs required for Remvana to function with its enterprise features. All listed APIs are easily obtainable without waiting lists or complex approval processes.

## ✅ Available APIs (Easy to Obtain)

### 1. **OpenAI API** 
- **Purpose**: AI-powered booking recommendations, expense categorization, travel insights
- **How to get**: Sign up at https://platform.openai.com
- **Cost**: Pay-as-you-go, $5 free credits for new users
- **Environment Variables**:
  ```
  OPENAI_API_KEY=your-api-key
  ```

### 2. **SendGrid API**
- **Purpose**: Email notifications, booking confirmations, alerts
- **How to get**: Sign up at https://sendgrid.com
- **Cost**: Free tier available (100 emails/day)
- **Environment Variables**:
  ```
  SENDGRID_API_KEY=your-api-key
  ```

### 3. **Stripe API**
- **Purpose**: Payment processing, subscription management, corporate cards
- **How to get**: Sign up at https://stripe.com
- **Cost**: Pay per transaction
- **Environment Variables**:
  ```
  STRIPE_SECRET_KEY=your-secret-key
  VITE_STRIPE_PUBLIC_KEY=your-public-key
  ```

### 4. **Duffel API**
- **Purpose**: Real flight data, airline bookings
- **How to get**: Sign up at https://duffel.com
- **Cost**: Free sandbox, commission-based for production
- **Environment Variables**:
  ```
  DUFFEL_API_KEY=your-api-key
  ```

### 5. **Google APIs**
- **Purpose**: Maps, geocoding, calendar integration, OAuth
- **How to get**: https://console.cloud.google.com
- **Cost**: Free tier available
- **Environment Variables**:
  ```
  GOOGLE_MAPS_API_KEY=your-api-key
  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  ```

### 6. **Microsoft 365 APIs**
- **Purpose**: Outlook calendar integration, email
- **How to get**: Register app at https://portal.azure.com
- **Cost**: Free with user consent
- **Environment Variables**:
  ```
  MICROSOFT_CLIENT_ID=your-client-id
  MICROSOFT_CLIENT_SECRET=your-client-secret
  ```

### 7. **Mapbox API** (Alternative to Google Maps)
- **Purpose**: Maps, geocoding
- **How to get**: Sign up at https://mapbox.com
- **Cost**: Free tier available
- **Environment Variables**:
  ```
  VITE_MAPBOX_TOKEN=your-token
  ```

### 8. **OpenWeatherMap API** (Optional)
- **Purpose**: Weather alerts for travelers
- **How to get**: Sign up at https://openweathermap.org
- **Cost**: Free tier available
- **Environment Variables**:
  ```
  OPENWEATHER_API_KEY=your-api-key
  ```

## ❌ APIs Removed (Not Easily Available)

The following features were removed because their APIs require business partnerships or are not publicly available:

1. **Uber/Lyft Integration** - Requires OAuth user consent, not suitable for server-side booking
2. **Direct Car Rental APIs** (Hertz, Enterprise, Avis) - Require business partnerships
3. **Travel Risk Assessment APIs** - No reliable free public APIs found
4. **Ground Transportation Booking** - Most require business agreements

## 🔧 Configuration

### Required Environment Variables
```env
# Core Database
DATABASE_URL=postgresql://user:password@localhost:5432/remvana

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# Essential APIs
OPENAI_API_KEY=your-openai-key
SENDGRID_API_KEY=your-sendgrid-key
STRIPE_SECRET_KEY=your-stripe-secret
VITE_STRIPE_PUBLIC_KEY=your-stripe-public
DUFFEL_API_KEY=your-duffel-key

# Optional APIs
GOOGLE_MAPS_API_KEY=your-google-maps-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
VITE_MAPBOX_TOKEN=your-mapbox-token
OPENWEATHER_API_KEY=your-weather-key

# Configurable Values
IRS_MILEAGE_RATE=0.655
LOCAL_EMERGENCY_NUMBER=911
COMPANY_EMERGENCY_NUMBER=+1-800-555-1234
EMBASSY_EMERGENCY_NUMBER=+1-202-555-1234
```

## 📊 Feature Impact

With the available APIs, Remvana still provides:

### ✅ Fully Functional Features:
- **AI-Powered Recommendations**: OpenAI integration for smart booking suggestions
- **Travel Policy Compliance**: Built-in engine with customizable rules
- **Advanced Expense Management**: OCR with Tesseract.js + OpenAI
- **Flight Booking**: Real airline data via Duffel
- **Email Notifications**: SendGrid integration
- **Payment Processing**: Stripe for subscriptions and corporate cards
- **Calendar Integration**: Google/Microsoft 365 sync
- **Mobile Features**: Offline mode, quick capture, location services
- **Analytics Dashboard**: Built-in reporting and forecasting
- **Team Collaboration**: Comments, shared calendars, expense splitting

### ❌ Features Requiring Alternative Solutions:
- **Ground Transportation**: Users must book taxis/rides directly
- **Car Rentals**: Link to rental websites instead of direct integration
- **Travel Risk Alerts**: Basic country information only
- **Real-time Travel Advisories**: Manual updates required

## 🚀 Getting Started

1. Sign up for the required API services listed above
2. Copy `.env.example` to `.env`
3. Add your API keys to the `.env` file
4. Run `npm install` and `npm run dev`

The application will gracefully handle missing optional APIs and provide appropriate error messages for required ones.