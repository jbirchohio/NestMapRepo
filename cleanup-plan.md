# NestMap Codebase Cleanup Plan

## Recent Updates

### Integration of Previously Unused Route Files

- **whiteLabelStatus.ts**: Integrated into the main application by registering routes in server/routes/index.ts. This provides a comprehensive API for checking white label configuration status, completion steps, and next actions.

### Domain Management Consolidation Plan

- **domains.ts** and **customDomains.ts** have overlapping functionality but different implementations:
  - `customDomains.ts` is currently active and mounted directly in server/index.ts
  - `domains.ts` has more comprehensive features but isn't registered anywhere
  - Plan: Consolidate unique features from both files into a single domain management module

## Identified Issues

### Dead Code
1. **Dead Routes/Endpoints**
   - `server/routes/analytics-broken.ts` - Not referenced anywhere in the codebase
   - `server/routes/bookings-broken.ts` - Not referenced anywhere in the codebase

2. **Unused Test Files**
   - `tests/test-ai-location.js` and `tests/test-ai-location.mjs` - Duplicate files with the same functionality

3. **Unused Functions**
   - `prepareV2Routes` in `server/routes/v1/index.ts` - Exported but not used anywhere
   - `setupLegacyRedirects` in `server/routes/v1/index.ts` - Exported but not used anywhere

4. **Duplicate Logic**
   - `server/bookingProviders_backup.bak` - Appears to be an outdated backup of `server/bookingProviders.ts`

## Cleanup Strategy

### Dead Routes and Endpoints
- Remove `server/routes/analytics-broken.ts` as it's not referenced anywhere and appears to be a broken version of the analytics routes
- Remove `server/routes/bookings-broken.ts` as it's not referenced anywhere and appears to be a broken version of the bookings routes

### Unused Test Files
- Keep `tests/test-ai-location.mjs` (ESM version) and remove `tests/test-ai-location.js` (CommonJS version) to standardize on ESM

### Unused Functions
- Remove unused functions like `prepareV2Routes` and `setupLegacyRedirects` from `server/routes/v1/index.ts`
- Conduct further analysis to identify more unused functions across the codebase

### Duplicate Logic
- Remove `server/bookingProviders_backup.bak` as it appears to be an outdated backup file

## Implementation Plan
1. Create backup branches before making any changes
2. Remove identified dead code and unused files
3. Refactor and consolidate duplicated logic
4. Run tests to ensure no regressions
5. Document all changes in `notes.md` with appropriate commit messages

## Files for Manual Review
- Any files where we're not 100% certain they are unused will be marked for manual review
- Additional analysis needed for potential unused components in the client directory

## Next Steps
- Continue analyzing the codebase for more patterns of unused code
- Check for TypeScript strict mode compatibility
- Identify more opportunities for code consolidation
