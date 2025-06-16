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

### Frontend audit notes
- Adjusted `client/tsconfig.json` to include root `node_modules` for TypeScript checks.
- Marked `SuperadminFixed.tsx` and `SuperadminSimple.tsx` as `// UNUSED` for potential deletion.
- Fixed some minor type issues in `Dashboard` and `FlightSearch`.
