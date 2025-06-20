# NestMap - AI-Powered Corporate Travel Management Platform

## Overview

NestMap is a comprehensive, enterprise-grade travel management platform built for multi-tenant organizations. The platform combines authentic flight search capabilities, AI-powered itinerary generation, and white-label customization options. It follows a modern, service-oriented architecture with JWT-based authentication and comprehensive role-based access control.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for authentication and organization state
- **Mobile Support**: Capacitor integration for native mobile apps
- **Theme System**: Electric violet and navy color scheme with white-label capabilities

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with strict mode enabled
- **Authentication**: JWT-only implementation (session-based auth removed)
- **API Design**: RESTful APIs with consistent error handling and response formats
- **File Structure**: Domain-driven organization with shared schema definitions

### Data Storage
- **Primary Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Centralized schema definitions in `/shared` workspace
- **Migrations**: Drizzle Kit for database schema migrations

## Key Components

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication system
- **Role-Based Access Control**: Five-tier role system (super_admin, admin, manager, member, guest)
- **Multi-tenant Security**: Organization-scoped data access and permissions
- **Middleware Stack**: Comprehensive security middleware including rate limiting, CORS, and audit logging

### Flight & Travel Integration
- **Duffel API**: Primary flight search integration with authentic airline data
- **Amadeus API**: Secondary travel data provider for hotels and activities
- **Real-time Data**: Live flight pricing and availability
- **Booking Management**: Complete booking lifecycle with provider integration

### AI-Powered Features
- **OpenAI Integration**: GPT-4 powered itinerary generation and location search
- **Smart Recommendations**: Context-aware activity and destination suggestions
- **Natural Language Processing**: Fuzzy location search and intelligent parsing

### White-Label System
- **Dynamic Branding**: Organization-specific theming and logos
- **Custom Domains**: Support for custom domain mapping with SSL
- **Configurable Features**: Per-organization feature toggles and limits

### Subscription Management
- **Stripe Integration**: Billing and payment processing
- **Tiered Plans**: Five subscription tiers with usage-based limits
- **Usage Tracking**: Real-time monitoring of trip limits and feature access
- **Upgrade Flows**: Seamless plan upgrades with prorated billing

## Data Flow

### Trip Creation Workflow
1. User creates trip through React frontend
2. JWT middleware validates authentication
3. Organization context middleware applies data scoping
4. Subscription limits middleware checks trip quotas
5. Trip data transformed from camelCase to snake_case
6. Database insertion via Drizzle ORM
7. Real-time notifications sent to collaborators

### Flight Search Process
1. Frontend sends search parameters to Express API
2. Backend validates and enriches search data
3. Duffel API called for real-time flight data
4. Results processed and cached for performance
5. Transformed data returned to frontend
6. User can proceed to booking or save for later

### AI Itinerary Generation
1. User provides destination and preferences
2. OpenAI API generates structured itinerary data
3. Location data enriched via Mapbox geocoding
4. Activities validated against available providers
5. Complete itinerary returned with booking options

## External Dependencies

### Core Services
- **Supabase**: Primary database and authentication provider
- **OpenAI**: AI-powered features and natural language processing
- **Mapbox**: Maps, geocoding, and location services
- **Stripe**: Payment processing and subscription management

### Travel Data Providers
- **Duffel**: Primary flight search and booking
- **Amadeus**: Secondary travel data and hotel search
- **Weather APIs**: Destination weather information

### Infrastructure
- **Replit**: Development environment and hosting
- **Vercel/Railway**: Production deployment options
- **Redis**: Session storage and caching (optional)

## Deployment Strategy

### Development Environment
- **Replit Integration**: Full development environment with live preview
- **Hot Reloading**: Vite for frontend, tsx for backend development
- **Environment Management**: Comprehensive .env configuration

### Production Deployment
- **Multi-platform Support**: Vercel, Railway, and Render configurations
- **Build Process**: Optimized builds for both frontend and backend
- **Health Monitoring**: Comprehensive health check endpoints
- **Error Tracking**: Structured logging and error reporting

### Mobile Deployment
- **Capacitor**: Native iOS and Android app generation
- **App Store Ready**: Production-ready mobile builds
- **Offline Support**: Progressive Web App capabilities

## Changelog

- June 20, 2025. Initial setup
- June 20, 2025. Resolved TypeScript compilation errors in backend monorepo system
- June 20, 2025. Implemented SecureAuth as the single source of truth for JWT authentication
- June 20, 2025. Created authentication interfaces and repositories aligned with SecureAuth middleware
- June 20, 2025. Fixed server configuration to use SecureAuth for all JWT token validation and user authentication

## User Preferences

Preferred communication style: Simple, everyday language.