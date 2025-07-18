# NestMap - AI-Powered Corporate Travel Management

Enterprise-grade travel management platform with authentic flight data integration, JWT authentication, and comprehensive white-label capabilities.

## Core Features

- **Authentic Flight Search**: Duffel API integration with real airline inventory
- **JWT Authentication**: Secure token-based authentication system
- **White Label Branding**: Dynamic organization-specific theming
- **Role-Based Access Control**: Enterprise security with granular permissions
- **Real-time Notifications**: Multi-channel notification system
- **Trip Management**: Complete travel planning and collaboration tools

## 🏢 Enterprise Features

### AI-Powered Intelligence
- **Advanced Trip Optimization**: AI-driven route optimization and cost analysis
- **Predictive Analytics**: Flight price forecasting and demand analysis
- **Smart Budget Management**: Dynamic allocation and spend prediction
- **Contextual AI Assistant**: Weather-based adjustments and proactive management

### Security & Compliance
- **Multi-Factor Authentication**: TOTP, SMS, and backup codes
- **Corporate Policy Engine**: Automated compliance checking and violation prevention
- **GDPR/CCPA Compliance**: Data subject rights and privacy management
- **Advanced Audit Logging**: Comprehensive security and compliance tracking

### Enterprise Integrations
- **Expense Systems**: Concur, Expensify integration with sync and export
- **Communication Platforms**: Slack, Microsoft Teams, Discord notifications
- **Calendar Synchronization**: Google, Outlook, Exchange multi-provider sync
- **HR/Finance Systems**: Employee directory and payroll connectivity

### Global Scalability
- **Multi-Language Support**: 12 languages with 95% translation coverage
- **Currency Management**: 25+ currencies with real-time exchange rates
- **Regional Compliance**: Localized tax calculation and regulatory compliance
- **Cultural Adaptation**: Regional preferences and time zone management

### Advanced Workflows
- **Approval Automation**: Multi-level approval chains with delegation
- **Policy Compliance**: Real-time checking with automated exception handling
- **Workflow Templates**: Customizable approval processes for different scenarios
- **Notification System**: Multi-channel alerts and status updates

> 📖 **Complete Documentation**: See [ENTERPRISE_FEATURES.md](./ENTERPRISE_FEATURES.md) for detailed implementation guide

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
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Configure DATABASE_URL and other required variables
```

3. Run database migrations:
```bash
pnpm run db:push
```

4. Start the development server:
```bash
# Start backend server
cd server && pnpm dev

# Start frontend (in another terminal)
cd client && pnpm dev
```

The backend will be available at `http://localhost:3000`
The frontend will be available at `http://localhost:5173`

## Environment Variables

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_ACCESS_EXPIRES_IN` - JWT access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - JWT refresh token expiration (default: 7d)
- `DUFFEL_API_KEY` - Duffel API key for flight data
- `OPENAI_API_KEY` - OpenAI API for AI features

Optional variables:
- `STRIPE_SECRET_KEY` - For payment processing
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user (protected)

### Flights
- `POST /api/flights/search` - Search flights (Duffel API)
- `GET /api/flights/offers/:id` - Get flight offer details
- `POST /api/flights/book` - Book flight
- `GET /api/flights/airports/search` - Search airports

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `GET /api/organizations/:id` - Get organization details
- `GET /api/organizations/:id/members` - Get organization members

### White Label Branding
- `GET /api/branding/theme` - Get organization theme
- `PUT /api/branding/theme` - Update organization theme
- `GET /api/branding/css` - Get organization CSS
- `GET /api/branding/assets` - Get branding assets
- `POST /api/branding/preview` - Preview theme changes

### Trips
- `GET /api/trips` - List trips
- `POST /api/trips` - Create trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Health Check
- `GET /health` - Server health status

## Security Features

- **JWT-only Authentication**: Secure token-based authentication (no sessions)
- **Role-based Access Control**: Enterprise security with granular permissions
- **Comprehensive Rate Limiting**: Multi-layer protection (global, auth, API-specific)
- **Input Validation & Sanitization**: Prevents XSS and injection attacks
- **SQL Injection Prevention**: Middleware to detect and block malicious queries
- **Security Headers**: Helmet.js with CSP, HSTS, and XSS protection
- **Organization Security**: Enforces tenant isolation
- **CORS Configuration**: Proper origin validation and security headers
- **Comprehensive Audit Logging**: Tracks all user actions and system events
- **Request Size Validation**: Prevents oversized payloads
- **File Upload Validation**: Type and size checks for uploads

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