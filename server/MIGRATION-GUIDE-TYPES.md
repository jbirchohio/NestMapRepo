# Type Definitions Migration Guide

This document outlines the changes made to the type definitions and provides guidance on updating your code to use the new types.

## Overview

We've consolidated all type definitions to use `@shared/types` as the single source of truth. Server-specific types now extend these shared types rather than redefining them.

## Key Changes

1. **Shared Types Moved**
   - All domain types are now in `shared/types`
   - Server-specific types extend these shared types
   - Removed duplicate type definitions

2. **Express Types**
   - Consolidated into `server/src/types/express-types.d.ts`
   - Extends Express types with our custom types
   - Added proper type safety for request/response objects

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
import { User } from '../types/user';
import { Organization } from '../../../shared/types/organization';
```

**After:**
```typescript
import type { User, Organization } from '@shared/types';
```

### 2. Update Request Handlers

**Before:**
```typescript
app.get('/api/users', (req: Request, res: Response) => {
  // ...
});
```

**After:**
```typescript
import type { AuthenticatedRequest } from '../types/express-types';

app.get('/api/users', (req: AuthenticatedRequest, res: Response) => {
  // req.user is now properly typed
  const userId = req.user.id;
  // ...
});
```

### 3. Update Custom Request Properties

**Before:**
```typescript
declare global {
  namespace Express {
    interface Request {
      customProperty: any;
    }
  }
}
```

**After:**
1. Add to `server/src/types/express-types.d.ts` if it's a common server property
2. Or use declaration merging in your module:

```typescript
declare module 'express-serve-static-core' {
  interface Request {
    customProperty: YourType;
  }
}
```

## Type Deprecations

The following types have been deprecated in favor of their `@shared/types` equivalents:

- `LocalUser` → Use `User` from `@shared/types`
- `AuthRequest` → Use `AuthenticatedRequest` from `./types/express-types`
- `ApiResponse` → Use `Response` from Express with our extensions

## Testing Your Changes

1. Run the type checker:
   ```bash
   npx tsc --noEmit
   ```

2. Test all API endpoints to ensure type safety

3. Check for any remaining `any` types that should be properly typed

## Rollback Plan

If you encounter issues, you can revert to the previous type definitions by:

1. Restoring the previous type definition files
2. Reverting the import changes
3. Rebuilding the project

## Help

For assistance with the migration, contact the development team or refer to the updated documentation.
