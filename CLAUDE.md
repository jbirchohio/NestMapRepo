# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Remvana is an enterprise-grade B2B SaaS travel management platform with comprehensive administrative tools. It features a React frontend and Express.js backend with multi-tenant architecture, white-label capabilities, and an extensive superadmin dashboard. The architecture follows a clear separation between client and server with automatic case conversion between database (snake_case) and frontend (camelCase).

### Key Architectural Patterns

1. **Case Conversion Middleware**: The backend uses snake_case for database operations while the frontend uses camelCase. The `caseConversionMiddleware` automatically converts between formats:
   - Incoming requests: camelCase → snake_case
   - Outgoing responses: snake_case → camelCase
   - **Common mistake**: Accessing database properties directly without transformation
   - Location: `server/middleware/caseConversionMiddleware.ts`

2. **Authentication**: JWT-only authentication system (session-based auth has been removed)
   - User type defined in `client/src/lib/jwtAuth.ts`
   - No `user_metadata` property - use direct user properties instead
   - User interface: `{ id, email, username, role, organizationId }`
   - JWT middleware: `server/middleware/jwtAuth.ts`

3. **Database Schema**: PostgreSQL with Drizzle ORM
   - All database fields use snake_case (e.g., `start_date`, `end_date`, `trip_id`)
   - Schema definitions: `shared/schema.ts`
   - Transform functions: `transformTripToFrontend`, `transformActivityToFrontend`

4. **Multi-Tenant Organization System**:
   - Organizations table with white-label branding support
   - Organization context injection via `injectOrganizationContext` middleware
   - Domain-based organization resolution
   - Stripe Connect integration for corporate card issuing
   - Role-based access control within organizations

5. **Storage Layer Pattern**:
   - Abstract `IStorage` interface in `server/storage.ts`
   - `DatabaseStorage` class provides core database operations
   - `ExtendedDatabaseStorage` adds enterprise features (corporate cards, analytics, superadmin)
   - Single exported `storage` instance used throughout the application

6. **Type System**: 
   - Frontend types use camelCase: `client/src/lib/types.ts`
   - Backend uses database types from `@shared/schema`
   - Key frontend types: `ClientTrip`, `ClientActivity`, `ClientUser`
   - Never mix snake_case and camelCase in the same interface

## Essential Commands

```bash
# Development
npm run dev                    # Start development server (http://localhost:5000)

# Database
npm run db:push               # Apply database schema changes

# Demo Mode
npm run seed:demo             # Seed demo data for testing
# Set ENABLE_DEMO_MODE=true in .env to enable demo mode

# Type Checking
npm run check                 # Run TypeScript type checking
cd client && npx tsc --noEmit # Check client TypeScript errors
cd server && npx tsc --noEmit # Check server TypeScript errors

# Building
npm run build                 # Build for production (Vite + esbuild)

# Production
npm start                     # Run production server
```

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-only (jsonwebtoken)
- **Payments**: Stripe + Stripe Connect for corporate cards
- **Flight Data**: Duffel API (authentic airline data only)
- **AI Features**: OpenAI API
- **Email**: SendGrid
- **Real-time**: WebSockets (ws library)
- **Monitoring**: Custom performance monitoring and error tracking

## Common TypeScript Error Patterns

1. **TS2551 (Property name mismatch)**: Snake_case vs camelCase issues
   - Backend: Use `trips.start_date`, `activities.trip_id`, `users.organization_id`
   - Frontend: Use `trip.startDate`, `activity.tripId`, `user.organizationId`
   - SQL queries must use snake_case: `eq(trips.start_date, value)`

2. **TS2339 (Property does not exist)**: Wrong property format or missing type
   - Verify snake_case (backend) vs camelCase (frontend)
   - User has `organizationId` not `organization_id` on frontend
   - Check if property exists in the type definition

3. **TS7006 (Implicit any)**: Missing type annotations
   - Import types: `import { ClientActivity, ClientTrip } from '@/lib/types'`
   - Type event handlers: `(e: React.ChangeEvent<HTMLInputElement>)`
   - Avoid `Record<string, any>` - use `Record<string, unknown>` or specific types

4. **TS2304 (Cannot find name)**: Missing imports or undefined variables
   - Check imports are correct
   - Verify the component/function is exported

## Database Query Patterns

```typescript
// Backend - Always use snake_case
const trips = await db.select()
  .from(trips)
  .where(eq(trips.organization_id, orgId))
  .orderBy(desc(trips.created_at));

// Frontend receives camelCase automatically
// { id, title, organizationId, createdAt }
```

## Multi-Tenant Organization System

### Organization Context
- Middleware automatically injects organization context: `req.organizationContext`
- Domain-based organization resolution for white-label support
- All database queries must respect organization boundaries
- Use `setOrganizationId()` and `logOrganizationAccess()` from `organizationContext.ts`

### Corporate Card System
- Stripe Connect accounts per organization
- Card issuing through Stripe Issuing API
- Expense tracking and approval workflows
- Real-time transaction monitoring via webhooks

## API Integration Points

- **Flight Data**: Duffel API integration (`server/services/duffelFlightService.ts`)
- **Payments**: Stripe (`server/stripe.ts`) - API version: "2024-11-20.acacia"
- **AI Features**: OpenAI API (`server/openai.ts`)
- **Email**: SendGrid (`server/emailService.ts`)
- **WebSockets**: Real-time collaboration (`server/websocket.ts`)
- **SSL Management**: Let's Encrypt ACME integration (`server/sslManager.ts`)
- **Booking Engine**: Amadeus flight booking (`server/bookingEngine.ts`)

## Security Architecture

### Authentication Flow
1. JWT tokens generated on login
2. `jwtAuthMiddleware` validates tokens on protected routes
3. User context attached to `req.user`
4. Organization context resolved from domain or user association

### Rate Limiting
- Tiered rate limiting based on user role and endpoint sensitivity
- Organization-specific limits for enterprise features
- Comprehensive rate limiting in `server/middleware/comprehensive-rate-limiting.ts`

### Content Security Policy
- Strict CSP in production with nonce-based script execution
- Development CSP compatible with Vite HMR

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret  
- `SESSION_SECRET` - Express session secret
- `DUFFEL_API_KEY` - Flight data API
- `OPENAI_API_KEY` - AI features

Optional:
- `STRIPE_SECRET_KEY` - Payment processing
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key
- `SENDGRID_API_KEY` - Email service
- `BOOKING_COM_API_KEY` / `BOOKING_COM_API_SECRET` - Hotel booking API
- `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` - Flight booking API

## Critical File Locations

### Core Architecture
- Database schema: `shared/schema.ts`
- Storage layer: `server/storage.ts` (IStorage interface, DatabaseStorage, ExtendedDatabaseStorage)
- Main server: `server/index.ts`
- Route registration: `server/routes/index.ts`

### Authentication & Security
- JWT auth: `server/middleware/jwtAuth.ts`
- Case conversion: `server/middleware/caseConversionMiddleware.ts`
- Organization context: `server/organizationContext.ts`
- Security middleware: `server/middleware/security.ts`

### Frontend
- Types: `client/src/lib/types.ts`
- Auth context: `client/src/contexts/JWTAuthContext.tsx`
- Components: `client/src/components/`

### Enterprise Features
- Corporate cards: `server/routes/corporateCards.ts`
- Organization funding: `server/services/organizationFundingService.ts`
- Superadmin: `server/routes/superadmin.ts`
- Analytics: `server/analytics.ts`

### Superadmin Dashboard
- Main component: `client/src/pages/SuperadminClean.tsx`
- Navigation: `client/src/components/SuperadminNavigation.tsx`
- Features include:
  - Revenue & billing tracking (MRR, churn, LTV)
  - System health monitoring
  - User & organization management
  - Feature flags with A/B testing
  - Pricing management with Stripe sync
  - Customer support tools
  - DevOps deployment management
  - White-label configuration
  - Communications hub
  - Comprehensive audit trail

## WebSocket Protocol

WebSocket messages use snake_case for consistency with backend:
```typescript
interface WebSocketMessage {
  type: 'join_trip' | 'leave_trip' | 'trip_update';
  trip_id?: number;
  data?: any;
}
```

## Error Tracking

- TypeScript errors tracked in `errors.txt` - mark files as RESOLVED when fixed
- Global error handler: `server/middleware/globalErrorHandler.ts`
- Performance monitoring: `server/middleware/performance.ts`

## Important Development Notes

- **Never** mix snake_case and camelCase in the same file context
- Frontend components should **never** directly import from `@shared/schema`
- Backend routes receive snake_case from middleware automatically
- When fixing TypeScript errors, first identify if you're in client/ or server/
- Transform functions are only needed when bypassing the middleware (rare)
- All database operations must respect organization boundaries for multi-tenancy
- Use the storage layer (`storage` export) rather than direct database calls
- Test enterprise features with proper organization context