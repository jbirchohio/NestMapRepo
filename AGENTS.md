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

## TypeScript Architecture

### Project Structure

```
project-root/
├── client/               # Frontend application
│   └── src/
│       ├── types/       # Client-specific types (minimal)
│       └── ...
├── server/               # Backend application
│   └── src/
│       └── types/       # Server-specific types (minimal)
└── shared/               # Shared code between client and server
    └── src/
        ├── types/       # Shared type definitions
        │   ├── activity/  # Activity-related types
        │   ├── ai/        # AI-related types
        │   ├── api/       # API contract types
        │   ├── approval/  # Approval workflow types
        │   ├── auth/      # Authentication types
        │   ├── billing/   # Billing-related types
        │   ├── booking/   # Booking-related types
        │   ├── collaboration/ # Collaboration types
        │   ├── forms/     # Form-related types
        │   ├── job/       # Job-related types
        │   ├── map/       # Map-related types
        │   ├── notification/ # Notification types
        │   ├── trip/      # Trip-related types
        │   └── user/      # User-related types
        └── api/         # Shared API client code
```

### Configuration Files

#### Base Configuration (`tsconfig.base.json`)
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Source maps and declaration files
- Composite build support

#### Client Configuration (`client/tsconfig.json`)
- Extends base config
- Module: ESNext
- JSX support for React
- Path aliases for `@client/*` and `@shared/*`
- References shared package

#### Server Configuration (`server/tsconfig.json`)
- Extends base config
- Node.js environment
- Path aliases for server-specific imports
- Database type definitions
- References shared package

#### Shared Configuration (`shared/tsconfig.json`)
- Composite build enabled
- Strict type checking
- Path aliases for shared code
- Separate compilation for shared modules

### Import/Export Patterns

#### Shared Package Imports
```typescript
// Types
import { User } from '@shared/schema/types/user';
import type { ApiResponse } from '@shared/schema/api';

// Auth
import { authService } from '@shared/schema/auth';

// Utils
import { formatDate } from '@shared/schema/utils/date';
```

#### Client-Side Imports
```typescript
// Components
import { Button } from '@/components/ui/button';
import { UserProfile } from '@client/features/user';

// Hooks
import { useAuth } from '@/hooks/useAuth';
```

#### Server-Side Imports
```typescript
// Controllers
import { UserController } from '@server/controllers/user';

// Database
import { db } from '@db';
```

### Type Organization
- **Shared Types**: In `shared/src/types` organized by feature
- **Barrel Files**: Use `index.ts` for clean exports
- **Type Safety**:
  - Use `import type` for type-only imports
  - Avoid `any` - prefer proper types or `unknown` with type guards
  - Use interfaces for public API contracts
  - Prefer union types over enums for better tree-shaking

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
