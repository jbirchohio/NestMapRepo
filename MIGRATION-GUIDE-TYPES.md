# Type Migration Guide

This document outlines the migration of types from `server/types` to `shared/src/types` for better code organization and maintainability.

## Migration Steps

1. **Types Moved to Shared**
   - `user.ts` → `@shared/src/types/user`
   - `jwt.d.ts` → `@shared/src/types/auth/jwt.ts`
   - `custom-request.d.ts` → `@shared/src/types/auth/custom-request.ts`
   - `activity.ts` → `@shared/src/types/activity/ActivityTypes.ts`
   - `invoice.ts` → `@shared/src/types/billing/invoice.ts`
   - `error.types.ts` → `@shared/src/types/error.ts`

2. **Updating Imports**
   - Update imports in server code to use the new paths.
   - Example:
     ```typescript
     // Old
     import { User } from '../types/user';
     
     // New
     import type { User } from '@shared/src/types/user';
     ```

3. **Type Augmentations**
   - Express type augmentations are now in `@shared/src/types/express`.
   - Custom request types are in `@shared/src/types/express/custom-request.d.ts`.

4. **Testing**
   - Verify that all type checks pass.
   - Ensure no runtime errors related to type changes.

## Verification

After migration, run:

```bash
npm run typecheck
npm test
```

## Rollback

If issues arise, revert to the previous commit before the migration:

```bash
git checkout <commit-hash> -- server/
```
