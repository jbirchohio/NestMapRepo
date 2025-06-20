# Server TypeScript Error Resolution Plan

This document describes the recommended workflow for cleaning up TypeScript errors located in `server/` and its subdirectories. The backend currently fails to compile with over 600 errors (mostly TS2339, TS2345 and TS7006). Use the steps below to gradually enforce type safety.

## Objectives
1. Achieve a clean `npx tsc -p server/tsconfig.json --noEmit` run.
2. Strengthen type definitions for Express, database models and shared modules.
3. Keep incremental commits small and testable.

## Baseline Setup
1. Install dependencies with `pnpm install` or `npm install`.
2. Generate an error report:
   ```bash
   npx tsc -p server/tsconfig.json --noEmit > errors.txt
   ```
   Use this file to track progress as fixes are applied.

## Project-wide Improvements
1. Enable `"strict": true` and `"noImplicitAny": true` in `server/tsconfig.json`.
2. Add global Express type augmentations under `server/src/@types/express.d.ts`.
   Extend `Request` with properties used across middleware (e.g., `user`, `organization`, `roles`).

## Directory Fix Sequence
1. `server/middleware/`
   - Contains the highest error counts (`jwtAuth.ts`, `organizationContext.ts`, etc.).
   - Update function signatures and request typings.
2. `server/auth/`
   - Ensure services and controllers use typed interfaces for `User`, tokens and sessions.
3. `server/src/common/`
   - Fix repository and utility types.
4. `server/routes/` and `server/controllers/`
   - Align route handlers with the updated typings.
5. Remaining root files (`loadBalancer.ts`, `budgetForecast.ts`, etc.).

## Typical Error Patterns
- **TS2339**: Missing property on type.
  - Add fields to the corresponding interface or perform runtime checks.
- **TS2345**: Argument type mismatch.
  - Correct generics or use explicit casting when unavoidable.
- **TS7006**: Parameter implicitly has `any` type.
  - Add explicit parameter and return types.

## Workflow
1. Pick a subdirectory and fix a small batch of files.
2. Run `npx tsc -p server/tsconfig.json --noEmit` to confirm the error count decreases.
3. Execute existing tests with `npm test` from the `server` directory.
4. Commit with messages describing the fixes, e.g.
   `fix(server/middleware): add typings for jwtAuth middleware`.
5. Update `errors.txt` with the new count.

Repeat until all files compile without TypeScript errors.
