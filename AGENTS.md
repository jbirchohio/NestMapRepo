# NestMap - AI Assistant Guidelines

This document provides context and guidelines for AI assistants working with the NestMap codebase.

## Project Overview
- **Type**: B2B SaaS for Travel Planning & Itinerary Generation
- **Stack**: TypeScript, Node.js, React
- **Multi-tenant**: Yes, with strict JWT-based org/tenant isolation

## Code Style
- **Frontend** (`/client`): camelCase
- **Backend** (`/server`): snake_case
- **TypeScript**: Strict mode enabled
- **Modules**: ES Modules with `"type": "module"`

## Key Directories
- `/client`: Frontend React application
- `/server`: Backend API services
- `/shared`: Shared types and utilities between frontend and backend

## Authentication
- JWT-based authentication
- Token validation includes tenant/organization context
- All API routes are protected by default

## External Integrations
- **Google APIs**: For maps and places
- **Duffel**: Flight booking and management
- **OpenMap**: Geospatial data and mapping

## Type Safety
- Use shared types from `/shared/types` where possible
- All API responses should be properly typed
- Runtime validation using Zod schemas

## Best Practices
1. Always validate external API responses
2. Follow the principle of least privilege for API access
3. Keep business logic in services, not in controllers
4. Write unit tests for new features
5. Document complex business logic with JSDoc

## Common Patterns
- API responses follow the format: `{ data: T, error: string | null }`
- Error handling uses custom error classes in `/shared/errors`
- Database access goes through repository pattern

## Things to Avoid
- Direct database access from controllers
- Any type assertions (`as any`)
- Implicit `any` types
- Frontend logic in backend code and vice versa

## Testing
- Unit tests: `*.test.ts` alongside source files
- Integration tests: `/server/tests`
- E2E tests: `/client/cypress`

## Getting Started
1. Set up environment variables (see `.env.example`)
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`
