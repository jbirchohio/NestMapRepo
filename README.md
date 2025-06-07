# NestMap - AI-Powered Corporate Travel Management

Enterprise-grade travel management platform with authentic flight data integration, JWT authentication, and comprehensive white-label capabilities.

## Core Features

- **Authentic Flight Search**: Duffel API integration with real airline inventory
- **JWT Authentication**: Secure token-based authentication system
- **White Label Branding**: Dynamic organization-specific theming
- **Role-Based Access Control**: Enterprise security with granular permissions
- **Real-time Notifications**: Multi-channel notification system
- **Trip Management**: Complete travel planning and collaboration tools

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-only (session-based auth removed)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Flight Data**: Duffel API (authentic airline data only)

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Configure DATABASE_URL and other required variables
```

3. Run database migrations:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `DUFFEL_API_KEY` - Duffel API key for flight data
- `OPENAI_API_KEY` - OpenAI API for AI features

Optional variables:
- `STRIPE_SECRET_KEY` - For payment processing
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Flights
- `POST /api/flights/search` - Search flights (Duffel API)
- `GET /api/flights/offers/:id` - Get flight offer details
- `POST /api/flights/book` - Book flight

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization

## Security Features

- JWT-based authentication with secure token validation
- Role-based access control (RBAC)
- Rate limiting on all endpoints
- SQL injection prevention
- CORS configuration
- Comprehensive audit logging

## Flight Integration

The system uses authentic Duffel API data exclusively:
- Real-time flight search across multiple airlines
- Accurate pricing and availability
- Live booking capabilities
- No fallback or synthetic data

## Development

The system operates with hot reloading and includes:
- TypeScript type checking
- ESLint code quality checks
- Automated database migrations
- Performance monitoring
- Error tracking

## Production Deployment

For production deployment, ensure:
- DATABASE_URL points to production database
- JWT_SECRET is cryptographically secure
- All API keys are properly configured
- SSL/TLS is enabled
- Environment variables are secured

## Support

The system includes comprehensive error handling and logging for troubleshooting production issues.