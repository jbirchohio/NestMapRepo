# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Remvana is a consumer-focused travel planning app with AI-powered features, real-time collaboration, and a template marketplace. The architecture follows a client-server pattern with automatic case conversion between database (snake_case) and frontend (camelCase).

### Critical Architectural Patterns

1. **Case Conversion Middleware**: Automatic bidirectional transformation between formats
   - Incoming requests: camelCase → snake_case
   - Outgoing responses: snake_case → camelCase
   - **Common mistake**: Accessing database properties directly without transformation
   - Location: `server/middleware/caseConversionMiddleware.ts`

2. **Storage Layer Pattern**: Single storage instance for all database operations
   - Consumer-focused design with enterprise schema compatibility
   - Singleton pattern: `storage` export from `server/storage.ts`
   - Never use direct database queries - always use storage layer

3. **AI Services Architecture**:
   - **Cache Service**: In-memory LRU cache (`server/services/aiCacheService.ts`)
     - Railway-optimized for 512MB memory limit
     - TTL-based expiration (3-7 days)
     - Only `/find-location` endpoint currently uses cache
   - **OpenAI Client**: Cost-optimized with GPT-3.5-turbo (`server/services/openaiClient.ts`)
   - **Note**: Model inconsistency - routes use GPT-4o, client uses GPT-3.5

4. **Type System Separation**:
   - Frontend types (camelCase): `client/src/lib/types.ts`
   - Backend uses database types: `@shared/schema`
   - Key types: `ClientTrip`, `ClientActivity`, `ClientUser`
   - **Never** mix snake_case and camelCase in same interface

5. **WebSocket Real-time Collaboration**: Room-based trip collaboration
   - JWT authentication required
   - Trip-based room management
   - Global service for broadcasting: `server/websocket.ts`

## Essential Commands

```bash
# Development
npm run dev                    # Start development server (http://localhost:5000)

# Database
npm run db:push               # Apply database schema changes
npm run db:studio             # Open Drizzle Studio for database management
npm run seed                  # Seed template data

# Type Checking & Validation
npm run check                 # Run TypeScript type checking
cd client && npx tsc --noEmit # Check client TypeScript errors
cd server && npx tsc --noEmit # Check server TypeScript errors

# Building & Production
npm run build                 # Build for production (Vite + esbuild)
npm start                     # Run production server
```

## Common TypeScript Error Patterns

1. **TS2551 (Property name mismatch)**: Snake_case vs camelCase issues
   - Backend/SQL: `trips.start_date`, `activities.trip_id`
   - Frontend: `trip.startDate`, `activity.tripId`

2. **TS2339 (Property does not exist)**: Wrong property format
   - Verify snake_case (backend) vs camelCase (frontend)
   - Check type definitions match usage context

3. **TS7006 (Implicit any)**: Missing type annotations
   - Import types: `import { ClientActivity } from '@/lib/types'`
   - Type event handlers: `(e: React.ChangeEvent<HTMLInputElement>)`

## Database Query Patterns

```typescript
// Backend - Always use snake_case with storage layer
const trips = await storage.getTripsForUser(userId);

// SQL queries must use snake_case
.where(eq(trips.user_id, userId))
.orderBy(desc(trips.created_at))

// Frontend automatically receives camelCase
// { id, title, userId, createdAt }
```

## API Endpoints Overview

### AI Routes (`/api/ai/*`)
- `/summarize-day` - Day activity summaries
- `/suggest-food` - Restaurant recommendations
- `/optimize-itinerary` - Route optimization
- `/find-location` - Location search (cached)
- `/conversational-assistant` - Chat interface with itinerary parsing

### Core Routes
- `/api/auth/*` - JWT authentication
- `/api/trips/*` - Trip CRUD operations
- `/api/activities/*` - Activity management
- `/api/templates/*` - Template marketplace
- `/api/creator/*` - Creator dashboard

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5000)

Optional API Keys:
- `OPENAI_API_KEY` - AI features
- `VIATOR_API_KEY` - Activity search
- `DUFFEL_API_KEY` - Flight search
- `STRIPE_SECRET_KEY` - Payments
- `SENDGRID_API_KEY` - Email service

## Critical File Locations

### Core Architecture
- Database schema: `shared/schema.ts`
- Storage layer: `server/storage.ts`
- Main server: `server/index.ts`
- Route registration: `server/routes/index.ts`

### AI & Services
- AI routes: `server/routes/ai.ts`
- AI cache: `server/services/aiCacheService.ts`
- OpenAI client: `server/services/openaiClient.ts`
- OpenAI functions: `server/openai.ts`

### Middleware
- JWT auth: `server/middleware/jwtAuth.ts`
- Case conversion: `server/middleware/caseConversionMiddleware.ts`

### WebSocket
- WebSocket server: `server/websocket.ts`
- Real-time collaboration logic

## Important Development Notes

- **Case Consistency**: Never mix snake_case and camelCase in same file context
- **Frontend Imports**: Never import `@shared/schema` directly in frontend
- **Storage Layer**: Always use `storage` export, not direct database calls
- **Transform Functions**: Only needed when bypassing middleware (rare)
- **AI Model**: Check model consistency between services and routes
- **Memory Limits**: Railway has 512MB limit - cache service is optimized for this
- **WebSocket Rooms**: Based on trip IDs for collaboration

## Revenue Model

**IMPORTANT**: Remvana generates revenue exclusively through:
1. **Template Marketplace**: Users purchase trip/budget templates created by creators and admins
   - Platform takes 30% commission on template sales
   - Creators receive 70% of template sales
   - Templates range from $10-100+ depending on complexity and duration
2. **Viator Commissions**: Affiliate commissions from activity bookings through Viator integration
   - Standard 8% commission on bookings
   - Cookie duration: 30 days

**Note**: There are NO subscription fees, premium features, or paid add-ons. All app features (budget tracking, AI planning, collaboration) are free to use. Revenue comes solely from template sales and activity booking commissions.

## Known Issues & TODOs

1. **AI Model Inconsistency**: OpenAI client uses GPT-3.5 but routes use GPT-4o
2. **Cache Underutilization**: Only 1 of 11 AI endpoints uses caching
3. **Enterprise Patterns**: WebSocket and some auth patterns could be simplified for consumer use
4. **Testing**: No automated tests currently exist