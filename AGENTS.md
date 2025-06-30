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
- Use shared types from `@shared/types` where possible
- All API responses should be properly typed
- Runtime validation using Zod schemas
- Avoid `any` type - use proper types or `unknown` with type guards
- Prefer interfaces over type aliases for public API contracts

## Best Practices
1. Always validate external API responses
2. Follow the principle of least privilege for API access
3. Keep business logic in services, not in controllers
4. Write unit tests for new features
5. Document complex business logic with JSDoc

## TypeScript Configuration

### Project Structure
```
project-root/
├── client/               # Frontend application
│   └── src/
│       └── types/       # Client-specific types (minimal)
├── server/               # Backend application
│   └── src/
│       └── types/       # Server-specific types (minimal)
└── shared/               # Shared code between client and server
    └── src/
        └── types/       # Shared type definitions
```

### Import/Export Patterns

#### Shared Types
```typescript
// Good - Using path aliases
import { User } from '@shared/types/auth/user';

// Avoid - Relative paths
import { User } from '../../../shared/src/types/auth/user';
```

#### Type Organization
- Keep shared types in `shared/src/types`
- Group related types in feature-based directories
- Use barrel files (`index.ts`) for clean imports
- Export types at the highest appropriate level

#### Configuration Files
- Base config: `tsconfig.base.json` (shared settings)
- Client config: `client/tsconfig.json` (React-specific settings)
- Server config: `server/tsconfig.json` (Node.js-specific settings)
- Shared config: `shared/tsconfig.json` (shared library settings)

## Common Patterns
- API responses follow the format: `{ data: T, error: string | null }`
- Error handling uses custom error classes in `@shared/errors`
- Database access goes through repository pattern
- Use project references for better build performance

## Things to Avoid
- Direct database access from controllers
- Any type assertions (`as any`)
- Implicit `any` types - enable `noImplicitAny`
- Frontend logic in backend code and vice versa
- Duplicate type definitions - always import from `@shared` when possible
- Using `// @ts-ignore` without explanation
- Non-null assertions (`!`) - handle null cases properly

## Testing
- Unit tests: `*.test.ts` alongside source files
- Integration tests: `/server/tests`
- E2E tests: `/client/cypress`
- Type tests: Use `expectType` from `tsd` for complex type assertions
- Mock external dependencies using `jest.mock()` or similar
- Test type boundaries and edge cases

## TypeScript Development Workflow

### Common Tasks

#### Adding a New Shared Type
1. Create the type in `shared/src/types/{feature}/`
2. Export it from the feature's `index.ts`
3. Import using `@shared/types/{feature}`

#### Debugging Type Issues
1. Check for type conflicts between packages
2. Ensure all dependencies are using the same TypeScript version
3. Use `tsc --noEmit` to check types without building

#### Performance Optimization
- Use `incremental: true` for faster builds
- Enable `skipLibCheck: true` (with caution)
- Use project references for better build times

## Getting Started
1. Set up environment variables (see `.env.example`)
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`
4. Run type checking: `pnpm type-check`
