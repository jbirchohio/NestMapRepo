# NestMap Audit Technical Notes

## Overview
This document contains technical notes, reasoning behind fixes, edge case handling, and observations during the NestMap audit process.

## Architecture Notes
- Stack: React (Vite, Tailwind) frontend, Express (TypeScript) backend
- Database: Supabase (PostgreSQL) with Drizzle ORM
- Naming conventions: camelCase on frontend, snake_case in DB (transformed via middleware)
- Mobile Support: Capacitor implementation

## Global Codebase Cleanup
### Dead Code Findings
1. **Dead Routes**
   - `server/routes/analytics-broken.ts` - Not referenced anywhere in the codebase
   - `server/routes/bookings-broken.ts` - Not referenced anywhere in the codebase
   - Commit message: `chore: remove dead route files with -broken suffix`

2. **Unused Functions**
   - `prepareV2Routes` in `server/routes/v1/index.ts` - Exported but not used
   - `setupLegacyRedirects` in `server/routes/v1/index.ts` - Exported but not used
   - Commit message: `refactor: remove unused API route functions`

3. **Duplicate Test Files**
   - `tests/test-ai-location.js` and `tests/test-ai-location.mjs` - Functionally identical
   - Keeping the `.mjs` version to standardize on ESM modules
   - Commit message: `test: remove duplicate AI location test file`

4. **Backup Files**
   - `server/bookingProviders_backup.bak` - Outdated backup of `server/bookingProviders.ts`
   - Commit message: `chore: remove outdated backup files`

### Cleanup Approach
- Only removing files/functions when 100% certain they're unused
- Marking uncertain cases for manual review
- Prioritizing type safety and consistent naming conventions
- Refactoring duplicated logic into shared modules

## Feature Verification Notes

### AI Itinerary Generation
<!-- Notes will be added as verification progresses -->

### Proposal Center
<!-- Notes will be added as verification progresses -->

### Stripe Billing
<!-- Notes will be added as verification progresses -->

### Multi-tenant Organizations and Role Management
<!-- Notes will be added as verification progresses -->

### Proposal-to-Invoice Flow
<!-- Notes will be added as verification progresses -->

### Export Tools
<!-- Notes will be added as verification progresses -->

### White-labeling Support
<!-- Notes will be added as verification progresses -->

### Superadmin Portal
<!-- Notes will be added as verification progresses -->

### Mobile UI Handling
<!-- Notes will be added as verification progresses -->

## Edge Cases & Limitations
<!-- To be populated during audit -->

## Questions & Uncertainties
<!-- To be populated during audit -->

## TODOs for Follow-up
<!-- To be populated during audit -->

## Backend Stability & Import Resolution Notes
- **ESM Runtime Requirement (.js extensions):** Due to `"type": "module"` in the project's `package.json`, the Node.js runtime strictly requires full file paths, including the `.js` extension, for local module imports. All backend import statements for local TypeScript files (compiled to JavaScript) were updated accordingly (e.g., `import ... from './module'` became `import ... from './module.js'`).
- **Validation Middleware (`validation.middleware.ts`):** A new middleware was created at `server/src/auth/middleware/validation.middleware.ts`. It provides a `validateRequest` function that uses Zod schemas to validate incoming request bodies, params, or query strings. This was introduced to resolve a missing import in `server/routes/auth.ts` and provides a reusable pattern for request validation.
- **Placeholder Route Modules:** Temporary placeholders (`collaborationRoutes.ts`, `customDomainsRoutes.ts`, `whiteLabelRoutes.ts`) were originally added so `server/routes/index.ts` could mount routes without crashing. These stubs have now been removed. `customDomains.ts` provides the real implementation, while collaboration and white‑label routes were dropped from the router until properly implemented.
- **Route Registration (`registerDirectRoutes`):** Certain route registration functions (e.g., `registerBookingRoutes`, `registerCorporateCardRoutes`) were identified as needing the main Express `app` instance rather than a sub-`router` instance. These calls were moved into the `registerDirectRoutes` function in `server/routes/index.ts`, which is designed to be called with `app` from the main server setup file (`server/index.ts`).
- **Type Safety in Route Handlers (`server/routes/index.ts`):
  - **ID Parsing:** User-provided identifiers like `req.user.id` and `req.user.organizationId`, if sourced from request objects as strings, must be explicitly parsed to `number` (e.g., using `parseInt(id, 10)`) before being used with service functions or database queries that expect numeric types. Added checks for `isNaN` after parsing to return a `400 Bad Request` if a non-null ID is not a valid number.
  - **Explicit Returns:** TypeScript's `compilerOptions.noImplicitReturns` (or similar strict checks) requires that all code paths in a function that declares a return type (or is inferred to have one by usage like `async (req, res) => {...}`) must return a value. For Express route handlers, this means ensuring that after any response is sent (e.g., `res.json(...)`, `res.status(...).send(...)`), an explicit `return;` statement is used, especially within `try...catch` blocks or conditional logic, to prevent the "Not all code paths return a value" lint error.
- **User Object Properties:** Assumed that properties on the `req.user` object (populated by authentication middleware) use camelCase (e.g., `req.user.organizationId`). Code was adjusted to use camelCase consistently when accessing these properties.

### Frontend audit notes
- Adjusted `client/tsconfig.json` to include root `node_modules` for TypeScript checks.
- Marked `SuperadminFixed.tsx` and `SuperadminSimple.tsx` as `// UNUSED` for potential deletion.
- Fixed some minor type issues in `Dashboard` and `FlightSearch`.
- Updated JWT middleware logging and flagged raw SQL queries for review.

## Import Fixes Notes
- Replaced the unused `@mui/material` components in `AsyncComponent.tsx` with simple UI elements and existing button/spinner components.
- Created `dnd-stub.tsx` to stub drag-and-drop functionality used by `CustomSectionBuilder` since `@hello-pangea/dnd` was not installed.
- Added a lightweight `time-picker.tsx` using a native `<input type="time">`.
- Added placeholder `ClientInfoStep.tsx` to satisfy the booking workflow.
- Introduced `apiClientV2.ts` as an alias to the existing API client for code that expected this module.
- Updated `SecureStorage` to use `window.localStorage` instead of the missing `secure-web-storage` package.
- Extended `client/tsconfig.json` paths to resolve `@shared/*` imports from the client.
