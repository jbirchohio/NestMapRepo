# NestleIn AI Agent Guide

## Application Overview

NestleIn (NestMap) is a B2B SaaS application for travel planning and itinerary generation using AI. The platform enables travel agents and businesses to create, manage, and optimize travel itineraries for their clients with the help of AI-powered recommendations and integrations with external services.

## Architecture Overview

### Technology Stack
- **Frontend**: React (Vite), Tailwind CSS, React Router, React Query
- **Backend**: Express.js (Node.js), TypeScript, NestJS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT, Supabase Auth
- **State Management**: React Context, React Query
- **Real-time**: WebSockets
- **Payment Processing**: Stripe
- **AI Integration**: OpenAI GPT-4o

### Project Structure

```
NestMapRepo/
├── client/                  # Frontend React application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts for state management
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service integrations
│   │   ├── styles/          # Global styles and Tailwind config
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── vite.config.js
│
├── server/                  # Backend Express/NestJS application
│   ├── src/
│   │   ├── auth/            # Authentication modules
│   │   ├── ai/              # AI service integrations
│   │   ├── bookings/        # Booking management
│   │   ├── calendar/        # Calendar integration
│   │   ├── db/              # Database configuration and models
│   │   ├── organizations/   # Organization management
│   │   ├── payments/        # Payment processing
│   │   ├── trips/           # Trip and itinerary management
│   │   ├── users/           # User management
│   │   └── main.ts          # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
└── shared/                  # Shared code between client and server
    ├── types/               # TypeScript type definitions
    ├── constants/           # Shared constants
    └── utils/               # Shared utility functions
```

## Core Features and Endpoints

### Authentication System

**Key Files:**
- `server/src/auth/services/auth.service.ts` - Main authentication service
- `server/src/auth/interfaces/user.interface.ts` - User interface definitions
- `client/src/services/api/userService.ts` - Frontend authentication service

**Endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user information

### AI Services

**Key Files:**
- `server/src/ai/services/ai.service.ts` - Main AI service
- `server/src/ai/controllers/ai.controller.ts` - AI endpoints

**Endpoints:**
- `/api/ai/optimize-itinerary` - Optimize existing itineraries
- `/api/ai/suggest-activities` - Get activity recommendations
- `/api/ai/suggest-food` - Get restaurant recommendations
- `/api/ai/summarize-day` - Generate daily summaries
- `/api/ai/translate-content` - Translate itinerary content

### Trip Management

**Key Files:**
- `server/src/trips/services/trips.service.ts` - Trip management service
- `server/src/trips/controllers/trips.controller.ts` - Trip endpoints

**Endpoints:**
- `GET /api/trips` - List all trips
- `POST /api/trips` - Create a new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### External API Integrations

#### Google Maps/Places API
- Used for location data, maps rendering, and place information
- Integration files in `server/src/integrations/google`

#### Duffel API
- Used for flight and hotel booking
- Integration files in `server/src/integrations/duffel`

#### OpenAI API
- Used for AI-powered recommendations and content generation
- Integration files in `server/src/ai/services`

#### Stripe API
- Used for payment processing and subscription management
- Integration files in `server/src/payments`

## Database Schema

Key tables and relationships:
- `users` - User accounts
- `organizations` - Business organizations
- `trips` - Travel itineraries
- `activities` - Trip activities
- `bookings` - Flight and hotel bookings
- `subscriptions` - Organization subscription plans

## Common Issues and Troubleshooting

### Authentication Issues

**Problem**: JWT token validation failures
**Solution**: Check token expiration and refresh logic in `auth.service.ts`

**Problem**: User session persistence issues
**Solution**: Verify localStorage/sessionStorage handling in `client/src/contexts/AuthContext.tsx`

### API Integration Issues

**Problem**: External API rate limiting
**Solution**: Implement proper request throttling and caching in API service files

**Problem**: API key management
**Solution**: Check environment variables and secure storage in `.env` files

### Performance Issues

**Problem**: Slow itinerary loading
**Solution**: Optimize database queries in trip service, implement pagination

**Problem**: Frontend rendering performance
**Solution**: Check React component re-rendering, implement memoization and virtualization for large lists

## Development Workflow

### Adding New Features

1. Create feature branch from `main`
2. Implement backend endpoints in appropriate module
3. Create corresponding frontend services and components
4. Write tests for new functionality
5. Submit PR for review

### Debugging Tips

- Use server logs in `server/logs` directory
- Check browser console for frontend errors
- Verify network requests in browser developer tools
- Use TypeScript type checking to catch errors early

## Deployment

- Frontend deployed to Vercel
- Backend deployed to Railway
- Database hosted on managed PostgreSQL provider
- CI/CD via GitHub Actions

## Security Considerations

- JWT tokens should be stored securely
- API keys should never be exposed in frontend code
- Input validation should be performed on all endpoints
- Rate limiting should be implemented for public endpoints

## AI Agent Tasks

As an AI agent, you may be asked to:

1. Debug authentication flows
2. Optimize AI recommendation algorithms
3. Improve database queries and schema
4. Enhance external API integrations
5. Fix UI/UX issues in the React frontend
6. Implement new features across the stack
7. Optimize performance bottlenecks

When working on these tasks, always consider:
- The B2B SaaS nature of the application
- Integration with external travel APIs
- Security of user and organization data
- Performance implications of changes
- TypeScript type safety across the codebase

## Recommended Approach for Code Changes

1. Understand the issue or feature request thoroughly
2. Locate relevant files using codebase search
3. Review existing implementation patterns
4. Make minimal, focused changes that follow existing patterns
5. Ensure type safety with TypeScript
6. Test changes thoroughly before submitting
7. Document any API changes or new dependencies
