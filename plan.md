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
- **Placeholder Route Modules:** Initial placeholders for collaboration and white‑label routes were removed. The router now mounts `customDomains.ts` directly, and unused stubs were deleted.
- **TypeScript & Lint Error Fixes in `server/routes/index.ts`:**
  - Corrected usage of Express `app` vs. `router` instances for route registration functions (e.g., `registerBookingRoutes`, `registerCorporateCardRoutes` moved to be called with `app`).
  - Ensured all code paths in route handlers explicitly return a value (e.g., adding `return;` after `res.json()` or `res.status().send()`), particularly in `try...catch` blocks, to satisfy TypeScript's strict checks.
  - Implemented safe parsing of string-based user identifiers (e.g., `req.user.id`, `req.user.organizationId`) to numbers before passing them to service functions, including handling potential `NaN` results with appropriate error responses.

## Frontend Audit

- [ ] Remove unused legacy superadmin pages.
- [ ] Resolve remaining TypeScript errors in client.
- [ ] Audit accessibility of all forms (labels, aria).
- [ ] Deduplicate Tailwind styles in `index.css`.

## 🚀 Feature Enhancement Roadmap

The following initiatives build on the existing platform to deliver smarter planning and better integrations.

### Broaden AI Capabilities
- [ ] Build ML models for price forecasting and budget optimization using booking history.
- [ ] Add real-time disruption monitoring to reroute trips when flights or destinations are impacted.
- [ ] Support group-travel planning by merging traveler preferences into a consensus itinerary.

### Expand Integrations
- [ ] Integrate additional booking providers and GDS systems for broader inventory.
- [ ] Offer carbon offset purchasing and loyalty program support for enterprise clients.

### Machine Learning & Data Insights
- [ ] Train personalized recommendation models and spend forecasting from trip data.
- [ ] Provide an analytics dashboard with AI-driven insights for organizations.

### Performance & Architecture
- [ ] Implement caching and optimize database indexes.
- [ ] Introduce a service layer with optional dependency injection for cleaner APIs.

### Mobile & Collaboration
- [ ] Enable offline mode and push notifications in the mobile apps.
- [ ] Add real-time itinerary editing and in-app messaging for teams.
