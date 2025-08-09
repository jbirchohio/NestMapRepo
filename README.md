# Remvana - Trip Planning & Template Marketplace

A consumer-focused travel planning application with itinerary builder and shareable templates.

## Features

### Trip Planning
- **Visual Itinerary Builder**: Create day-by-day travel plans with activities
- **Map Integration**: View all activities on an interactive map with Mapbox
- **Collaborative Planning**: Share trips with friends and plan together
- **Activity Management**: Add, edit, and organize activities with drag-and-drop

### Template Marketplace
- **Discover Templates**: Browse pre-made itineraries from experienced travelers
- **Purchase & Customize**: Buy templates and customize them for your dates
- **Creator Economy**: Sell your own travel itineraries as templates
- **Reviews & Ratings**: Community-driven quality assurance

### Booking Integration
- **Affiliate Links**: Book hotels, flights, and activities through partners
- **Price Tracking**: Monitor prices for your planned activities
- **Booking Management**: Keep all confirmations in one place

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, PostgreSQL, Drizzle ORM
- **Authentication**: JWT-based auth with social login support
- **Payments**: Stripe for template purchases and creator payouts
- **Maps**: Mapbox for geocoding and map visualization
- **AI**: OpenAI for trip suggestions and itinerary optimization

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)
- Mapbox account (for maps)

### Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/remvana

# Authentication
JWT_SECRET=your-jwt-secret

# Stripe (for template marketplace)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# External APIs
MAPBOX_TOKEN=pk_...
OPENAI_API_KEY=sk-...

# Optional integrations
VIATOR_API_KEY=...  # Activity search
DUFFEL_API_KEY=...  # Flight search
SENDGRID_API_KEY=... # Email notifications
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Seed sample templates (optional)
npm run seed

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## Key Routes

- `/` - Homepage with featured templates
- `/templates` - Browse template marketplace
- `/itinerary` - Create and edit trips
- `/trip/:id` - View/edit specific trip
- `/map` - Map view of current trip
- `/account` - User profile and settings
- `/creator` - Creator dashboard for template sellers

## Development

### Commands

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run db:push    # Apply database schema
npm run db:studio  # Open database GUI
```

### Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
├── server/          # Express backend
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   └── middleware/  # Express middleware
├── shared/          # Shared types/schemas
└── migrations/      # Database migrations
```

## API Documentation

### Core Endpoints

#### Trips
- `GET /api/trips` - List user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

#### Activities
- `GET /api/activities/trip/:tripId` - List trip activities
- `POST /api/activities` - Add activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Remove activity

#### Templates
- `GET /api/templates` - Browse templates
- `GET /api/templates/:id` - Template details
- `POST /api/templates` - Create template (creators)
- `POST /api/checkout/create-payment-intent` - Purchase template

#### AI Features
- `POST /api/ai/suggest-activities` - Get AI activity suggestions
- `POST /api/ai/optimize-itinerary` - Optimize trip routing
- `POST /api/ai/conversational-assistant` - Chat with AI planner

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- Documentation: [https://docs.remvana.com](https://docs.remvana.com)
- Support Email: support@remvana.com
- GitHub Issues: [Report bugs here](https://github.com/remvana/app/issues)