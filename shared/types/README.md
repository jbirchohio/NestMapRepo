# Shared Types

This package contains shared TypeScript types and interfaces used across the NestMap application.

## Structure

- `auth/` - Authentication and authorization types
  - `auth.ts` - Core authentication types and utilities
  - `jwt.ts` - JWT token types and interfaces
  - `permissions.ts` - User roles and permissions
  - `user.ts` - User-related types and interfaces
  - `index.ts` - Public API exports

## Usage

### Installation

This package is included in the monorepo and can be imported directly:

```typescript
import { User, UserRole, PERMISSIONS } from '@shared/types/auth';
```

### Key Types

#### Authentication

```typescript
import { AuthState, AuthContextType, AuthError } from '@shared/types/auth';

// Example of using auth context
const { user, isAuthenticated, hasPermission } = useAuth();

if (isAuthenticated() && hasPermission('user:read')) {
  // Access restricted content
}
```

#### User Management

```typescript
import { User, CreateUserDto, UpdateUserDto } from '@shared/types/auth/user';

// Creating a new user
const newUser: CreateUserDto = {
  email: 'user@example.com',
  password: 'securePassword123!',
  first_name: 'John',
  last_name: 'Doe',
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
