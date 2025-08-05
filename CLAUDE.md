# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Remvana is a consumer-focused travel planning app with a React frontend and Express.js backend. The architecture follows a simple client-server pattern with automatic case conversion between database (snake_case) and frontend (camelCase).

### Key Architectural Patterns

1. **Case Conversion Middleware**: The backend uses snake_case for database operations while the frontend uses camelCase. The `caseConversionMiddleware` automatically converts between formats:
   - Incoming requests: camelCase → snake_case
   - Outgoing responses: snake_case → camelCase
   - **Common mistake**: Accessing database properties directly without transformation
   - Location: `server/middleware/caseConversionMiddleware.ts`

2. **Authentication**: JWT-based authentication system
   - User type defined in `client/src/lib/jwtAuth.ts`
   - User interface: `{ id, email, username }`
   - JWT middleware: `server/middleware/jwtAuth.ts`

3. **Database Schema**: PostgreSQL with Drizzle ORM
   - All database fields use snake_case (e.g., `start_date`, `end_date`, `trip_id`)
   - Schema definitions: `shared/schema.ts`
   - Transform functions: `transformTripToFrontend`, `transformActivityToFrontend`

4. **Storage Layer Pattern**:
   - Simple storage class provides database operations
   - Single exported `storage` instance used throughout the application
   - Location: `server/storage.ts`

5. **Type System**: 
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
- **Authentication**: JWT (jsonwebtoken)
- **APIs**: Viator (activities), Duffel (flights), OpenAI (AI suggestions)
- **Real-time**: WebSockets (ws library)

## Common TypeScript Error Patterns

1. **TS2551 (Property name mismatch)**: Snake_case vs camelCase issues
   - Backend: Use `trips.start_date`, `activities.trip_id`
   - Frontend: Use `trip.startDate`, `activity.tripId`
   - SQL queries must use snake_case: `eq(trips.start_date, value)`

2. **TS2339 (Property does not exist)**: Wrong property format or missing type
   - Verify snake_case (backend) vs camelCase (frontend)
   - Check if property exists in the type definition

3. **TS7006 (Implicit any)**: Missing type annotations
   - Import types: `import { ClientActivity, ClientTrip } from '@/lib/types'`
   - Type event handlers: `(e: React.ChangeEvent<HTMLInputElement>)`

## Database Query Patterns

```typescript
// Backend - Always use snake_case
const trips = await db.select()
  .from(trips)
  .where(eq(trips.user_id, userId))
  .orderBy(desc(trips.created_at));

// Frontend receives camelCase automatically
// { id, title, userId, createdAt }
```

## API Integration Points

- **Activities**: Viator API integration (`server/services/viatorService.ts`)
- **Flights**: Duffel API (`server/services/duffelFlightService.ts`)
- **AI**: OpenAI API (`server/openai.ts`)

## Design System

### Color Palette
- **Primary**: Purple to pink gradient (`from-purple-600 to-pink-600`)
- **Backgrounds**: Light gradients (`from-purple-50 via-white to-pink-50`)
- **Text**: Simple grays with high contrast

### UI Principles
- **5th grade reading level**: Simple, conversational language
- **Minimal cognitive load**: One main action per screen
- **Visual hierarchy**: Clear progression through gradient intensities
- **Delightful interactions**: Smooth animations with Framer Motion

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret  
- `CORS_ORIGIN` - Frontend URL for CORS

Optional:
- `DUFFEL_API_KEY` - Flight search
- `OPENAI_API_KEY` - AI features
- `VIATOR_API_KEY` - Activity search
- `SENDGRID_API_KEY` - Email service (if needed)

## Critical File Locations

### Core Architecture
- Database schema: `shared/schema.ts`
- Storage layer: `server/storage.ts`
- Main server: `server/index.ts`
- Route registration: `server/routes/index.ts`

### Authentication
- JWT auth: `server/middleware/jwtAuth.ts`
- Case conversion: `server/middleware/caseConversionMiddleware.ts`
- Auth context: `client/src/contexts/JWTAuthContext.tsx`

### Frontend
- Types: `client/src/lib/types.ts`
- Components: `client/src/components/`
- Pages: `client/src/pages/`

### Key Consumer Components
- Trip creation: `client/src/components/NewTripModalConsumer.tsx`
- Activity search: `client/src/components/ActivityModalConsumer.tsx`
- Bookable activities: `client/src/components/BookableActivity.tsx`
- Navigation: `client/src/components/MainNavigationConsumer.tsx`

## Important Development Notes

- **Never** mix snake_case and camelCase in the same file context
- Frontend components should **never** directly import from `@shared/schema`
- Backend routes receive snake_case from middleware automatically
- When fixing TypeScript errors, first identify if you're in client/ or server/
- Transform functions are only needed when bypassing the middleware (rare)
- Use the storage layer (`storage` export) rather than direct database calls

## Testing

Currently no automated tests - contributions welcome! Focus areas:
- Authentication flow
- Trip CRUD operations
- Activity search and booking
- Case conversion middleware