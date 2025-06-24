# Shared Type Definitions

This directory contains the single source of truth for all TypeScript types used across the NestMap application. These types are shared between the client and server to ensure type safety and consistency.

## Structure

- `index.d.ts` - Main type definitions (single source of truth)
- `auth/` - Authentication and authorization types
  - `auth.ts` - Core authentication types and utilities
  - `jwt.ts` - JWT token types and interfaces
  - `permissions.ts` - User roles and permissions
  - `user.ts` - User-related types and interfaces
  - `index.ts` - Public API exports

## Type System Architecture

### Key Principles
1. **Single Source of Truth**: All types are defined in `index.d.ts`
2. **Naming Conventions**:
   - Server: `snake_case` for database and API responses
   - Client: `camelCase` for JavaScript/TypeScript code
3. **Immutability**: Types are immutable by default
4. **Strict Null Checking**: All fields are required unless explicitly marked as optional

## Usage

### Importing Types

```typescript
// Import from the main types file
import { SharedTypes } from '@shared/types';

type User = SharedTypes.User;
type Organization = SharedTypes.Organization;

// Or import specific types
declare const user: SharedTypes.User;
```

### Type Conversion Utilities

Use the schema utilities to convert between server (snake_case) and client (camelCase) formats:

```typescript
import { toCamelCase, toSnakeCase, TypeGuards } from '@shared/utils/schema-utils';

// Convert server response to client format
const serverData = { user_id: 1, first_name: 'John' };
const clientData = toCamelCase(serverData);
// { userId: 1, firstName: 'John' }

// Convert client data to server format
const clientUpdate = { firstName: 'John', lastName: 'Doe' };
const serverUpdate = toSnakeCase(clientUpdate);
// { first_name: 'John', last_name: 'Doe' }

// Runtime type checking
if (TypeGuards.isUser(someData)) {
  // TypeScript knows someData is a User
  console.log(someData.email);
}
```

### Type Safety

All types are strictly validated at compile time. The `TypeGuards` utility provides runtime type checking:

```typescript
import { TypeGuards } from '@shared/utils/schema-utils';

function processUser(user: unknown) {
  if (!TypeGuards.isUser(user)) {
    throw new Error('Invalid user data');
  }
  
  // TypeScript knows user is a valid User object
  console.log(user.email);
}
```

## Best Practices

1. **Always use shared types** for any data crossing the client-server boundary
2. **Use TypeGuards** for runtime validation of external data
3. **Keep types in sync** - update `index.d.ts` when making schema changes
4. **Run type validation** in your CI/CD pipeline to catch mismatches early
5. **Document complex types** with JSDoc comments

## Example: User Management

```typescript
// Creating a new user
const newUser: SharedTypes.User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  role: 'member',
};

// Updating a user
const updates: UpdateUserDto = {
  first_name: 'Johnny',
  is_active: true,
};
```

#### Permissions

```typescript
import { UserRole, PERMISSIONS, hasPermission } from '@shared/types/auth/permissions';

// Check if a role has a specific permission
const canEditUsers = hasPermission('admin', 'user:update'); // true

// Get all permissions for a role
const adminPermissions = Object.values(PERMISSIONS)
  .filter(p => p.defaultRoles.includes('admin'))
  .map(p => p.key);
```

## Best Practices

1. **Type Safety**: Always use the provided types instead of raw objects or strings
2. **Permissions**: Use the `PERMISSIONS` constant and `hasPermission` utility for access control
3. **Error Handling**: Use the `AuthError` class for consistent error handling
4. **Immutability**: All types are read-only by default to prevent accidental mutations

## Versioning

This package follows [Semantic Versioning](https://semver.org/).

## License

Proprietary - NestMap Internal Use Only
