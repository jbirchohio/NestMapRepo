# NestMap Audit Plan

## ✅ Verified Working
- [ ] AI Itinerary generation (budget, preferences, dates)
- [ ] Proposal Center (PDF generation, branded templates, cost analysis)
- [ ] Stripe billing (Team and Enterprise plans)
- [ ] Multi-tenant orgs + role management (admin/member/viewer)
- [ ] Proposal-to-invoice flow (quote, approve, Stripe invoice)
- [ ] Export tools (PDF, CSV, Google Calendar sync)
- [ ] White-labeling support (custom domains, branding per org)
- [ ] Superadmin portal (org/user access, system settings)
- [ ] Mobile UI handling (Capacitor layout and interactions)

## 🔧 Fixes Applied
<!-- Add fixes as they're implemented -->
- Removed unused CalendarDays import in `FlightSearch`.
- Fixed role check in `Dashboard` to use `user.role`.
- Marked legacy `SuperadminFixed` and `SuperadminSimple` pages as unused.
- Added root node type path in `client/tsconfig.json` for tsc.
- Fixed auth logger to use `payload.email` and marked unused rate limiter in `jwtAuth`.
- Flagged raw SQL queries in `superadmin` routes for parameterization.

## 🔮 Suggested Enhancements
- [ ] Add sample orgs and proposals for demo [optional]
- [ ] Implement proposal analytics (opens/views) [optional]

## 🚀 B2B Feature Integration Plan

The following pages were identified as unused but represent important B2B functionality:

- `Analytics.tsx` – business intelligence dashboard for organizations
- `Approvals.tsx` – manage travel approvals and corporate policies
- `InvoiceCenter.tsx` – central location for proposal invoicing

### Tasks
1. **Route Integration** – expose the above pages at `/analytics`, `/approvals`, and `/invoice-center` in `client/src/config/routes.ts`.
2. **Navigation Links** – add corresponding navigation items in `MainNavigation` so corporate users can access them.
3. **Superadmin Cleanup** – keep `SuperadminClean.tsx` as the active superadmin portal and do not reintroduce outdated versions.
4. **Testing** – verify the new routes render properly and navigation works when logged in.

## 🧠 See notes.md for full technical notes

## Backend Stability & Import Resolution
- **Comprehensive Import Resolution:** Systematically scanned and resolved backend import errors across `server/` and `shared/` directories.
- **ESM Compatibility:** Ensured all local import paths include the `.js` extension, a requirement for projects with `"type": "module"` in `package.json`.
- **Missing Schema Definitions:** Added missing Zod schemas for `cardTransactions` in `server/db/schema.ts` and updated `shared/schema.ts` to correctly re-export, resolving related type errors.
- **Middleware Implementation:** Created and integrated a new `validation.middleware.ts` in `server/src/auth/middleware/` using Zod to handle request validation, resolving a critical missing import for authentication routes.
- **Placeholder Route Modules:** Implemented minimal placeholder route modules for `collaborationRoutes.ts`, `customDomainsRoutes.ts`, and `whiteLabelRoutes.ts`. This allowed `server/routes/index.ts` to successfully import and mount all defined routes, enabling the server to start without crashing due to missing modules, as per user request.
- **TypeScript & Lint Error Fixes in `server/routes/index.ts`:**
  - Corrected usage of Express `app` vs. `router` instances for route registration functions (e.g., `registerBookingRoutes`, `registerCorporateCardRoutes` moved to be called with `app`).
  - Ensured all code paths in route handlers explicitly return a value (e.g., adding `return;` after `res.json()` or `res.status().send()`), particularly in `try...catch` blocks, to satisfy TypeScript's strict checks.
  - Implemented safe parsing of string-based user identifiers (e.g., `req.user.id`, `req.user.organizationId`) to numbers before passing them to service functions, including handling potential `NaN` results with appropriate error responses.

## Frontend Audit

- [ ] Remove unused legacy superadmin pages.
- [ ] Resolve remaining TypeScript errors in client.
- [ ] Audit accessibility of all forms (labels, aria).
- [ ] Deduplicate Tailwind styles in `index.css`.
