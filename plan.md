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
