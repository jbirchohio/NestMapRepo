# Type System Architecture

This document outlines the type system architecture for the NestMap application, focusing on the relationships between shared, client, and server types.

## Directory Structure

```
shared/
├── src/
│   ├── api/               # Shared API client code
│   ├── constants/         # Shared constants
│   ├── types/             # Shared type definitions
│   │   ├── activity/      # Activity-related types
│   │   ├── ai/            # AI-related types
│   │   ├── api/           # API contract types
│   │   ├── auth/          # Authentication types
│   │   ├── billing/       # Billing-related types
│   │   ├── booking/       # Booking-related types
│   │   ├── collaboration/ # Collaboration types
│   │   ├── error.ts       # Error handling types
│   │   ├── express/       # Express type extensions
│   │   ├── forms/         # Form-related types
│   │   ├── job/           # Job-related types
│   │   ├── map/           # Map-related types
│   │   ├── notification/  # Notification types
│   │   ├── third-party/   # Third-party type definitions
│   │   ├── trip/          # Trip-related types
│   │   └── user/          # User-related types
│   └── schema.ts          # Core schema definitions
```

## Type Sharing Strategy

### 1. Shared Types (`@shared/schema/types`)
- **Location**: `shared/src/types/**/*.ts`
- **Purpose**: Types used across both client and server
- **Key Files**:
  - `auth/` - Authentication and authorization types
  - `api/` - API request/response contracts
  - `trip/` - Trip-related types
  - `collaboration/` - Real-time collaboration types

### 2. Server-Side Types
- **Location**: `server/src/**/*.types.ts`
- **Path Alias**: `@server/*`
- **Purpose**: Types specific to server implementation
- **Key Areas**:
  - Database models
  - Server configuration
  - Internal server types not exposed to client

### 3. Client-Side Types
- **Location**: `client/src/types/**/*.ts`
- **Path Alias**: `@client/*` or `@/*`
- **Purpose**: Types specific to client implementation
- **Key Areas**:
  - Component props
  - Client state management
  - UI-specific types

## Type Import Patterns

### From Client/Server to Shared
```typescript
// Good - Using path aliases
import { User } from '@shared/schema/types/auth/user';
import { Trip } from '@shared/schema/types/trip';

// Avoid - Relative paths
import { User } from '../../../shared/src/types/auth/user';
```

### Type Extensions
When extending shared types:

```typescript
// server/src/types/user.extensions.ts
import { User } from '@shared/schema/types/auth/user';

declare module '@shared/schema/types/auth/user' {
  interface User {
    // Server-specific extensions
    lastLoginAt: Date;
    passwordHash: string;
  }
}
```

## Type Safety Guidelines

1. **No `any` Types**
   - Always use proper type definitions
   - Use `unknown` instead of `any` when type is dynamic

2. **Consistent Naming**
   - Interfaces: `PascalCase` (e.g., `UserProfile`)
   - Type aliases: `PascalCase` with `Type` suffix (e.g., `UserPreferencesType`)
   - Enums: `PascalCase` (e.g., `UserRole`)

3. **Documentation**
   - Use JSDoc for complex types
   - Document type relationships and constraints

## Example: Authentication Flow Types

```typescript
// shared/src/types/auth/index.ts
export * from './user';
export * from './jwt';
export * from './dto';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

## Versioning and Breaking Changes

1. **Versioning**
   - Shared types follow semantic versioning
   - Major version bumps for breaking changes

2. **Deprecation**
   - Mark deprecated types with `@deprecated`
   - Provide migration path in JSDoc

## Testing Types

1. **Type Tests**
   - Use `dtslint` for type assertions
   - Test complex type utilities

2. **Integration**
   - Verify type compatibility between client and server
  - Test type guards and assertions

## Best Practices

1. **Immutability**
   - Use `Readonly` and `ReadonlyArray` for immutable data
   - Mark properties as `readonly` when appropriate

2. **Discriminated Unions**
   - Use for type-safe state management
   - Prefer over optional properties for mutually exclusive states

3. **Type Guards**
   - Implement custom type guards for runtime type checking
   - Use `type-predicates` for complex validations

## Common Patterns

### API Response Type
```typescript
export type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### Pagination
```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Troubleshooting

### Common Issues

1. **Circular Dependencies**
   - Use `import type` for type-only imports
   - Move shared types to a common file if needed

2. **Type Mismatches**
   - Verify `tsconfig.json` paths
   - Ensure consistent TypeScript versions

3. **Missing Type Declarations**
   - Check if `@types` package is installed
   - Create custom declarations in `types/third-party/`

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
