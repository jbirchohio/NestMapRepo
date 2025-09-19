# Sale Readiness Summary

This repository contains a full‑stack consumer travel planning app with a template marketplace, payments, maps, and AI assistance. The goal is a quick sale (>= $15k) within 2 weeks. This document summarizes current readiness, gaps, and the packaging plan for buyers.

## Status Snapshot
- Product: React + TypeScript SPA, Node/Express API, PostgreSQL (Drizzle ORM)
- Key integrations: Stripe, Mapbox, OpenAI, (optional) SendGrid, Viator, Duffel
- Deploy targets: Railway (server), Vercel/Static hosting (client) supported via configs
- Docs present: README, technical docs, deployment guides, env template, Stripe guides
- Tests: Basic test scaffolding; not wired to npm scripts; no coverage gate

## Critical Fixes For Sale
- Branding standardized to “Remvana” across code and assets.
- Debug/log artifacts: Remove committed logs (server.log removed) and avoid verbose runtime logs in production. Expand .gitignore for logs (done).
- Test scripts: Either add minimal `npm test` that validates configuration or update tests/README to match current reality. For a quick sale, document “manual verification” and include a short smoke test script.
- Live deployment: App is live on Railway; include live URL in listing. Use Stripe test mode for buyer validation.

## Risk Items Buyers Will Ask About
- Automated tests and CI: Limited. Provide a clear roadmap and note existing `tests/` folder.
- Security posture: JWT middleware is in place; CSP allows `'unsafe-inline'`/`'unsafe-eval'`. Document rationale and safer production settings.
- Data model stability: Migrations exist; verify fresh install path (migrate/seed) works.
- Third‑party keys: All integrations use env vars; `.env.example` provided.

## Quick Packaging Plan (7–10 hours)
1) Brand decision + sweep (name, README, LICENSE, icons, schema comments)
2) Demo deploy (Railway) + seed script + test Stripe in test mode
3) Screenshots + 2–3 min demo video (script provided below)
4) One‑pager + listing draft for Acquire.com
5) Buyer handover docs: install/runbook, env map, costs, transfer checklist

## Demo Video Script (2–3 minutes)
- 0:00 – 0:20: Overview (trip planning + template marketplace)
- 0:20 – 1:10: Create a trip, add activities, map view
- 1:10 – 1:40: Browse/purchase a template (Stripe test card 4242…)
- 1:40 – 2:00: AI suggestions + itinerary optimization
- 2:00 – 2:20: Admin/creator flow highlights and seeded data

## Listing Highlights (for Acquire.com)
- Stack: React/Vite + Node/Express + Postgres + Stripe + Mapbox + OpenAI
- Features: Itinerary builder, collaborative planning, template marketplace, checkout, maps, AI assistant
- Deploy anywhere: Railway/Docker + static hosting; env‑driven config
- Transfer ready: MIT license, no vendor lock‑in, docs included

## Next Actions Checklist
- Add live Railway URL to `ACQUIRE_LISTING_DRAFT.md`
- Ensure env on Railway matches `.env.example`; run `npm run seed` (or `seed:all`) if needed
- Capture 6–8 screenshots (home, planner, map, marketplace, checkout, admin)
- Publish listing; include repo access under NDA if requested

## Hand‑Off Docs
- SEE: `README.md`, `TECHNICAL_DOCUMENTATION.md`, `DEPLOYMENT.md`, `STRIPE_WEBHOOK_SETUP.md`, `PAYOUT_SETUP_GUIDE.md`
- Add: `TRANSFER_CHECKLIST.md` and `ACQUIRE_LISTING_DRAFT.md`
